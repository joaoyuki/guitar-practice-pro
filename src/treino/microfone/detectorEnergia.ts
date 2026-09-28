import { limiteDoPortao, PisoDeRuido } from './pisoDeRuido';
import { msParaFrames, type DetectorBlocos, type ParametrosDetector, type ResultadoProcessamento } from './tipos';

const HOP = 128;
const FREQUENCIA_CORTE_HZ = 2000;
const CONSTANTE_TEMPO_MEDIA_MS = 60;

/** Filtro biquad passa-alta (RBJ cookbook), processado amostra a amostra. */
class PassaAlta {
  private readonly b0: number;
  private readonly b1: number;
  private readonly b2: number;
  private readonly a1: number;
  private readonly a2: number;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(sampleRate: number, frequenciaHz: number, q = Math.SQRT1_2) {
    const w0 = (2 * Math.PI * frequenciaHz) / sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const cosW0 = Math.cos(w0);
    const a0 = 1 + alpha;
    this.b0 = (1 + cosW0) / 2 / a0;
    this.b1 = -(1 + cosW0) / a0;
    this.b2 = (1 + cosW0) / 2 / a0;
    this.a1 = (-2 * cosW0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  reiniciar(): void {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }

  filtrar(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/**
 * Opção 2: energia do sinal filtrado (só agudos, onde está o "clique" da palheta) em blocos de 128
 * amostras, comparada com uma média móvel em dB. Dispara quando a energia fica `limiarDb` acima da
 * média recente e só rearma quando ela volta a ficar perto da média.
 */
export class DetectorEnergia implements DetectorBlocos {
  private readonly filtro: PassaAlta;
  private readonly limiarDb: number;
  private readonly sensibilidade: number;
  private readonly duracaoHopSeg: number;
  private readonly pisoRuido = new PisoDeRuido();
  private readonly alfa: number;
  private readonly refratarioFrames: number;
  private readonly bloco = new Float32Array(HOP);
  private posicaoBloco = 0;
  private inicioBloco = 0;
  private proximoFrame = -1;
  private mediaDb: number | null = null;
  private armado = true;
  private ultimoOnset = -Infinity;

  constructor({ sampleRate, sensibilidade, intervaloMinimoMs }: ParametrosDetector) {
    this.filtro = new PassaAlta(sampleRate, FREQUENCIA_CORTE_HZ);
    this.limiarDb = 14 - 10 * sensibilidade;
    this.sensibilidade = sensibilidade;
    this.duracaoHopSeg = HOP / sampleRate;
    this.alfa = 1 - Math.exp(-(HOP / sampleRate) / (CONSTANTE_TEMPO_MEDIA_MS / 1000));
    this.refratarioFrames = msParaFrames(intervaloMinimoMs, sampleRate);
  }

  reiniciar(): void {
    this.filtro.reiniciar();
    this.posicaoBloco = 0;
    this.proximoFrame = -1;
    this.mediaDb = null;
    this.pisoRuido.reiniciar();
    this.armado = true;
    this.ultimoOnset = -Infinity;
  }

  processar(amostras: Float32Array, frameInicial: number): ResultadoProcessamento {
    const resultado: ResultadoProcessamento = { onsets: [], diagnostico: [] };
    if (frameInicial !== this.proximoFrame) {
      this.posicaoBloco = 0;
      this.inicioBloco = frameInicial;
    }

    for (let i = 0; i < amostras.length; i++) {
      this.bloco[this.posicaoBloco++] = this.filtro.filtrar(amostras[i]);
      if (this.posicaoBloco === HOP) {
        this.avaliarBloco(resultado);
        this.inicioBloco += HOP;
        this.posicaoBloco = 0;
      }
    }

    this.proximoFrame = frameInicial + amostras.length;
    return resultado;
  }

  private avaliarBloco(resultado: ResultadoProcessamento): void {
    let soma = 0;
    let pico = 0;
    for (let i = 0; i < HOP; i++) {
      const y = this.bloco[i];
      soma += y * y;
      pico = Math.max(pico, Math.abs(y));
    }
    const energiaDb = 10 * Math.log10(soma / HOP + 1e-12);
    const portaoDb = limiteDoPortao(this.pisoRuido.atualizar(energiaDb, this.duracaoHopSeg), this.sensibilidade);

    if (this.mediaDb === null) {
      this.mediaDb = energiaDb;
      return;
    }

    const acimaDaMedia = energiaDb - this.mediaDb;
    if (!this.armado && acimaDaMedia < this.limiarDb / 2) this.armado = true;

    if (
      this.armado &&
      acimaDaMedia > this.limiarDb &&
      energiaDb > portaoDb &&
      this.inicioBloco - this.ultimoOnset >= this.refratarioFrames
    ) {
      // Refina dentro do bloco: primeira amostra que chega à metade do pico.
      let deslocamento = 0;
      while (deslocamento < HOP - 1 && Math.abs(this.bloco[deslocamento]) < pico / 2) deslocamento++;
      const frame = this.inicioBloco + deslocamento;
      resultado.onsets.push(frame);
      this.ultimoOnset = frame;
      this.armado = false;
    }

    resultado.diagnostico.push({
      frame: this.inicioBloco,
      valor: energiaDb,
      limiar: Math.max(this.mediaDb + this.limiarDb, portaoDb),
    });
    this.mediaDb += this.alfa * (energiaDb - this.mediaDb);
  }
}
