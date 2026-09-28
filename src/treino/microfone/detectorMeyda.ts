import Meyda from 'meyda';
import { rmsDb } from './detectorSpectralFlux';
import { Enquadrador } from './enquadrador';
import { PicoAdaptativo } from './picoAdaptativo';
import { limiteDoPortao, PisoDeRuido } from './pisoDeRuido';
import { msParaFrames, type DetectorBlocos, type ParametrosDetector, type ResultadoProcessamento } from './tipos';

const TAMANHO = 1024;
const HOP = 256;
const ATRASO_FRAMES = TAMANHO / 2 - HOP / 2;

/**
 * Opção 4: usa o Meyda para calcular a loudness específica em 24 bandas Bark (escala perceptual)
 * e soma as subidas de loudness banda a banda. O `spectralFlux` do próprio Meyda (5.6) está com bug
 * (indexa o sinal com índices negativos), por isso a diferença é feita aqui em cima da `loudness`.
 */
export class DetectorMeyda implements DetectorBlocos {
  private readonly enquadrador = new Enquadrador(TAMANHO, HOP);
  private readonly sampleRate: number;
  private readonly pico: PicoAdaptativo;
  private readonly sensibilidade: number;
  private readonly duracaoHopSeg: number;
  private readonly pisoRuido = new PisoDeRuido();
  private loudnessAnterior: Float32Array | null = null;

  constructor({ sampleRate, sensibilidade, intervaloMinimoMs }: ParametrosDetector) {
    this.sampleRate = sampleRate;
    this.sensibilidade = sensibilidade;
    this.duracaoHopSeg = HOP / sampleRate;
    this.pico = new PicoAdaptativo({
      tamanhoHistorico: Math.round((0.15 * sampleRate) / HOP),
      multiplicador: 2.8 - 1.0 * sensibilidade,
      fracaoMaximo: 0.2 - 0.12 * sensibilidade,
      decaimentoMaximo: Math.exp(-HOP / sampleRate / 2),
      refratarioFrames: msParaFrames(intervaloMinimoMs, sampleRate),
    });
  }

  reiniciar(): void {
    this.enquadrador.reiniciar();
    this.loudnessAnterior = null;
    this.pico.reiniciar();
    this.pisoRuido.reiniciar();
  }

  processar(amostras: Float32Array, frameInicial: number): ResultadoProcessamento {
    const resultado: ResultadoProcessamento = { onsets: [], diagnostico: [] };
    // O Meyda é um objeto global: garante a configuração antes de cada uso.
    Meyda.bufferSize = TAMANHO;
    Meyda.sampleRate = this.sampleRate;
    Meyda.windowingFunction = 'hanning';

    this.enquadrador.adicionar(amostras, frameInicial, (janela, inicio) => {
      const nivelDb = rmsDb(janela);
      const portaoDb = limiteDoPortao(this.pisoRuido.atualizar(nivelDb, this.duracaoHopSeg), this.sensibilidade);
      const loudness = Meyda.extract(['loudness'], janela)?.loudness?.specific ?? null;
      if (!loudness) return;

      let subida = 0;
      if (this.loudnessAnterior) {
        for (let b = 0; b < loudness.length; b++) {
          const diferenca = loudness[b] - this.loudnessAnterior[b];
          if (diferenca > 0) subida += diferenca;
        }
      }
      this.loudnessAnterior = Float32Array.from(loudness);

      const frame = inicio + ATRASO_FRAMES;
      const { onset, limiar } = this.pico.empurrar(subida, frame, nivelDb > portaoDb);
      if (onset !== null) resultado.onsets.push(onset);
      resultado.diagnostico.push({ frame, valor: subida, limiar });
    });
    return resultado;
  }
}
