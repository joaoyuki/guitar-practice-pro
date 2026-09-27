# Guitar Practice App

App pessoal de prática de guitarra, estilo Songsterr: editor de exercícios com
notas + figuras rítmicas, playback com AlphaTab controlado por BPM, e (fase
seguinte) validação de tempo via microfone.

## Stack
- React + TypeScript + Vite
- AlphaTab (@coderline/alphatab) para renderização e playback da tab

## Rodando localmente
npm install
npm run dev

## Plano de desenvolvimento
1. Setup do projeto — feito
2. Modelo de dados + conversor alphaTex (src/editor/types.ts, alphaTexBuilder.ts)
3. Editor de exercício (UI)
4. Player integrado com AlphaTab (src/player/TabViewer.tsx)
5. Persistência simples (localStorage)
6. Captura de microfone
7. Detector de onset
8. Comparador de tempo + feedback
9. Calibração (tolerância, latência)
10. Fase 2: importar Guitar Pro, técnicas avançadas de notação
