---
name: premiere-corte-legenda-audio
description: Fluxo completo de edição de reels/vídeos falados no Adobe Premiere Pro via MCP (premiere-pro). Cobre o primeiro corte (remover respiros, pausas, silêncios e os momentos em que a pessoa ajusta a câmera ou entra e sai de cena), o tratamento de áudio copiando a cadeia de efeitos do Audio Track Mixer das outras sequências do projeto e as legendas no mesmo padrão e track style das outras sequências, a partir da transcrição do Premiere. Use sempre que o usuário pedir para cortar, decupar, fazer o primeiro corte ou "tirar respiros" de uma timeline do Premiere, legendar um vídeo "igual aos outros", tratar o áudio "igual às outras sequências", ou mencionar o projeto da Femo/Fernanda, mesmo que peça só uma das etapas.
---

# Premiere: primeiro corte, áudio e legendas

Fluxo validado no projeto FERNANDA_AGOSTO_VÍDEOS (Femo). Os padrões daquele projeto ficam em
`references/projeto-femo-fernanda.md`. Os snippets ExtendScript/QE testados, com as pegadinhas,
ficam em `references/extendscript.md`. Os scripts Node em `scripts/` não têm dependências; use-os
em vez de reescrever. Eles ficam na pasta `scripts/` ao lado deste
SKILL.md (normalmente `~/.claude/skills/premiere-corte-legenda-audio/scripts/`); rode com
`node "<caminho absoluto>/script.js"` a partir da pasta scratchpad. Precisam de Node e ffmpeg no PATH. Converse com a usuária em português.

A regra que guia tudo: **o padrão vem das sequências já finalizadas do próprio projeto.** Leia-as
antes de editar e copie o padrão. Não invente um estilo novo.

## 0. Conexão e regras gerais

- Rode `verify_premiere_connection` com `launchIfNeeded:false`. Se voltar `userActionRequired`,
  passe à usuária o `nextStep` (abrir Window > Extensions > MCP Bridge) e pare.
- As ferramentas além das 5 básicas ficam no catálogo: use `search_tools`, depois `get_tool_schema`
  e `invoke_tool`. Para o que o catálogo não cobre, use `execute_extendscript` (veja as referências).
- Trabalhe na pasta scratchpad. Os arquivos de mídia e o .prproj são só leitura. Para ler o
  .prproj, use `scripts/prproj_read.js`, que descompacta em memória.
- O .prproj só reflete o que foi **salvo**. Transcrições, valores exatos de efeito e legendas novas
  só aparecem no disco depois do Ctrl+S. Não salve o projeto da usuária sem ela concordar; peça
  para ela salvar.
- Mantenha a usuária informada a cada etapa com uma frase curta. Nunca diga que algo deu certo
  sem verificar.

## 1. Inspeção

1. Use `list_sequences` e `list_sequence_tracks` na sequência alvo. Pegue o caminho da mídia, o
   `inPoint` e o `start` do clipe (snippet em referências).
2. Leia as sequências finalizadas: faixas, nomes dos clipes, legendas e efeitos. Ver o layout típico
   em `references/projeto-femo-fernanda.md`.
3. **Backup** antes de mexer: `duplicate_sequence` com o nome `"<sequência> - BRUTO (backup)"`.

## 2. Primeiro corte (respiros + ajustes de câmera)

1. Extraia o áudio e meça o volume:
   ```bash
   ffmpeg -v error -i "<midia>" -vn -ac 1 -ar 16000 audio.wav -y
   node scripts/audio_rms.js audio.wav rms.json
   ```
   Fala costuma ficar entre -12 e -25 dB, o ruído da sala entre -50 e -57 dB, e mexer na câmera
   dá um ruído no meio (-37 a -48).
2. Gere folhas de contato com 1 quadro por segundo e o tempo impresso, e olhe todas (Read nas imagens):
   ```bash
   ffmpeg -v error -i "<midia>" -vf "fps=1,scale=150:-2,drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='%{pts\:hms}':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=10x5" -y sheet_%02d.jpg
   ```
   Marque as **zonas ruins**: close desfocado de rosto ou roupa (ela está na frente da lente),
   enquadramento mudando, ela andando, sentando ou levantando. É comum ter uma no início, uma no
   meio (ela para e reajusta) e uma no fim.
3. Se já houver transcrição do bruto no projeto salvo (`prproj_read.js transcripts`; a transcrição
   do clipe usa os tempos da mídia), exporte as palavras e passe `--words`. Isso protege os finais
   de palavra baixos.
