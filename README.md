# Guitar Practice App

App pessoal de prática de guitarra, estilo Songsterr: editor de exercícios com
notas + figuras rítmicas, playback com AlphaTab controlado por BPM, e validação
de tempo pelo teclado ou pelo microfone.

## Stack

### Core
- [React 19](https://react.dev/) — UI
- [TypeScript](https://www.typescriptlang.org/) — tipagem estática
- [Vite](https://vite.dev/) — build tool e dev server

### Áudio/Notação
- [AlphaTab](https://www.alphatab.net/) (`@coderline/alphatab`) — renderização e playback da tab
- `@coderline/alphatab-vite` — integração do AlphaTab com Vite
- [Meyda](https://meyda.js.org/) — extração de features de áudio (usada por um dos detectores do microfone)

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
6. Captura de microfone — feito (src/treino/microfone/)
7. Detector de onset — feito, 4 implementações para comparar (ver abaixo)
8. Comparador de tempo + feedback — feito (reaproveita o motor do treino por teclado)
9. Calibração (tolerância, latência) — feito (calibração de latência por detector)
10. Fase 2: importar Guitar Pro, técnicas avançadas de notação

## Microfone: decisões técnicas

O objetivo é saber **quando** a corda foi tocada, não **qual** nota. Em processamento de
áudio isso se chama *onset detection* (detecção de ataque). O motor de pontuação
(`src/treino/ritmoEngine.ts`) só recebe uma lista de timestamps, então o microfone entra no
lugar da barra de espaço sem mudar nada na avaliação. Os arquivos estão descritos em
[`src/treino/README.md`](src/treino/README.md).

### Decisões comuns a todos os detectores

| Decisão | Por quê |
|---|---|
| `echoCancellation`, `noiseSuppression` e `autoGainControl` desligados no `getUserMedia` | Esses filtros do navegador aumentam a latência e amortecem justamente o ataque que queremos detectar. |
| Tempo do toque vem do **índice da amostra** (`currentFrame` no AudioWorklet), não de quando o código roda | A precisão fica em nível de amostra (~0,02 ms). A detecção pode rodar na thread principal: atrasos na entrega das mensagens não mudam o timestamp. |
| AudioWorklet mínimo (só coleta amostras) e a detecção na thread principal | Os quatro detectores compartilham a mesma captura, podem ser trocados sem reabrir o microfone e são testáveis no Vitest como funções puras. O worklet fica em string (Blob URL) para não depender de como o bundler empacota worklets. |
| Conversão de relógio `AudioContext` → `performance.now()` pelo **menor offset** dos últimos 2 s (`relogioAudio.ts`) | O treino usa `performance.now()` sincronizado com o alphaTab. O `currentTime` lido na thread principal atualiza em saltos, e o menor offset é a leitura mais fiel. A janela curta acompanha a deriva entre os relógios. |
| **Calibração por detector** (bipes + mediana do atraso) | A latência de entrada e saída de áudio (10–60 ms, variando por dispositivo) é da ordem da tolerância de "perfeito" (40 ms). Cada detector marca o ataque num ponto um pouco diferente, então cada um tem a própria compensação. A mediana ignora batidas fora do tempo. |
| Portão de ruído adaptativo (`pisoDeRuido.ts`) | Um limite fixo de volume ou fica acima de sinais fracos ou abaixo do chiado do microfone. O piso segue os mínimos do sinal, mas sobe devagar quando há música, para que as notas soando não sejam confundidas com ruído. |
| Intervalo mínimo entre toques (padrão 60 ms) | Um acorde palhetado gera vários ataques em poucos ms. Sem esse intervalo, uma batida contaria várias vezes. |
| Aviso sobre o som do app | O metrônomo e o playback tocando no alto-falante são captados pelo microfone e contam como toques exatamente no tempo. A solução é usar fone de ouvido ou o modo Silencioso. |

### As quatro implementações

Todas podem ser escolhidas no menu "Entrada do treino" para comparar na prática. O monitor
mostra a curva de cada detector, o limiar e os toques detectados.

#### 1. Volume com limiar fixo (`detectorLimiarFixo.ts`)
Lê o volume (RMS) do `AnalyserNode` a cada `requestAnimationFrame` e dispara quando ele cruza um
valor fixo para cima.

- ✅ A mais simples: dá para entender em um minuto e não tem custo de CPU.
- ✅ Serve de referência para medir quanto as outras melhoram.
- ❌ O tempo depende da taxa de frames da tela (~16 ms de imprecisão) e para quando a aba fica em segundo plano.
- ❌ Não percebe uma nota nova enquanto a anterior ainda está acima do limiar. Com notas seguidas, só a primeira é detectada.
- ❌ O limiar fixo não se adapta a microfone, instrumento ou ambiente diferentes.

#### 2. Energia com limiar adaptativo (`detectorEnergia.ts`) — padrão
Um filtro passa-alta em 2 kHz isola o "clique" da palheta. A energia é medida em blocos de 128
amostras (~3 ms) e dispara quando fica X dB acima da média recente. Só rearma depois que a
energia volta para perto da média.

- ✅ Muito preciso: é a melhor precisão das quatro, de ~3 ms ou menos, com refinamento dentro do bloco.
- ✅ O passa-alta ignora o grave da nota que continua soando, então detecta notas seguidas.
- ✅ Leve, sem FFT e sem dependências.
- ❌ Depende de haver agudos no ataque. Palhetada muito suave, dedo em vez de palheta ou tom muito escuro geram menos sinal.
- ❌ Hammer-on, pull-off e slide quase não têm transiente e podem não ser detectados.
- ❌ Ruídos agudos do ambiente (estalos, batidas na mesa) passam pelo filtro.

#### 3. Spectral flux (`detectorSpectralFlux.ts`)
Calcula a FFT de janelas de 1024 amostras, avançando 256 por vez (~5 ms). Soma quanto cada
frequência **subiu** em relação à janela anterior, com a magnitude em escala logarítmica, e
detecta os picos com um limiar adaptativo (`picoAdaptativo.ts`).

- ✅ É o método clássico da literatura de análise musical e o mais robusto a mudanças de dinâmica: olha para energia **nova** em qualquer frequência, não só nos agudos.
- ✅ Com a escala logarítmica, detecta toques fracos logo depois de toques fortes.
- ✅ Tende a lidar melhor com notas ligadas, com troca de nota sem ataque forte e com tons mais escuros.
- ❌ Precisão limitada pelo avanço da janela: ±2,7 ms. Há também um atraso fixo, que a calibração compensa.
- ❌ Mais CPU: uma FFT a cada ~5 ms (ainda leve para qualquer computador atual).
- ❌ Vibrato e bends mudam o espectro e podem gerar toques falsos. Uma versão com filtro de máximo em frequência (SuperFlux) resolveria, mas não foi implementada.

#### 4. Biblioteca Meyda (`detectorMeyda.ts`)
Usa o [Meyda](https://meyda.js.org/) para extrair a *loudness* específica em 24 bandas Bark
(escala perceptual de frequência) e soma as subidas banda a banda, com o mesmo detector de
picos do spectral flux.

- ✅ O código de análise espectral vem de uma biblioteca mantida e testada.
- ✅ As bandas perceptuais e a compressão da loudness reduzem o peso de variações pequenas em frequências isoladas.
- ❌ Adiciona uma dependência (~550 kB descompactado).
- ❌ Só 24 bandas: menos resolução que o spectral flux, e precisou de um limiar mais alto para não disparar com ruído.
- ❌ O `spectralFlux` do próprio Meyda (5.6) tem bug (acessa o sinal com índices negativos), então a detecção de ataque é montada por fora em cima da `loudness`.

Bibliotecas descartadas: **Essentia.js** (tem SuperFlux e detectores prontos, mas a licença é
AGPL-3.0 e o WASM tem vários MB) e **aubio** (GPL). Modelos de machine learning, como Onsets
& Frames, também transcrevem notas, o que é mais do que precisamos e muito mais pesado.

### Comparação

| | 1. Limiar fixo | 2. Energia | 3. Spectral flux | 4. Meyda |
|---|---|---|---|---|
| Precisão de tempo | ~16 ms | ~3 ms | ±2,7 ms | ±2,7 ms |
| Nota nova com a anterior soando | ❌ | ✅ | ✅ | ✅ |
| Toque fraco depois de forte | ❌ | ✅ | ✅ | ✅ |
| Legato / pouco ataque | ❌ | ❌ | ⚠️ melhor | ⚠️ melhor |
| Robustez a ruído agudo | ❌ | ⚠️ | ✅ | ✅ |
| Custo de CPU | mínimo | baixo | médio | médio |
| Dependências | — | — | — | Meyda |

Números medidos com sinal sintético (testes em `src/treino/microfone/detectores.test.ts` e
palhetadas a cada 500 ms no navegador). Com guitarra real, a comparação deve ser feita no app,
usando o monitor e o resultado do treino.

### Limitações conhecidas
- Técnicas sem palhetada (hammer-on, pull-off, slide, tapping suave) podem não gerar ataque detectável.
- Fones Bluetooth adicionam 150–300 ms de latência variável, que a calibração não corrige bem.
- A calibração mede a latência do microfone e da saída do contexto de captura. A latência do
  próprio alphaTab é considerada igual por usar o mesmo dispositivo de saída.
- A entrada é mono (primeiro canal do dispositivo).
