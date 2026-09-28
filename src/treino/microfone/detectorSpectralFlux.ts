import { Enquadrador } from './enquadrador';
import { FFT, janelaHann } from './fft';
import { PicoAdaptativo } from './picoAdaptativo';
import { limiteDoPortao, PisoDeRuido } from './pisoDeRuido';
import { msParaFrames, type DetectorBlocos, type ParametrosDetector, type ResultadoProcessamento } from './tipos';

const TAMANHO = 1024;
const HOP = 256;
const FREQUENCIA_MINIMA_HZ = 70;
/** Compressão logarítmica da magnitude: realça mudanças em partes mais fracas do espectro. */
const GAMA = 1000;
/**
 * O flux da janela que começa em `s` mede a diferença para a janela anterior, e é máximo quando o
 * ataque está perto do meio das duas: s + TAMANHO/2 - HOP/2.
 */
const ATRASO_FRAMES = TAMANHO / 2 - HOP / 2;

export function rmsDb(amostras: ArrayLike<number>): number {
  let soma = 0;
  for (let i = 0; i < amostras.length; i++) soma += amostras[i] * amostras[i];
  return 10 * Math.log10(soma / amostras.length + 1e-12);
}

/** Opção 3: spectral flux com magnitude log-comprimida e peak picking adaptativo. */
export class DetectorSpectralFlux implements DetectorBlocos {
  private readonly enquadrador = new Enquadrador(TAMANHO, HOP);
  private readonly fft = new FFT(TAMANHO);
  private readonly janela = janelaHann(TAMANHO);
  private readonly normalizacao: number;
  private readonly binMinimo: number;
  private readonly re = new Float64Array(TAMANHO);
  private readonly im = new Float64Array(TAMANHO);
  private espectroAnterior: Float64Array | null = null;
  private readonly pico: PicoAdaptativo;
  private readonly sensibilidade: number;
  private readonly duracaoHopSeg: number;
  private readonly pisoRuido = new PisoDeRuido();

  constructor({ sampleRate, sensibilidade, intervaloMinimoMs }: ParametrosDetector) {
    this.normalizacao = 2 / this.janela.reduce((soma, w) => soma + w, 0);
    this.binMinimo = Math.max(1, Math.round((FREQUENCIA_MINIMA_HZ * TAMANHO) / sampleRate));
    this.sensibilidade = sensibilidade;
    this.duracaoHopSeg = HOP / sampleRate;
    this.pico = new PicoAdaptativo({
      tamanhoHistorico: Math.round((0.15 * sampleRate) / HOP),
      multiplicador: 2.2 - 0.9 * sensibilidade,
      fracaoMaximo: 0.15 - 0.12 * sensibilidade,
      decaimentoMaximo: Math.exp(-HOP / sampleRate / 2),
      refratarioFrames: msParaFrames(intervaloMinimoMs, sampleRate),
    });
  }

  reiniciar(): void {
    this.enquadrador.reiniciar();
    this.espectroAnterior = null;
    this.pico.reiniciar();
    this.pisoRuido.reiniciar();
  }

  processar(amostras: Float32Array, frameInicial: number): ResultadoProcessamento {
    const resultado: ResultadoProcessamento = { onsets: [], diagnostico: [] };
    this.enquadrador.adicionar(amostras, frameInicial, (janela, inicio) => {
      const nivelDb = rmsDb(janela);
      const portaoDb = limiteDoPortao(this.pisoRuido.atualizar(nivelDb, this.duracaoHopSeg), this.sensibilidade);
      for (let i = 0; i < TAMANHO; i++) {
        this.re[i] = janela[i] * this.janela[i];
        this.im[i] = 0;
      }
      this.fft.transformar(this.re, this.im);

      const espectro = new Float64Array(TAMANHO / 2);
      for (let k = this.binMinimo; k < TAMANHO / 2; k++) {
        const magnitude = Math.hypot(this.re[k], this.im[k]) * this.normalizacao;
        espectro[k] = Math.log1p(GAMA * magnitude);
      }

      let flux = 0;
      if (this.espectroAnterior) {
        for (let k = this.binMinimo; k < TAMANHO / 2; k++) {
          const diferenca = espectro[k] - this.espectroAnterior[k];
          if (diferenca > 0) flux += diferenca;
        }
        flux /= TAMANHO / 2 - this.binMinimo;
      }
      this.espectroAnterior = espectro;

      const frame = inicio + ATRASO_FRAMES;
      const { onset, limiar } = this.pico.empurrar(flux, frame, nivelDb > portaoDb);
      if (onset !== null) resultado.onsets.push(onset);
      resultado.diagnostico.push({ frame, valor: flux, limiar });
    });
    return resultado;
  }
}
