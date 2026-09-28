/** FFT radix-2 iterativa, in-place. Pré-calcula senos/cossenos e a permutação de bits para o tamanho informado. */
export class FFT {
  readonly tamanho: number;
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly reverso: Uint32Array;

  constructor(tamanho: number) {
    if (tamanho < 2 || (tamanho & (tamanho - 1)) !== 0) {
      throw new Error(`Tamanho da FFT precisa ser potência de 2 (recebido ${tamanho})`);
    }
    this.tamanho = tamanho;
    this.cos = new Float64Array(tamanho / 2);
    this.sin = new Float64Array(tamanho / 2);
    for (let k = 0; k < tamanho / 2; k++) {
      this.cos[k] = Math.cos((2 * Math.PI * k) / tamanho);
      this.sin[k] = Math.sin((2 * Math.PI * k) / tamanho);
    }

    const bits = Math.log2(tamanho);
    this.reverso = new Uint32Array(tamanho);
    for (let i = 0; i < tamanho; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r = (r << 1) | ((i >> b) & 1);
      this.reverso[i] = r;
    }
  }

  transformar(re: Float64Array, im: Float64Array): void {
    const n = this.tamanho;
    for (let i = 0; i < n; i++) {
      const j = this.reverso[i];
      if (j > i) {
        [re[i], re[j]] = [re[j], re[i]];
        [im[i], im[j]] = [im[j], im[i]];
      }
    }

    for (let tamanhoBloco = 2; tamanhoBloco <= n; tamanhoBloco *= 2) {
      const metade = tamanhoBloco / 2;
      const passo = n / tamanhoBloco;
      for (let inicio = 0; inicio < n; inicio += tamanhoBloco) {
        for (let j = 0; j < metade; j++) {
          const wr = this.cos[j * passo];
          const wi = -this.sin[j * passo];
          const a = inicio + j;
          const b = a + metade;
          const tr = re[b] * wr - im[b] * wi;
          const ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
  }
}

export function janelaHann(tamanho: number): Float64Array {
  const janela = new Float64Array(tamanho);
  for (let i = 0; i < tamanho; i++) {
    janela[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / tamanho);
  }
  return janela;
}
