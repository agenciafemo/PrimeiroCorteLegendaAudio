// Leitura SOMENTE-LEITURA do .prproj salvo (gzip de XML). Nunca escreve no projeto.
// O Premiere só grava transcrições/efeitos no disco quando o projeto é salvo (Ctrl+S).
//
// Subcomandos:
//   node prproj_read.js transcripts <proj.prproj>
//       Lista as transcrições do projeto (índice, nº de palavras, intervalo, primeiras palavras).
//       Transcrição de CLIPE usa tempo da mídia de origem; de SEQUÊNCIA usa tempo da timeline.
//   node prproj_read.js words <proj.prproj> <indice> <saida.json>
//       Decodifica uma transcrição em [{s, st, du}] (palavra, início, duração em segundos).
//   node prproj_read.js fx <proj.prproj> "<nome do 1º parâmetro>" [qtd=120]
//       Imprime, em precisão total, os parâmetros de efeitos de áudio (normalizados 0..1) a partir
//       de cada ocorrência do parâmetro indicado (ex.: "Maximum Amplitude" = início do Hard Limiter).
//       Parâmetros booleanos/enable não têm CurrentValue no XML (aparecem como "(def)"):
//       leia esses pelo QE (getParamValue) na sequência de referência.
//   node prproj_read.js captions <proj.prproj>
//       Estatísticas das legendas existentes (texto, duração, caracteres) e o nome do track style.
const fs = require('fs');
const zlib = require('zlib');

const [cmd, projPath, a3, a4] = process.argv.slice(2);
if (!cmd || !projPath) { console.error('uso: node prproj_read.js <transcripts|words|fx|captions> <proj.prproj> ...'); process.exit(1); }
const raw = fs.readFileSync(projPath);
const x = (raw[0] === 0x1f && raw[1] === 0x8b ? zlib.gunzipSync(raw) : raw).toString('utf8');
const TPS = 254016000000; // ticks por segundo do Premiere

function transcriptBlobs() {
  const re = /<TranscriptData Encoding="base64"[^>]*>([\s\S]*?)<\/TranscriptData>/g; let m; const out = [];
  while ((m = re.exec(x))) out.push(Buffer.from(m[1].replace(/\s/g, ''), 'base64'));
  return out;
}
// Formato (flatbuffer): cada palavra = [float32 confiança][int64 início ticks][int64 duração ticks]
// ... [u32 tamanho][utf8][0]. Varremos strings e procuramos o bloco de tempo logo antes.
function decodeWords(b) {
  const out = [];
  for (let i = 24; i + 4 < b.length; i++) {
    const L = b.readUInt32LE(i);
    if (L > 0 && L < 40 && i + 4 + L < b.length && b[i + 4 + L] === 0) {
      const s = b.slice(i + 4, i + 4 + L).toString('utf8');
      if (/^[\p{L}\p{P}\d]+$/u.test(s) && s !== 'Unknown' && !/^[a-z]{2}-[a-z]{2}$/.test(s)) {
        let st = null, du = null;
        for (let k = i - 4; k >= i - 40 && k >= 8; k--) {
          const f = b.readFloatLE(k);
          if ((f > 0.2 && f <= 1.0001 && (b.readUInt32LE(k) & 0xffff) !== 0) || f === 1) {
            const a = Number(b.readBigInt64LE(k + 4)), d = Number(b.readBigInt64LE(k + 12));
            if (a >= 0 && a < TPS * 3600 && d > 0 && d < TPS * 20) { st = a / TPS; du = d / TPS; break; }
          }
        }
        if (st !== null) out.push({ s, st, du });
        i += 3 + L;
      }
    }
  }
  return out.sort((p, q) => p.st - q.st);
}

