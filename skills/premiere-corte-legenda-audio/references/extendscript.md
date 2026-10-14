# Snippets ExtendScript / QE testados (Premiere Pro 26.x via MCP `execute_extendscript`)

Rodar com `invoke_tool` → `execute_extendscript`, argumento `{"script": "..."}`.
Sempre embrulhe em IIFE com `return` (senão volta `"undefined"`) e `try/catch` (erros do QE
derrubam o `evalScript` com mensagem genérica). Caracteres não-ASCII no script: use `Í` etc.

Constantes: 254016000000 ticks/s. Frame 29,97 = 8475667200 ticks. Frame 25 = 10160640000 ticks.

## Achar a sequência pelo ID
```js
var s;for(var i=0;i<app.project.sequences.numSequences;i++){if(app.project.sequences[i].sequenceID=='<ID>')s=app.project.sequences[i];}
```

## Mídia de origem e in/out do clipe
```js
var c=s.videoTracks[0].clips[0]; c.projectItem.getMediaPath(); c.inPoint.seconds; c.start.seconds;
```

## Listar clipes da fala → clips.json para build_srt.js
```js
(function(){var s;/*achar seq*/var V=s.videoTracks[0].clips,A=s.audioTracks[0].clips,o=[];
for(var j=0;j<A.numItems;j++){var x=A[j];o.push('['+x.start.seconds.toFixed(4)+','+x.end.seconds.toFixed(4)+','+x.inPoint.seconds.toFixed(4)+']');}
return '['+o.join(',')+'] end='+(s.end/254016000000).toFixed(4);})()
```

## Aplicar os cortes (depois dos razors)
Faça os razors com a ferramenta `razor_timeline_at_time` (pode mandar vários em paralelo; corta
todas as faixas). Depois, em UM script, remova as peças de corte (índices pares quando o primeiro
trecho é corte) de trás para frente, áudio e vídeo juntos, com ripple:
```js
// remove(inRipple, inAlignToVideo). Remover só o vídeo NÃO remove o áudio linkado.
at.clips[k].remove(true,false); vt.clips[k].remove(true,false);
```
Antes de remover, confira `vt.clips[k].start == at.clips[k].start`. Depois, verifique:
sem gaps (start[j] == end[j-1]), V/A com mesmo start/inPoint, duração final esperada.
`remove_from_timeline` com `deleteMode:"ripple"` também funciona, mas só para 1 faixa por vez.

## Estender um clipe (recuperar final de palavra) empurrando o resto
Processar do clipe mais tardio para o mais cedo. Para V1 e A1:
```js
var d=frames*8475667200; // em ticks
for(var j=c.numItems-1;j>k;j--){var tm=new Time();tm.ticks=String(d);c[j].move(tm);} // abre espaço
var ne=new Time();ne.ticks=String(Number(it.end.ticks)+d);it.end=ne;                // estende
var op=new Time();op.ticks=String(Number(it.inPoint.ticks)+(Number(it.end.ticks)-Number(it.start.ticks)));it.outPoint=op;
```
**Pegadinha:** mudar só `end` deixa `outPoint` desatualizado (dur ≠ src). Sempre setar `outPoint`
em seguida e conferir `end-start == outPoint-inPoint`. Lembre de estender também camadas de ajuste
que cobrem a sequência inteira (faixas de vídeo superiores).

## Efeitos de faixa (Audio Track Mixer) — só via QE, só na sequência ATIVA
```js
app.enableQE(); app.project.openSequence('<ID>');      // torna ativa
var tr=qe.project.getActiveSequence().getAudioTrackAt(0);
for(var c=0;c<tr.numComponents;c++){var cp=tr.getComponentAt(c); cp.name; cp.getParamList(); cp.getParamValue('Amount');}
```
- Nomes dos componentes: `"Fx Slot 1: Hard Limiter"`, …, além de `"Track"` (fader) e um sem nome (meter).
- `getParamValue` → valor NORMALIZADO 0..1 como string com vírgula e 2 casas ("0,94"). Fonte de verdade,
  mas sem precisão → pegue a precisão total no .prproj (`prproj_read.js fx`).
- `getParamControlValue` → cache da UI; costuma ficar desatualizado (mostra default). Não confie.
- Adicionar efeito em slot específico: `tr.addAudioEffect(qe.project.getAudioEffectByName('Hard Limiter'), slotIndex0based, false)`.
  Sem o índice, cada chamada SUBSTITUI o slot 1.
- Setar: `cp.setParamValue('Nome', '0.93999999761581421')` — string com PONTO, 2 argumentos.
  Com vírgula ("0,94") ou com 3º argumento o valor é interpretado errado.
- Parâmetros booleanos/enable: setar `'1'`/`'0'` conforme lido via QE na referência.
- Nomes duplicados (`Bypass`) — não setar.
- Verificação: monte a "assinatura" (lista nome=getParamValue de todos os slots) da referência e do
  alvo e compare string a string. Tem que dar MATCH em todos os slots.
- Voltar a sequência ativa original no fim (`openSequence`).

## Legendas a partir de SRT
```js
app.project.importFiles([caminhoSrt],true,app.project.rootItem,false);
// achar o item importado em rootItem.children pelo nome, depois:
s.createCaptionTrack(item, 0);   // true = criada
```
Não há API para ler legendas nem para aplicar track style de legenda: o usuário seleciona a
faixa de legenda → Properties/Essential Graphics → Track Style → estilo do projeto.

## Marcador de revisão
```js
var m=s.markers.createMarker(0); m.name='REVISAR: ...'; m.comments='...'; m.end=4.7;
```
