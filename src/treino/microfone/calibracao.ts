export const MINIMO_PARES_CALIBRACAO = 5;
const JANELA_PAREAMENTO_MS = 250;

export interface ResultadoCalibracao {
  compensacaoMs: number;
  pares: number;
  total: number;
  /** Desvio absoluto mediano em torno da compensação: quanto a pessoa/detector variou entre batidas. */
  variacaoMs: number;
}

function mediana(valores: number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 0 ? (ordenados[meio - 1] + ordenados[meio]) / 2 : ordenados[meio];
}

/**
 * Casa cada clique com o toque detectado mais próximo (sem reaproveitar toques) e usa a mediana
 * das diferenças como compensação. A mediana ignora uma ou outra batida muito fora.
 */
export function calcularCompensacao(cliquesMs: number[], toquesMs: number[]): ResultadoCalibracao | null {
  const usados = new Set<number>();
  const diferencas: number[] = [];

  for (const clique of cliquesMs) {
    let melhor = -1;
    let menorDistancia = Infinity;
    toquesMs.forEach((toque, indice) => {
      const distancia = Math.abs(toque - clique);
      if (!usados.has(indice) && distancia < menorDistancia && distancia <= JANELA_PAREAMENTO_MS) {
        melhor = indice;
        menorDistancia = distancia;
      }
    });
    if (melhor !== -1) {
      usados.add(melhor);
      diferencas.push(toquesMs[melhor] - clique);
    }
  }

  if (diferencas.length < MINIMO_PARES_CALIBRACAO) return null;
  const compensacaoMs = mediana(diferencas);
  return {
    compensacaoMs: Math.round(compensacaoMs),
    pares: diferencas.length,
    total: cliquesMs.length,
    variacaoMs: Math.round(mediana(diferencas.map((d) => Math.abs(d - compensacaoMs)))),
  };
}
