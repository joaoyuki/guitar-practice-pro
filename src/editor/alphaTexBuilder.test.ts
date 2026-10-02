import { describe, expect, it } from 'vitest';
import { converterBeat, converterCompasso, converterNota, paraAlphaTex } from './alphaTexBuilder';
import type { Nota } from './types';

describe('converterNota', () => {
  it('converte uma nota normal em casa.corda', () => {
    const nota: Nota = { corda: 6, casa: 0, duracao: 4 };
    expect(converterNota(nota)).toBe('0.6');
  });

  it('converte uma pausa em "r"', () => {
    const nota: Nota = { corda: 6, casa: 'r', duracao: 4 };
    expect(converterNota(nota)).toBe('r');
  });
});

describe('converterBeat', () => {
  it('junta nota e duração', () => {
    const nota: Nota = { corda: 6, casa: 0, duracao: 4 };
    expect(converterBeat(nota)).toBe('0.6.4');
  });

  it('adiciona {d} em notas pontuadas', () => {
    const nota: Nota = { corda: 6, casa: 0, duracao: 4, pontuada: true };
    expect(converterBeat(nota)).toBe('0.6.4{d}');
  });

  it('adiciona {tu 3} em notas de tercina e combina com ponto', () => {
    expect(converterBeat({ corda: 6, casa: 0, duracao: 8, tercina: true })).toBe('0.6.8{tu 3}');
    expect(converterBeat({ corda: 6, casa: 0, duracao: 8, pontuada: true, tercina: true })).toBe('0.6.8{d tu 3}');
  });

  it('converte uma pausa em r.duração', () => {
    const nota: Nota = { corda: 6, casa: 'r', duracao: 4 };
    expect(converterBeat(nota)).toBe('r.4');
  });
});

describe('converterCompasso', () => {
  it('junta os beats do compasso com espaço', () => {
    const compasso = {
      notas: [
        { corda: 6, casa: 0, duracao: 4 } satisfies Nota,
        { corda: 5, casa: 1, duracao: 4 } satisfies Nota,
        { corda: 4, casa: 3, duracao: 8 } satisfies Nota,
      ],
    };
    expect(converterCompasso(compasso)).toBe('0.6.4 1.5.4 3.4.8');
  });
});

describe('paraAlphaTex', () => {
  it('monta o cabeçalho e os compassos separados por " |\\n"', () => {
    const exercicio = {
      bpm: 120,
      formula: [4, 4] as [number, number],
      compassos: [
        { notas: [{ corda: 6, casa: 0, duracao: 4 } satisfies Nota] },
        { notas: [{ corda: 5, casa: 1, duracao: 4 } satisfies Nota] },
      ],
    };
    expect(paraAlphaTex(exercicio)).toBe('\\tempo 120\n\\ts 4 4\n.\n0.6.4 |\n1.5.4');
  });
});
