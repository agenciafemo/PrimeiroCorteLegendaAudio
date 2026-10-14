// Envelope de loudness (RMS em janelas de 20 ms) de um WAV PCM 16-bit mono.
// Uso: node audio_rms.js <audio.wav> [saida.json]
// Gere o WAV antes com:
//   ffmpeg -v error -i "<midia>" -vn -ac 1 -ar 16000 audio.wav -y
// Imprime percentis (para escolher o limiar de fala) e um mapa grosso de 0,5 s
// (pico em dB por janela) para enxergar blocos de fala x silêncio x ruído.
const fs = require('fs');
const path = require('path');

const wavPath = process.argv[2];
if (!wavPath) { console.error('uso: node audio_rms.js <audio.wav> [saida.json]'); process.exit(1); }
const outPath = process.argv[3] || path.join(path.dirname(wavPath), 'rms20.json');

const b = fs.readFileSync(wavPath);
let off = 12;
while (b.toString('ascii', off, off + 4) !== 'data') off += 8 + b.readUInt32LE(off + 4);
off += 8;
const n = Math.floor((b.length - off) / 2);
const hop = 320; // 20 ms a 16 kHz
const db = [];
for (let i = 0; i + hop <= n; i += hop) {
  let s = 0;
  for (let j = 0; j < hop; j++) { const x = b.readInt16LE(off + 2 * (i + j)); s += x * x; }
  db.push(10 * Math.log10(s / hop / 32768 ** 2 + 1e-12));
}
fs.writeFileSync(outPath, JSON.stringify(db));

const sd = [...db].sort((a, c) => a - c);
console.log('janelas de 20ms:', db.length, '| duração', (db.length * 0.02).toFixed(2), 's | salvo em', outPath);
console.log('percentis dB:', [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95]
  .map(p => `p${p}=${sd[Math.floor(sd.length * p / 100)].toFixed(1)}`).join(' '));
let line = '';
for (let i = 0; i < db.length; i += 25) {
  line += (i / 50).toFixed(1) + ':' + Math.max(...db.slice(i, i + 25)).toFixed(0) + ' ';
}
console.log('mapa 0,5s (tempo:pico dB):\n' + line);
