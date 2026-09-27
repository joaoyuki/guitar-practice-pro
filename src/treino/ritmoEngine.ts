import type { Duracao, Exercicio, Nota } from '../editor/types';

export interface TempoEsperado {
  compassoIndex: number;
  notaIndex: number;
  tempoMs: number;
}

export type Classificacao = 'perfeito' | 'bom' | 'faltou';

export interface ResultadoNota extends TempoEsperado {
  classificacao: Classificacao;
  desvioMs: number | null; // null quando faltou (nenhuma tentativa associada)
}

export const TOLERANCIA_PERFEITO_MS = 40;
export const TOLERANCIA_BOM_MS = 90;
export const JANELA_MAXIMA_MS = 150;

export function duracaoParaBeats(duracao: Duracao, pontuada = false): number {
  const beats = 4 / duracao;
  return pontuada ? beats * 1.5 : beats;
}

/** Calcula, em milissegundos desde o início do exercício, o instante esperado de cada nota (pausas são ignoradas). */
export function calcularTemposEsperados(exercicio: Exercicio): TempoEsperado[] {
  const msPorBeat = 60000 / exercicio.bpm;
  const esperados: TempoEsperado[] = [];
  let tempoAcumuladoMs = 0;

  exercicio.compassos.forEach((compasso, compassoIndex) => {
    compasso.notas.forEach((nota: Nota, notaIndex) => {
      if (nota.casa !== 'r') {
        esperados.push({ compassoIndex, notaIndex, tempoMs: tempoAcumuladoMs });
      }
      tempoAcumuladoMs += duracaoParaBeats(nota.duracao, nota.pontuada) * msPorBeat;
    });
  });

  return esperados;
}

/** Duração total do exercício em milissegundos. */
export function calcularDuracaoTotalMs(exercicio: Exercicio): number {
  const msPorBeat = 60000 / exercicio.bpm;
  return exercicio.compassos.reduce(
    (total, compasso) =>
      total +
      compasso.notas.reduce(
        (soma, nota) => soma + duracaoParaBeats(nota.duracao, nota.pontuada) * msPorBeat,
        0,
      ),
    0,
  );
}

function classificar(desvioMs: number): Classificacao {
  const absoluto = Math.abs(desvioMs);
  if (absoluto <= TOLERANCIA_PERFEITO_MS) return 'perfeito';
  return 'bom';
}

/**
 * Casa cada tempo esperado com a tentativa (timestamp em ms) mais próxima dentro da janela
 * máxima, sem reaproveitar a mesma tentativa duas vezes. Tentativas sem par correspondente
 * (ex.: espaço apertado fora do tempo de qualquer nota) são ignoradas.
 */
export function avaliarExecucao(esperados: TempoEsperado[], tentativasMs: number[]): ResultadoNota[] {
  const disponiveis = [...tentativasMs].sort((a, b) => a - b);
  const usadas = new Array(disponiveis.length).fill(false);

  return esperados.map((esperado) => {
    let melhorIndice = -1;
    let menorDistancia = Infinity;

    disponiveis.forEach((tentativa, indice) => {
      if (usadas[indice]) return;
      const distancia = Math.abs(tentativa - esperado.tempoMs);
      if (distancia < menorDistancia && distancia <= JANELA_MAXIMA_MS) {
        menorDistancia = distancia;
        melhorIndice = indice;
      }
    });

    if (melhorIndice === -1) {
      return { ...esperado, classificacao: 'faltou', desvioMs: null };
    }

    usadas[melhorIndice] = true;
    const desvioMs = disponiveis[melhorIndice] - esperado.tempoMs;
    return { ...esperado, classificacao: classificar(desvioMs), desvioMs };
  });
}

export interface ResumoExecucao {
  total: number;
  perfeitos: number;
  bons: number;
  faltaram: number;
  acertoPercentual: number;
  desvioMedioMs: number | null;
}

export function resumirExecucao(resultados: ResultadoNota[]): ResumoExecucao {
  const total = resultados.length;
  const perfeitos = resultados.filter((r) => r.classificacao === 'perfeito').length;
  const bons = resultados.filter((r) => r.classificacao === 'bom').length;
  const faltaram = resultados.filter((r) => r.classificacao === 'faltou').length;
  const desvios = resultados
    .map((r) => r.desvioMs)
    .filter((desvio): desvio is number => desvio !== null);
  const desvioMedioMs =
    desvios.length > 0 ? desvios.reduce((soma, desvio) => soma + Math.abs(desvio), 0) / desvios.length : null;

  return {
    total,
    perfeitos,
    bons,
    faltaram,
    acertoPercentual: total > 0 ? ((perfeitos + bons) / total) * 100 : 0,
    desvioMedioMs,
  };
}
