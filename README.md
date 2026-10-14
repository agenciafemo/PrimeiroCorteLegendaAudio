# Skills do Claude — Agência Femo

Skills do Claude Code usadas pela agência. Cada pasta em `skills/` é uma skill independente.

| Skill | O que faz |
|---|---|
| [`premiere-corte-legenda-audio`](skills/premiere-corte-legenda-audio/SKILL.md) | Primeiro corte de vídeos falados no Premiere Pro (tira respiros e ajustes de câmera), tratamento de áudio pelo Audio Track Mixer e legendas no padrão das outras sequências do projeto |

## Como instalar numa máquina nova

Requisitos: Claude Code (desktop ou CLI), Node.js e ffmpeg no PATH. Para a skill do Premiere, também o
servidor MCP `premiere-pro` e o painel **MCP Bridge** no Premiere (Window > Extensions > MCP Bridge).

```bash
git clone https://github.com/agenciafemo/femo-claude-skills.git
```

Copie a pasta da skill para o diretório de skills do usuário:

- Windows: `C:\Users\<usuário>\.claude\skills\`
- macOS/Linux: `~/.claude/skills/`

```bash
cp -r femo-claude-skills/skills/premiere-corte-legenda-audio ~/.claude/skills/
```

Abra uma nova conversa no Claude Code. A skill aparece na lista e entra em ação sozinha quando você
pede, por exemplo, "faz o primeiro corte da timeline VÍDEO 8 tirando os respiros" ou "legenda esse
vídeo igual aos outros".

## Atualizando

Quando a skill for melhorada numa máquina, copie a pasta de volta para `skills/` neste repositório e
faça commit. Nas outras máquinas, rode `git pull` e copie de novo para `~/.claude/skills/`.

## Padrões por projeto

`skills/premiere-corte-legenda-audio/references/projeto-femo-fernanda.md` guarda os padrões do projeto
da Fernanda (cadeia de efeitos, layout de faixas, estilo de legenda). Para outro cliente, crie um
arquivo parecido em `references/`. A skill sempre confirma o padrão lendo as sequências já
finalizadas do projeto aberto.
