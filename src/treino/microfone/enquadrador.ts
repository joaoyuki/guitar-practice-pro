/**
 * Recebe blocos de amostras de tamanho arbitrário e entrega janelas de `tamanho` amostras,
 * avançando `hop` amostras a cada janela. Se chegar um bloco que não continua o anterior
 * (buraco na captura), descarta o que estava pendente e recomeça.
 */
export class Enquadrador {
  private pendente = new Float32Array(0);
  private framePendente = 0;
  readonly tamanho: number;
  readonly hop: number;

  constructor(tamanho: number, hop: number) {
    this.tamanho = tamanho;
    this.hop = hop;
  }

  reiniciar(): void {
    this.pendente = new Float32Array(0);
  }

  adicionar(
    amostras: Float32Array,
    frameInicial: number,
    aoJanela: (janela: Float32Array, frameInicio: number) => void,
  ): void {
    if (this.pendente.length === 0 || frameInicial !== this.framePendente + this.pendente.length) {
      this.pendente = new Float32Array(0);
      this.framePendente = frameInicial;
    }

    const juntas = new Float32Array(this.pendente.length + amostras.length);
    juntas.set(this.pendente);
    juntas.set(amostras, this.pendente.length);

    let posicao = 0;
    while (juntas.length - posicao >= this.tamanho) {
      aoJanela(juntas.slice(posicao, posicao + this.tamanho), this.framePendente + posicao);
      posicao += this.hop;
    }

    this.pendente = juntas.slice(posicao);
    this.framePendente += posicao;
  }
}