4. Monte o plano:
   ```bash
   node scripts/plan_cuts.js --rms rms.json --end <duração> --bad "0-15,20.6-36,136-999" \
        [--words words.json] --clip-start <start> --clip-in <inPoint> --out plan.json
   ```
   Os padrões são: limiar -35 dB, folga de 0,10s antes e 0,20s depois, e corte mínimo de 0,15s.
   Pausas longas de silêncio no meio, como uma de 9s em que ela pensa calada, também saem.
5. **Falsos inícios:** quando há fala logo antes de uma zona de ajuste de câmera, provavelmente é um
   take descartado. Sem transcrição não dá para confirmar, então **mantenha o trecho e crie um
   marcador "REVISAR"**. Não apague fala por suposição.
6. Aplique: faça `razor_timeline_at_time` em cada tempo de `razorTimeline` (pode mandar em paralelo).
   Depois rode **um** script que remove as peças de corte de trás para frente, com áudio e vídeo
   juntos e ripple (veja as referências). Verifique que não ficou nenhum gap, que vídeo e áudio
   estão sincronizados e que a duração final é a esperada.
7. Relate o que saiu (as zonas de câmera com os tempos, a quantidade de pausas, a pausa longa), os
   pontos para revisar, onde está o backup, e que falta salvar.

## 3. Tratamento de áudio (Audio Track Mixer)

1. Na sequência ativa, liste via QE os componentes da faixa Audio 1 de cada sequência finalizada
   (`openSequence` + `getAudioTrackAt(0).getComponentAt(i).name`). Compare as assinaturas de
   `getParamValue`. Normalmente todas são idênticas; use a mais recente como referência.
2. Pegue a precisão total no .prproj salvo:
   `node scripts/prproj_read.js fx <proj> "Maximum Amplitude"`. Os booleanos aparecem como "(def)"
   e devem ser lidos via QE na referência. Para o projeto Femo, os valores já estão na tabela em
   `references/projeto-femo-fernanda.md`.
3. Na sequência alvo, ativa: `addAudioEffect(fx, slot, false)` em cada slot (0, 1, 2…). Sem o índice,
   cada chamada substitui o slot 1. Depois use `setParamValue(nome, "valor.com.ponto")`.
4. **Verifique**: compare as assinaturas da referência e do alvo; todos os slots têm que dar MATCH.
   `getParamControlValue` é um cache da interface e não serve para conferir.
5. Volte para a sequência que estava ativa antes. Avise a usuária das diferenças em nível de clipe
   que você **não** replicou. No projeto Femo: os clipes de A1 desativados, e o Enhance Speech
   (arquivo esv2) em A2, que é feito fora do Premiere.

## 4. Legendas

1. Leia o padrão com `node scripts/prproj_read.js captions <proj>`: track style, fonte, tamanho em
   caracteres e uma amostra. No projeto Femo é FE NOVO, Poppins-Light, 1 linha e até 32 caracteres.
2. O script não consegue transcrever. Peça à usuária: **Window > Text > Transcript > Transcribe
   sequence** (em português), depois **Ctrl+S**, e que avise quando terminar.
3. Use `prproj_read.js transcripts <proj>` e pegue a transcrição nova. Uma transcrição com tempos
   além da duração da sequência é do **clipe de origem**, o que é o normal. Depois rode
   `prproj_read.js words <proj> <idx> words.json`.
4. Gere `clips.json` com o snippet "Listar clipes" (faixa A1, `[start,end,inPoint]`) e rode
   `node scripts/build_srt.js --words words.json --clips clips.json --end <fim> --check`. Esse passo
   pega erros do corte: uma palavra com o fim cortado (confira com o RMS se ainda há energia acima
   de -45 dB depois do corte; finais baixos como "ví-deo" são vítimas comuns) ou fala removida
   entre clipes (às vezes é a própria usuária tirando um tropeço, o que está certo). Para estender
   clipes, use o snippet "Estender um clipe" e depois gere de novo o `clips.json`.
5. Gere o SRT:
   `node scripts/build_srt.js --words words.json --clips clips.json --end <fim> --out legendas.srt [--fix '{"palavra":"palavra,"}']`.
   Confira a saída: nome próprio separado, linha terminando em "a/de/que", palavra que o ASR
   perdeu (sinalize, não invente).
6. Copie o SRT para a pasta do projeto como `<sequência> - legendas.srt`. Importe e rode
   `createCaptionTrack(item, 0)`.
7. Peça à usuária para aplicar o estilo: selecionar a faixa de legenda, ir em **Properties > Track
   Style** e escolher o estilo do projeto ("FE NOVO"). Não há API para isso.

## 5. Fechamento

Relate de forma curta o que foi feito e verificado, o que depende dela (aplicar o track style,
salvar, confirmar falsos inícios ou palavras duvidosas) e as diferenças conhecidas em relação aos
outros vídeos. Se você descobriu um padrão novo do projeto, atualize
`references/projeto-femo-fernanda.md`.
