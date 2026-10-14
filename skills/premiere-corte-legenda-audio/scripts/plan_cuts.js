// Planeja o corte primário: mantém fala, remove respiros/pausas e zonas "ruins"
// (ajuste de câmera, entrar/sair de cena) informadas manualmente após ver as folhas de contato.
//
// Uso:
//   node plan_cuts.js --rms rms20.json --end 143.51 [--bad "0-15,20.6-36,136-999"]
//        [--threshold -35] [--pre 0.10] [--post 0.20] [--mincut 0.15] [--fps 29.97]
//        [--clip-start 0] [--clip-in 0] [--words words.json] [--out plan.json]
//
// Tempos de entrada (rms, --bad, --words) são do ARQUIVO DE ORIGEM. A saída traz:
//   keep / cuts  -> em tempo de origem
//   razorTimeline -> pontos de razor em tempo de TIMELINE (decrescente), já
//                    convertidos com: timeline = origem - clipIn + clipStart
//   cutsTimeline -> trechos a remover em tempo de timeline (para conferência)
//
// --words (opcional, transcrição da origem decodificada por transcript_words.js):
//   estende qualquer keep cujo limite caia no meio de uma palavra até o fim/início dela.
//   Isso evita o problema visto na prática: finais átonos ("ví-deo", "de-las") ficam
//   entre -37 e -45 dB, abaixo do limiar, e seriam cortados.
const fs = require('fs');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1]]); return a; }, []));

const db = JSON.parse(fs.readFileSync(args.rms, 'utf8'));
const END = +args.end;
const T = +(args.threshold ?? -35), PRE = +(args.pre ?? 0.10), POST = +(args.post ?? 0.20);
const MINCUT = +(args.mincut ?? 0.15);
const FPS = args.fps ? +args.fps : 30000 / 1001;
const CS = +(args['clip-start'] ?? 0), CI = +(args['clip-in'] ?? 0);
const bad = (args.bad || '').split(',').filter(Boolean).map(r => r.split('-').map(Number));

// 1) frames acima do limiar -> segmentos
let segs = [], s = null;
db.forEach((v, i) => {
  if (v > T) { if (s === null) s = i; }
  else if (s !== null) { segs.push([s * 0.02, i * 0.02]); s = null; }
});
if (s !== null) segs.push([s * 0.02, db.length * 0.02]);
// 2) junta fragmentos separados por < 0,2 s ANTES de filtrar duração (senão finais de frase
//    fragmentados somem) e descarta estalos isolados < 0,1 s
let merged = [];
for (const g of segs) {
  const p = merged[merged.length - 1];
  if (p && g[0] - p[1] < 0.2) p[1] = g[1]; else merged.push([...g]);
}
segs = merged.filter(g => g[1] - g[0] >= 0.1);
// 3) remove fala dentro de zonas ruins (ajuste de câmera etc.)
segs = segs.filter(g => !bad.some(b => g[0] >= b[0] && g[1] <= b[1]));
// 4) folgas e união de cortes pequenos demais para valer a pena
let keep = [];
for (const g of segs.map(g => [Math.max(0, g[0] - PRE), Math.min(END, g[1] + POST)])) {
  const p = keep[keep.length - 1];
  if (p && g[0] - p[1] < MINCUT) p[1] = Math.max(p[1], g[1]); else keep.push([...g]);
}
// 5) protege palavras da transcrição
if (args.words) {
  // Os tempos do ASR têm folga, então só estendemos enquanto ainda há energia de voz
  // (> TAIL dB) entre o limite atual e o fim/início da palavra; senão os respiros somem.
  const TAIL = +(args.tail ?? -46);
  const W = JSON.parse(fs.readFileSync(args.words, 'utf8'));
  const loud = t => (db[Math.round(t * 50)] ?? -99) > TAIL;
  for (const k of keep) {
    for (const w of W) {
      const a = w.st, b = Math.min(END, w.st + w.du);
      if (a < k[1] && b > k[1]) { let t = k[1]; while (t + 0.02 <= b && loud(t)) t += 0.02; k[1] = Math.min(END, Math.max(k[1], t + 0.04)); }
      if (a < k[0] && b > k[0]) { let t = k[0]; while (t - 0.02 >= a && loud(t - 0.02)) t -= 0.02; k[0] = Math.max(0, Math.min(k[0], t - 0.04)); }
    }
  }
  const m2 = [];
  for (const g of keep) { const p = m2[m2.length - 1]; if (p && g[0] - p[1] < MINCUT) p[1] = Math.max(p[1], g[1]); else m2.push(g); }
  keep = m2;
}
// 6) quantiza ao frame da sequência
const q = t => Math.round(t * FPS) / FPS;
keep = keep.map(([a, b]) => [q(a), q(b)]);
const cuts = []; let prev = 0;
for (const [a, b] of keep) { if (a > prev + 1e-6) cuts.push([prev, a]); prev = b; }
if (prev < END - 1e-6) cuts.push([prev, END]);

const toTL = t => +(t - CI + CS).toFixed(4);
const razor = [...new Set(cuts.flat().filter(t => t > 1e-6 && t < END - 1e-6).map(toTL))].sort((a, b) => b - a);
const plan = {
  params: { T, PRE, POST, MINCUT, FPS, bad, clipStart: CS, clipIn: CI },
  keep, cuts,
  cutsTimeline: cuts.map(([a, b]) => [toTL(a), toTL(b)]),
  razorTimeline: razor,
  keptSeconds: +keep.reduce((t, [a, b]) => t + b - a, 0).toFixed(2),
};
fs.writeFileSync(args.out || 'plan.json', JSON.stringify(plan, null, 1));
console.log(`keep ${keep.length} trechos | resultado ~${plan.keptSeconds}s | ${cuts.length} cortes | ${razor.length} razors`);
console.log('cortes (origem):', cuts.map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)} (${(b - a).toFixed(2)}s)`).join('  '));
