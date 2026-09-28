const JANELA_MS = 2000;

/**
 * Converte tempo do AudioContext (segundos) para o relógio de `performance.now()` (ms).
 * A cada leitura registra `performance.now() - currentTime`. Como o `currentTime` visto na thread
 * principal só atualiza em saltos (fica "atrasado"), o menor offset da janela recente é a melhor
 * estimativa. Usar só os últimos segundos acompanha a pequena deriva entre os dois relógios.
 */
export class RelogioAudio {
  private leituras: { perfMs: number; offsetMs: number }[] = [];

  registrar(perfMs: number, contextTimeSeg: number): void {
    this.leituras.push({ perfMs, offsetMs: perfMs - contextTimeSeg * 1000 });
    while (this.leituras.length > 1 && perfMs - this.leituras[0].perfMs > JANELA_MS) {
      this.leituras.shift();
    }
  }

  paraPerfMs(contextTimeSeg: number): number {
    let menorOffset = Infinity;
    for (const leitura of this.leituras) menorOffset = Math.min(menorOffset, leitura.offsetMs);
    return (Number.isFinite(menorOffset) ? menorOffset : 0) + contextTimeSeg * 1000;
  }
}
