// Converte a transcrição da MÍDIA DE ORIGEM em legendas da timeline editada (SRT),
// no padrão do projeto: 1 linha, até --max caracteres, quebra em pontuação/trechos de frase,
// sem terminar linha em palavra funcional, legendas contíguas.
//
// Uso:
//   node build_srt.js --words words.json --clips clips.json --end 73.37 --out legendas.srt
//        [--max 32] [--fps 29.97] [--fix '{"captação":"captação,"}'] [--check]
//
// clips.json = [[start, end, inPoint], ...] dos clipes de FALA (faixa A1) em segundos de timeline,
//   obtido pelo snippet "listar clipes" de references/extendscript.md.
// --check: só relata palavras cortadas pelos limites dos clipes (rode antes de legendar!).
const fs = require('fs');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]); return a; }, []));

const W = JSON.parse(fs.readFileSync(args.words, 'utf8'));
const clips = JSON.parse(fs.readFileSync(args.clips, 'utf8'));
const END = +args.end, MAX = +(args.max || 32);
const FPS = args.fps ? +args.fps : 30000 / 1001;
const fix = args.fix ? JSON.parse(args.fix) : {};

if (args.check) {
  let n = 0;
  clips.forEach(([s, e, i], k) => {
    const o = i + (e - s);
    for (const w of W) {
      const a = w.st, b = w.st + w.du;
      if (a < i && b > i) { n++; console.log(`clipe ${k} IN  ${i.toFixed(2)}: corta início de "${w.s}" (${a.toFixed(2)}-${b.toFixed(2)}, perde ${(i - a).toFixed(2)}s)`); }
      if (a < o && b > o) { n++; console.log(`clipe ${k} OUT ${o.toFixed(2)}: corta fim de "${w.s}" (${a.toFixed(2)}-${b.toFixed(2)}, perde ${(b - o).toFixed(2)}s)`); }
    }
  });
  for (let k = 0; k + 1 < clips.length; k++) {
    const o = clips[k][2] + (clips[k][1] - clips[k][0]), nx = clips[k + 1][2];
    const d = W.filter(w => w.st >= o - 0.05 && w.st + w.du <= nx + 0.05);
    if (d.length) console.log(`entre clipes ${k}/${k + 1} (${o.toFixed(2)}-${nx.toFixed(2)}) fala removida: "${d.map(w => w.s).join(' ')}"`);
  }
  console.log(n ? `${n} limite(s) sobre palavras. Tempos de ASR têm folga de ~0,05-0,2s: confira o RMS no ponto antes de estender.` : 'nenhum limite corta palavra');
  process.exit(0);
}

// mapeia palavras (tempo de origem) -> timeline pelo ponto médio
let tw = [];
for (const w of W) {
  const mid = w.st + w.du / 2;
  for (const [s, e, i] of clips) {
    const se = i + (e - s);
    if (mid >= i && mid < se) {
      const a = Math.max(w.st, i), b = Math.min(w.st + w.du, se);
      tw.push({ s: fix[w.s] || w.s, t0: s + (a - i), t1: s + (b - i) }); break;
    }
  }
}
if (!tw.length) { console.error('nenhuma palavra caiu dentro dos clipes: confira clips.json e se a transcrição é da origem certa'); process.exit(1); }
tw[0].s = tw[0].s[0].toUpperCase() + tw[0].s.slice(1);

const ABBR = /^(Dra?|Sra?|Prof|Profa|Eng|Av|etc)\.$/;
const len = a => a.map(o => o.s).join(' ').length;
const sentEnd = w => /[.?!]$/.test(w.s) && !ABBR.test(w.s);
const comma = w => /[,;:]$/.test(w.s);
// orações: quebra em fim de frase e vírgula; vírgula curta (<12 car.) junta com a próxima se couber
let cl = [], cur = [];
for (const w of tw) { cur.push(w); if (sentEnd(w) || comma(w)) { cl.push(cur); cur = []; } }
if (cur.length) cl.push(cur);
const m = [];
for (const c of cl) {
  const p = m[m.length - 1];
  if (p && !sentEnd(p[p.length - 1]) && len(p) < 12 && len([...p, ...c]) <= MAX) m[m.length - 1] = [...p, ...c]; else m.push(c);
}
// orações longas: divisão equilibrada por programação dinâmica
const FN = new Set(['a', 'o', 'e', 'de', 'da', 'do', 'das', 'dos', 'que', 'em', 'na', 'no', 'nas', 'nos', 'um', 'uma', 'com', 'para', 'por', 'as', 'os', 'é', 'não', 'mas', 'se', 'ao', 'à', 'pra']);
function split(c) {
  if (len(c) <= MAX) return [c];
  const n = c.length, best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1); best[0] = 0;
  for (let j = 1; j <= n; j++) for (let i = 0; i < j; i++) {
    const seg = c.slice(i, j), L = len(seg); if (L > MAX) continue;
    let cost = best[i] + 1000 + (MAX - L) ** 2 / 4;
    const last = seg[seg.length - 1].s.toLowerCase().replace(/[,.;:!?]/g, '');
    if (j < n && FN.has(last)) cost += 400;          // não terminar linha em palavra funcional
    if (j < n && ABBR.test(seg[seg.length - 1].s)) cost += 2000; // não separar "Dra." do nome
    if (seg.length === 1 && j < n) cost += 300;      // evita palavra solta no meio da frase
    if (cost < best[j]) { best[j] = cost; prev[j] = i; }
  }
  const out = []; let j = n; while (j > 0) { out.unshift(c.slice(prev[j], j)); j = prev[j]; } return out;
}
const caps = []; for (const c of m) caps.push(...split(c));
const q = t => Math.round(t * FPS) / FPS;
const out = caps.map((c, k) => ({
  txt: c.map(o => o.s).join(' '),
  a: q(c[0].t0),
  b: q(k + 1 < caps.length ? caps[k + 1][0].t0 : Math.min(c[c.length - 1].t1 + 0.3, END)),
}));
const f = t => { const ms = Math.round(t * 1000); const h = Math.floor(ms / 3600000), mi = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60, r = ms % 1000; return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`; };
fs.writeFileSync(args.out, '﻿' + out.map((c, k) => `${k + 1}\n${f(c.a)} --> ${f(c.b)}\n${c.txt}\n`).join('\n'));
console.log(out.map(c => `${c.a.toFixed(2)}-${c.b.toFixed(2)} [${(c.b - c.a).toFixed(2)}] ${c.txt} (${c.txt.length})`).join('\n'));
console.log(`${out.length} legendas -> ${args.out}`);
