Módulo de treino de ritmo (validação de tempo sem precisar do microfone ainda).

- [x] ritmoEngine.ts — cálculo dos tempos esperados de cada nota (a partir do bpm/duração) e avaliação das tentativas do usuário (perfeito / bom / faltou, com desvio em ms)
- [x] useTreinoRitmo.ts — hook que escuta a barra de espaço e sincroniza o relógio do treino com a posição real de playback do alphaTab (via `playerPositionChanged`)
- [x] LinhaDoTempo.tsx — feedback visual em trilha horizontal (marca por nota esperada + cursor)
- [x] DestaquePartitura.tsx — feedback direto sobre a partitura, usando `api.boundsLookup` para posicionar marcadores em cima da nota certa
- [x] ResumoTreino.tsx — resumo agregado (percentual de acerto, contagem por classificação, desvio médio)
- [x] Modo silencioso — reaproveita o próprio player do alphaTab com `masterVolume = 0`, para treinar sem ouvir a batida

Entrada por teclado (barra de espaço) apenas por enquanto. O motor de avaliação (`ritmoEngine.ts`)
é agnóstico à fonte do "toque", então a entrada por microfone (fase seguinte do plano) pode plugar
nele sem mudar a lógica de pontuação — só precisa gerar timestamps.
