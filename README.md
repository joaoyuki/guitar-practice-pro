# Guitar Practice App

App pessoal de prática de guitarra, estilo Songsterr: editor de exercícios com
notas + figuras rítmicas, playback com AlphaTab controlado por BPM, e (fase
seguinte) validação de tempo via microfone.

## Stack

### Core
- [React 19](https://react.dev/) — UI
- [TypeScript](https://www.typescriptlang.org/) — tipagem estática
- [Vite](https://vite.dev/) — build tool e dev server

### Áudio/Notação
- [AlphaTab](https://www.alphatab.net/) (`@coderline/alphatab`) — renderização e playback da tab
- `@coderline/alphatab-vite` — integração do AlphaTab com Vite

### Testes e qualidade
- [Vitest](https://vitest.dev/) — testes
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html) — linter

## Rodando localmente
npm install
npm run dev

## Plano de desenvolvimento
1. Setup do projeto — feito
2. Modelo de dados + conversor alphaTex (src/editor/types.ts, alphaTexBuilder.ts)
3. Editor de exercício (UI)
4. Player integrado com AlphaTab (src/player/TabViewer.tsx)
5. Persistência simples (localStorage)
5.5. Treino de ritmo por teclado (barra de espaço) — feito (src/treino/)
6. Captura de microfone
7. Detector de onset
8. Comparador de tempo + feedback
9. Calibração (tolerância, latência)
10. Fase 2: importar Guitar Pro, técnicas avançadas de notação
