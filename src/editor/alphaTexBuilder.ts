import type { Compasso, Exercicio, Nota } from './types';

export function converterNota(nota: Nota): string {
  if (nota.casa === 'r') return 'r';
  return `${nota.casa}.${nota.corda}`;
}

export function converterBeat(nota: Nota): string {
  const beat = `${converterNota(nota)}.${nota.duracao}`;
  return nota.pontuada ? `${beat}{d}` : beat;
}

export function converterCompasso(compasso: Compasso): string {
  return compasso.notas.map(converterBeat).join(' ');
}

export function paraAlphaTex(exercicio: Exercicio): string {
  const [numerador, denominador] = exercicio.formula;
  const cabecalho = `\\tempo ${exercicio.bpm}\n\\ts ${numerador} ${denominador}\n.\n`;
  const corpo = exercicio.compassos.map(converterCompasso).join(' |\n');
  return cabecalho + corpo;
}
