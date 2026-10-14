# Padrões do projeto FERNANDA_AGOSTO_VÍDEOS (agência Femo) — estado em 14/10/2026

Projeto: `D:\2026\Femo\Fernanda moro\AGOSTO 2026\Projeto\FERNANDA_AGOSTO_VÍDEOS.prproj`
Brutos: `D:\2026\Femo\Fernanda moro\AGOSTO 2026\Brutas\CAMERAS FEMO\C34xx.MP4` (25 fps, 1080x1920, áudio 48 kHz estéreo)
Sequências: `FERNANDA_AGOSTO_VÍDEO N`, 1080x1920, 29,97 fps (timebase 8475667200).
Conteúdo: reels verticais, a Fernanda fala sentada para a câmera segurando objeto laranja;
ela mesma liga/ajusta a câmera no início, às vezes no meio (para e reposiciona) e no fim.

Use isto como ponto de partida, mas **sempre confirme lendo o projeto atual** — o padrão pode mudar.
Em outro projeto/cliente, derive o padrão das sequências já finalizadas daquele projeto.

## Layout de faixas das sequências finalizadas (2–6)
- V1: bruto cortado · V2: Adjustment Layer · V3: Black Video (às vezes)
- V4–V7: títulos MOGRT "NUEVO SUPREMO TEXTO" (Playfair Display, frases de destaque escolhidas a dedo — não são as legendas)
- V10: Adjustment Layers (efeitos pontuais)
- A1: áudio do bruto — **clipes desativados**, volume 0,178 (~-15 dB), Essential Sound "dialog"
- A2: `FERNANDA_AGOSTO_VÍDEO N-esv2-XXp-bg-YYp-music-10p.wav` = mix exportado e passado no Adobe
  Podcast Enhance Speech v2 (feito fora do Premiere pela usuária)
- A3: trilha musical · A4/A5: SFX (mouse-click, scroll, woosh, camera flash)
- Faixa de legenda nativa (track style **FE NOVO**)

## Cadeia do Audio Track Mixer — faixa Audio 1 (idêntica nos VÍDEOS 2, 3, 4, 6; o 1 não tem Dynamics)
Valores normalizados (precisão total, do .prproj). Booleanos lidos via QE.

| Slot | Efeito | Parâmetros |
|---|---|---|
| 1 | Hard Limiter | Maximum Amplitude 0.93999999761581421 (-6 dB) · Input Boost 0.66666698455810547 (0 dB) · Look-Ahead 0.13333301246166229 (7 ms) · Release 0.375 (100 ms) · Link Channels 1 · Decay to Ceiling 1 · Limit True Peak 0 |
| 2 | Parametric Equalizer | Low Shelf Freq 0.00083402806194499135 · Low Shelf Gain 0.5 · High Shelf Freq 0.74979197978973389 · High Shelf Gain 0.5 · B1 Freq 0.0012510400265455246 · B1 Q 0.00019998999778181314 · B1 Gain 0.5 · B2 Freq 0.017038324847817421 (~429 Hz) · B2 Q 0.00095999002223834395 (9,6) · B2 Gain 0.4128289520740509 (-8,4 dB) · B3 Freq 0.033858358860015869 (~832 Hz) · B3 Q 0.0014099900145083666 (14,1) · B3 Gain 0.40953946113586426 (-8,7 dB) · B4 Freq 0.072120383381843567 (~1,75 kHz) · B4 Q 0.00084998999955132604 (8,5) · B4 Gain 0.43914473056793213 (-5,8 dB) · B5 Freq 0.53294402360916138 · B5 Q 0.00019998999778181314 · B5 Gain 0.5 · Gain 0.66666698455810547 · ConstantQ 1 · Low/High Shelf Filter Order 0 · Ultra-Quiet 0 · Low/High Shelf Enable 1 · B1–B5 Enable 1 · Original Sample Rate 0.25 · B1 BW 0.0024999871384352446 · B2 BW 0.0044643552973866463 · B3 BW 0.0059001562185585499 · B4 BW 0.020581714808940887 · B5 BW 0.63999992609024048 · High-Pass Enable 1 · High-Pass Cutoff 0.00083402806194499135 · High-Pass Slope 0.40000000596046448 · Low-Pass Enable 1 · Low-Pass Cutoff 0.74979197978973389 · Low-Pass Slope 0.40000000596046448 · LowGraphRange 1 |
| 3 | DeNoise | Amount 0.18067225813865662 · Make-Up Gain 0 · Auto Gain 0 · Shelve Type 0 · Output Difference 0 |
| 4 | DeReverb | Amount 0.1260504275560379 · Make-Up Gain 0.19958004355430603 · Auto Gain 1 · Shelve Type 0 · Output Difference 0 |
| 5 | Dynamics | AutoGate Enabled 0 · AutoGate Threshold 0.66666668653488159 · Attack 0.090909093618392944 · Release 0.1111111119389534 · Hold 0.0090090082958340645 · Compressor Enabled 1 · Comp Threshold 0.71833330392837524 · Comp Ratio 0.84285718202590942 · Comp Attack 0.090909093618392944 · Comp Release 0.081632651388645172 · Comp MakeUp 0.07916666567325592 · Expander Enabled 0 · Expander Threshold 0.66666668653488159 · Expander Ratio 0 |

Escalas deduzidas (para conferência): frequências do EQ lineares 0–24000 Hz; Q e largura de banda lineares 0–10000;
ganho do EQ ±48 dB (0.5 = 0 dB); Maximum Amplitude -100..0 dB.

## Legendas
- Faixa de legenda nativa criada a partir da transcrição do Premiere (idioma pt-pt na transcrição).
- Track style **FE NOVO**, fonte **Poppins-Light**.
- 1 linha; máx. 32 caracteres (mediana ~19); quebra em pontuação e trechos de frase; legendas contíguas;
  texto como falado, com pontuação (frase começa com maiúscula).

## Histórico
- VÍDEO 7 (C3422): bruto 2:23 → 1:13,4 após corte, mais ajustes da usuária (ela removeu o primeiro take
  e o tropeço "mas essas a longo,"). Backup do bruto: sequência "FERNANDA_AGOSTO_VÍDEO 7 - BRUTO (backup)".
  Legendas: `Projeto\FERNANDA_AGOSTO_VÍDEO 7 - legendas.srt`.