if (cmd === 'transcripts') {
  transcriptBlobs().forEach((b, k) => {
    const w = decodeWords(b);
    console.log(k, `palavras=${w.length}`, `intervalo=${w.length ? w[0].st.toFixed(1) : '-'}-${w.length ? w[w.length - 1].st.toFixed(1) : '-'}s`, '|', w.slice(0, 14).map(o => o.s).join(' '));
  });
} else if (cmd === 'words') {
  const w = decodeWords(transcriptBlobs()[+a3]);
  fs.writeFileSync(a4, JSON.stringify(w));
  console.log(`${w.length} palavras salvas em ${a4}`);
} else if (cmd === 'fx') {
  const re = /<AudioComponentParam ObjectID="(\d+)"[^>]*>([\s\S]*?)<\/AudioComponentParam>/g; let m; const all = [];
  while ((m = re.exec(x))) {
    const body = m[2];
    all.push({ n: (body.match(/<Name>([^<]*)<\/Name>/) || [])[1], v: (body.match(/<CurrentValue>([^<]*)<\/CurrentValue>/) || [])[1] });
  }
  const count = +(a4 || 120);
  all.forEach((p, i) => {
    if (p.n !== a3) return;
    console.log(`=== ocorrência no índice ${i}`);
    console.log(all.slice(i, i + count).map(q => `${q.n}=${q.v === undefined ? '(def)' : q.v}`).join('\n'));
  });
} else if (cmd === 'captions') {
  const styles = [...x.matchAll(/<StyleProjectItem ObjectUID="([^"]+)"[\s\S]*?<Name>([^<]*)<\/Name>/g)].map(m => ({ uid: m[1], name: m[2] }));
  const used = [...x.matchAll(/<ParentStyle ObjectURef="([^"]+)"/g)].map(m => m[1]);
  console.log('track styles no projeto:', styles.map(s => `${s.name} (${used.filter(u => u === s.uid).length} faixas de legenda)`).join(', ') || 'nenhum');
  const blocks = {};
  for (const m of x.matchAll(/<Block ObjectID="(\d+)"[^>]*>\s*<FormattedTextData Encoding="base64"[^>]*>([\s\S]*?)<\/FormattedTextData>/g)) {
    const b = Buffer.from(m[2].replace(/\s/g, ''), 'base64'); const strs = [];
    for (let i = 0; i + 4 < b.length; i++) {
      const L = b.readUInt32LE(i);
      if (L > 1 && L < 200 && i + 4 + L <= b.length && b[i + 4 + L] === 0) {
        const s = b.slice(i + 4, i + 4 + L).toString('utf8');
        if (!s.includes('�') && /[a-zà-ú]/i.test(s)) { strs.push(s); i += 3 + L; }
      }
    }
    blocks[m[1]] = strs;
  }
  const fonts = new Set(); const items = [];
  for (const m of x.matchAll(/<CaptionDataClipTrackItem ObjectID="(\d+)"[\s\S]*?<Start>(\d+)<\/Start>\s*<End>(\d+)<\/End>[\s\S]*?<BlockVectorItem Index="0" ObjectRef="(\d+)"/g)) {
    const strs = blocks[m[4]] || [];
    strs.filter(s => /^[A-Z][A-Za-z]+-[A-Za-z]+$/.test(s)).forEach(f => fonts.add(f));
    items.push({ st: +m[2] / TPS, en: +m[3] / TPS, txt: strs.filter(s => !/^[A-Z][A-Za-z]+-[A-Za-z]+$/.test(s)).join(' / ') });
  }
  const lens = items.map(i => i.txt.length).filter(l => l > 0).sort((p, q) => p - q);
  const pct = p => lens[Math.floor(lens.length * p)];
  console.log(`legendas: ${items.length} | fontes: ${[...fonts].join(', ')} | caracteres p10/p50/p90/max = ${pct(.1)}/${pct(.5)}/${pct(.9)}/${lens[lens.length - 1]}`);
  console.log('amostra:\n' + items.slice(0, 20).map(i => `${i.st.toFixed(2)}-${i.en.toFixed(2)} [${(i.en - i.st).toFixed(2)}s] ${JSON.stringify(i.txt)}`).join('\n'));
} else {
  console.error('subcomando desconhecido: ' + cmd); process.exit(1);
}
