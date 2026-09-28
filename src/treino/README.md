Módulo de treino de ritmo: valida se cada nota foi tocada no tempo, com entrada pelo teclado ou pelo microfone.

- [x] ritmoEngine.ts — cálculo dos tempos esperados de cada nota (a partir do bpm/duração) e avaliação das tentativas do usuário (perfeito / bom / faltou, com desvio em ms)
- [x] useTreinoRitmo.ts — hook que recebe os toques (barra de espaço ou microfone, via `registrarTentativa`) e sincroniza o relógio do treino com a posição real de playback do alphaTab (via `playerPositionChanged`)
- [x] LinhaDoTempo.tsx — feedback visual em trilha horizontal (marca por nota esperada + cursor)
- [x] DestaquePartitura.tsx — feedback direto sobre a partitura, usando `api.boundsLookup` para posicionar marcadores em cima da nota certa
- [x] ResumoTreino.tsx — resumo agregado (percentual de acerto, contagem por classificação, desvio médio)
- [x] Modo silencioso — reaproveita o próprio player do alphaTab com `masterVolume = 0`, para treinar sem ouvir a batida

- [x] microfone/ — detecção do ataque da corda pelo microfone (não identifica a nota, só o momento do toque)

## Microfone (`microfone/`)

A fonte de entrada e o detector são escolhidos no menu "Entrada do treino" no topo da página, e a
configuração (sensibilidade e compensação por detector) fica salva no `localStorage`.

- `captura.ts` — `getUserMedia` com eco/ruído/ganho automático desligados + AudioWorklet que manda
  pacotes de amostras com o índice da primeira amostra (`currentFrame`), para o tempo ter precisão de amostra
- `relogioAudio.ts` — converte tempo do AudioContext para `performance.now()` (mesmo relógio do treino)
- Detectores (todos testados com sinal sintético em `detectores.test.ts`):
  1. `detectorLimiarFixo.ts` — volume via AnalyserNode + requestAnimationFrame com limiar fixo (referência ingênua)
  2. `detectorEnergia.ts` — passa-alta 2 kHz + energia em blocos de 128 amostras vs. média móvel em dB
  3. `detectorSpectralFlux.ts` — spectral flux (FFT 1024, hop 256) + `picoAdaptativo.ts`
  4. `detectorMeyda.ts` — loudness em 24 bandas Bark da biblioteca Meyda + `picoAdaptativo.ts`
     (o `spectralFlux` do Meyda 5.6 tem bug, por isso não é usado)
- `pisoDeRuido.ts` — portão de ruído adaptativo usado pelos detectores 2–4
- `calibracao.ts` / `CalibracaoMicrofone.tsx` — toca bipes, pareia com os toques e usa a mediana
  do atraso como compensação (por detector)
- `MonitorMicrofone.tsx` — curva de detecção, limiar e toques dos últimos segundos, para ajustar a sensibilidade
- `DicasCaptacao.tsx` — aviso sobre o metrônomo vazando no microfone e dicas de captação
