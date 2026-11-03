# Decisões de tecnologia: u1-walking-skeleton

A stack vem do `TDD.md` e de `inception/requirements-analysis/requirements.md`. As versões exatas ficam no `package-lock.json`.

| Camada | Escolha | Motivo |
|---|---|---|
| Linguagem | TypeScript em modo estrito, Node.js 22.13 ou superior | Uma linguagem só, e essa versão traz o SQLite embutido |
| Web e servidor | Next.js 16, com App Router | Interface e rotas em um processo único |
| Banco | `node:sqlite`, com SQL direto e migrações `.sql` numeradas | Nada para instalar à parte |
| Terminal na tela | `@xterm/xterm` | É o componente usado pelo terminal do VS Code |
| Terminal no servidor | `node-pty`, em `serverExternalPackages` | As CLIs interativas exigem um pseudo-terminal real |
| Transporte | SSE para a saída e POST para a entrada | Sem servidor próprio além do Next. A troca fica isolada em `terminal` |
| Validação | Zod | Configuração e entrada das rotas |
| Fontes | `@fontsource/nunito` e `@fontsource/jetbrains-mono` | Vêm no pacote, sem chamada de rede |
| Qualidade | Vitest, Playwright, Prettier, ESLint e cobertura de linhas | Práticas de `team.md`. O Playwright usa o navegador já instalado, sem baixar navegadores no `npm install` |

## Conferências no início de U1

Estes pontos do `TDD.md` só se confirmam na prática, então são os primeiros passos da construção:

| Ponto | Como conferir | Se falhar |
|---|---|---|
| `node-pty` instala sem compilação manual e abre o Git Bash com ConPTY | Instalar e abrir um shell real no Windows | Paro e trago a decisão a quem desenvolve, porque a alternativa `child_process` perde recursos das CLIs interativas |
| `node:sqlite` funciona no Node.js instalado e dentro do servidor do Next | Abrir um banco, migrar e gravar | Usar `better-sqlite3` |
| O registro em `globalThis` é o mesmo nas rotas do Next, em `dev` e em `start` | Abrir a sessão em uma rota e escrever por outra, nos dois modos | Paro e trago a decisão, porque a sessão depende disso |
| SSE no App Router entrega a saída sem acumular | Medir o eco na prova | Trocar o transporte dentro de `terminal`, com aval de quem desenvolve |

## Alternativas rejeitadas

- **WebSocket:** exigiria um servidor próprio ao redor do Next. Fica como troca possível, caso o eco não atinja a meta.
- **Prisma ou outro ORM:** o esquema é pequeno, e um ORM traria dependência e geração de código.
- **Banco externo:** proibido pelas regras do projeto.

## Consequências para segurança

`node-pty` é um módulo nativo, então o `npm audit` e o `package-lock.json` versionado valem também para ele. A escolha sem login depende das proteções de `security-requirements.md`.
