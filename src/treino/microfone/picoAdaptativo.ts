export interface OpcoesPicoAdaptativo {
  /** Quantos valores passados entram na média usada como limiar. */
  tamanhoHistorico: number;
  /** O pico precisa ser `multiplicador` vezes maior que a média recente. */
  multiplicador: number;
  /** Parcela do maior valor recente somada ao limiar, para ignorar picos pequenos de ruído. */
  fracaoMaximo: number;
  /** Quanto o "maior valor recente" decai a cada valor recebido (ex.: 0.995). */
  decaimentoMaximo: number;
  refratarioFrames: number;
}

interface Candidato {
  valor: number;
  frame: number;
  limiar: number;
  habilitado: boolean;
}

/**
 * Peak picking causal sobre uma função de detecção (ex.: spectral flux): um ataque é o ponto que
 * é máximo local, fica acima da média recente multiplicada e respeita o período refratário.
 * Introduz o atraso de um valor, porque só dá para saber que era um pico quando o seguinte chega.
 */
export class PicoAdaptativo {
  private historico: number[] = [];
  private candidato: Candidato | null = null;
  private valorAntesDoCandidato = -Infinity;
  private maximoRecente = 0;
  private ultimoOnset = -Infinity;
  private readonly opcoes: OpcoesPicoAdaptativo;

  constructor(opcoes: OpcoesPicoAdaptativo) {
    this.opcoes = opcoes;
  }

  reiniciar(): void {
    this.historico = [];
    this.candidato = null;
    this.valorAntesDoCandidato = -Infinity;
    this.maximoRecente = 0;
    this.ultimoOnset = -Infinity;
  }

  /** `habilitado = false` permite atualizar o histórico sem deixar o valor virar ataque (ex.: abaixo do noise gate). */
  empurrar(valor: number, frame: number, habilitado = true): { onset: number | null; limiar: number } {
    const { tamanhoHistorico, multiplicador, fracaoMaximo, decaimentoMaximo, refratarioFrames } = this.opcoes;
    const media =
      this.historico.length > 0 ? this.historico.reduce((soma, v) => soma + v, 0) / this.historico.length : Infinity;
    const limiar = media * multiplicador + this.maximoRecente * fracaoMaximo;

    let onset: number | null = null;
    const c = this.candidato;
    if (
      c &&
      // O ataque pode estar no começo da janela do pico: vale o portão dela ou o da janela seguinte.
      (c.habilitado || habilitado) &&
      c.valor > this.valorAntesDoCandidato &&
      c.valor >= valor &&
      c.valor > c.limiar &&
      c.frame - this.ultimoOnset >= refratarioFrames
    ) {
      onset = c.frame;
      this.ultimoOnset = c.frame;
    }

    this.valorAntesDoCandidato = c ? c.valor : -Infinity;
    this.candidato = { valor, frame, limiar, habilitado };
    this.historico.push(valor);
    if (this.historico.length > tamanhoHistorico) this.historico.shift();
    this.maximoRecente = Math.max(valor, this.maximoRecente * decaimentoMaximo);

    return { onset, limiar: Number.isFinite(limiar) ? limiar : valor };
  }
}
