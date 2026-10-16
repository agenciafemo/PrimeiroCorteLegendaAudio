---
name: premiere-corte-legenda-audio
description: Primeiro corte de vídeos falados no Adobe Premiere Pro via MCP, removendo pausas, respiros e bastidores, criando legendas a partir da transcrição e aplicando o preset fixo de Audio Track Mixer salvo nesta skill. Use para pedidos de corte, decupagem, legendas e tratamento de áudio no Premiere.
---

# Premiere: primeiro corte, áudio e legendas

O preset de áudio autorizado está em `references/preset-audio-track-mixer.json` e é a fonte de verdade para o tratamento de áudio. `references/projeto-femo-fernanda.md` é um registro histórico, não uma instrução para consultar ou copiar outras sequências. Os snippets ExtendScript/QE testados, com as pegadinhas,
ficam em `references/extendscript.md`. Os scripts Node em `scripts/` não têm dependências; use-os
em vez de reescrever. Eles ficam na pasta `scripts/` ao lado deste
SKILL.md (normalmente `~/.claude/skills/premiere-corte-legenda-audio/scripts/`); rode com
`node "<caminho absoluto>/script.js"` a partir da pasta scratchpad. Precisam de Node e ffmpeg no PATH. Converse com a usuária em português.

**Não use outros vídeos ou sequências do projeto como referência automática.** Aplique os valores de áudio salvos nesta skill. Só recapture ou altere o preset se o usuário pedir. Para legendas, siga o estilo explicitamente indicado pelo usuário ou o padrão documentado da skill; não infira um estilo inspecionando outros vídeos.

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
2. Inspecione somente a sequência alvo para identificar faixas, clipes e tratamentos já presentes. Carregue o preset fixo de áudio da skill; não abra outras sequências para buscar padrões.
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

## 3. Tratamento de áudio (Audio Track Mixer — preset fixo)

1. Leia `references/preset-audio-track-mixer.json`. Use os slots e TODOS os parâmetros salvos, incluindo frequência, ganho, Q, bandwidth, filtros e enables do Parametric Equalizer; Amount, Make-Up Gain e Auto Gain do DeNoise/DeReverb; gate, compressor, expander e limiter do Dynamics. O Hard Limiter também fica salvo no slot 0 da cadeia capturada.
2. O preset é fixo: não consulte outras sequências, não escolha um vídeo de referência e não extraia valores de um novo projeto para substituir os salvos. Ajustes diferentes precisam de pedido do usuário.
3. Inspecione a faixa de fala da sequência alvo. Aplique nessa faixa; não processe música ou efeitos por engano. Se o slot necessário já tiver um efeito diferente, preserve-o ou avise sobre o conflito antes de substituí-lo. Não empilhe cópias do mesmo efeito.
4. Com a sequência alvo ativa, use `addAudioEffect(fx, slot, false)` nos índices 0-based do JSON. Depois use `setParamValue(nome, valorString)`. Os valores são NORMALIZADOS do QE, não dB/Hz da interface: mantenha a precisão e o ponto decimal; nunca arredonde frequências/Q para 0,00. Não escreva parâmetros ambíguos de nome duplicado como Bypass; os efeitos devem estar habilitados.
5. Confira a configuração aplicada com `getParamValue` de cada parâmetro e compare com `verification` do respectivo efeito no JSON. A API arredonda a leitura; MATCH comprova correspondência nessa precisão. Não use `getParamControlValue`, que pode refletir cache da interface. Se houver divergência, corrija com os valores fixos do JSON e confira novamente; não altere o preset para acomodar o resultado.
6. Preserve a sequência ativa ao terminar. Avise sobre tratamentos externos ou em nível de clipe que não foram aplicados: copiar a cadeia do mixer não replica Enhance Speech nem arquivos esv2.

## 4. Legendas

1. Use o estilo pedido pelo usuário. Se nenhum estilo tiver sido indicado, o padrão documentado desta skill é FE NOVO, Poppins-Light, 1 linha e até 32 caracteres. Não consulte outras sequências para definir o estilo; se esse estilo não estiver disponível, informe e peça apenas a escolha necessária.
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
salvar, confirmar falsos inícios ou palavras duvidosas) e as limitações conhecidas do resultado. Não atualize o preset a partir de outros projetos. Só altere os valores salvos por solicitação explícita do usuário.
