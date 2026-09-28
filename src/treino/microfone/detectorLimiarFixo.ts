const HISTERESE_DB = 6;

/**
 * Opção 1: a abordagem mais ingênua. Recebe o volume (RMS em dB) lido do AnalyserNode a cada frame
 * da tela e dispara quando cruza um limiar fixo para cima. O tempo do toque é o do frame em que
 * foi percebido, então a precisão depende da taxa de atualização da tela.
 */
export class DetectorLimiarFixo {
  readonly limiarDb: number;
  private readonly intervaloMinimoMs: number;
  private armado = true;
  private ultimoOnsetMs = -Infinity;

  constructor(sensibilidade: number, intervaloMinimoMs: number) {
    this.limiarDb = -20 - 30 * sensibilidade;
    this.intervaloMinimoMs = intervaloMinimoMs;
  }

  reiniciar(): void {
    this.armado = true;
    this.ultimoOnsetMs = -Infinity;
  }

  avaliar(nivelDb: number, tempoMs: number): boolean {
    if (!this.armado && nivelDb < this.limiarDb - HISTERESE_DB) this.armado = true;
    if (this.armado && nivelDb > this.limiarDb && tempoMs - this.ultimoOnsetMs >= this.intervaloMinimoMs) {
      this.armado = false;
      this.ultimoOnsetMs = tempoMs;
      return true;
    }
    return false;
  }
}
