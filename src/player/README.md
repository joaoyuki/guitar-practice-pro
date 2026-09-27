Módulo do player.

- [x] TabViewer.tsx — embrulha o AlphaTab (renderiza a tab + toca com metrônomo, respeitando o BPM)

Usa `@coderline/alphatab-vite` (plugin em vite.config.ts) para o bundling do worker/worklet
e para copiar font/soundfont do alphaTab para `public/font` e `public/soundfont`
(gerado automaticamente a cada `dev`/`build`, por isso está no .gitignore).

Treino de ritmo por teclado (barra de espaço) foi implementado em `src/treino/`.
Próxima etapa do plano: questão do microfone (afinador/detecção de pitch) — ainda não iniciada.
