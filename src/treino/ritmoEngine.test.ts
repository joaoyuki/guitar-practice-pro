import { describe, expect, it } from 'vitest';
import type { Exercicio } from '../editor/types';
import {
  avaliarExecucao,
  calcularDuracaoTotalMs,
  calcularTemposEsperados,
  duracaoParaBeats,
  resumirExecucao,
} from './ritmoEngine';

describe('duracaoParaBeats', () => {
  it('converte semínima em 1 beat', () => {
    expect(duracaoParaBeats(4)).toBe(1);
  });

  it('converte mínima em 2 beats', () => {
    expect(duracaoParaBeats(2)).toBe(2);
  });

  it('aplica o acréscimo de nota pontuada', () => {
    expect(duracaoParaBeats(4, true)).toBe(1.5);
  });
});

describe('calcularTemposEsperados', () => {
  const exercicio: Exercicio = {
    bpm: 60,
    formula: [4, 4],
    compassos: [
      {
        notas: [
          { corda: 6, casa: 0, duracao: 4 },
          { corda: 6, casa: 0, duracao: 4 },
          { corda: 6, casa: 'r', duracao: 4 },
          { corda: 6, casa: 0, duracao: 4 },
        ],
      },
    ],
  };

  it('a 60bpm cada semínima dura 1000ms e pausas são ignoradas', () => {
    const esperados = calcularTemposEsperados(exercicio);
    expect(esperados).toEqual([
      { compassoIndex: 0, notaIndex: 0, tempoMs: 0 },
      { compassoIndex: 0, notaIndex: 1, tempoMs: 1000 },
      { compassoIndex: 0, notaIndex: 3, tempoMs: 3000 },
    ]);
  });

  it('calcularDuracaoTotalMs soma todas as notas incluindo pausas', () => {
    expect(calcularDuracaoTotalMs(exercicio)).toBe(4000);
  });
});

describe('avaliarExecucao', () => {
  const esperados = calcularTemposEsperados({
    bpm: 60,
    formula: [4, 4],
    compassos: [{ notas: [{ corda: 6, casa: 0, duracao: 4 }, { corda: 6, casa: 0, duracao: 4 }] }],
  });

  it('classifica tentativa exata como perfeito', () => {
    const [resultado] = avaliarExecucao([esperados[0]], [0]);
    expect(resultado.classificacao).toBe('perfeito');
    expect(resultado.desvioMs).toBe(0);
  });

  it('classifica pequeno desvio como bom', () => {
    const [resultado] = avaliarExecucao([esperados[0]], [70]);
    expect(resultado.classificacao).toBe('bom');
    expect(resultado.desvioMs).toBe(70);
  });

  it('marca como faltou quando não há tentativa próxima', () => {
    const [resultado] = avaliarExecucao([esperados[0]], [500]);
    expect(resultado.classificacao).toBe('faltou');
    expect(resultado.desvioMs).toBeNull();
  });

  it('não reaproveita a mesma tentativa para duas notas', () => {
    const resultados = avaliarExecucao(esperados, [10]);
    const comTentativa = resultados.filter((r) => r.classificacao !== 'faltou');
    expect(comTentativa).toHaveLength(1);
    expect(comTentativa[0].notaIndex).toBe(0);
  });
});

describe('resumirExecucao', () => {
  it('calcula percentual de acerto e desvio médio', () => {
    const resumo = resumirExecucao([
      { compassoIndex: 0, notaIndex: 0, tempoMs: 0, classificacao: 'perfeito', desvioMs: 10 },
      { compassoIndex: 0, notaIndex: 1, tempoMs: 1000, classificacao: 'bom', desvioMs: -70 },
      { compassoIndex: 0, notaIndex: 2, tempoMs: 2000, classificacao: 'faltou', desvioMs: null },
    ]);

    expect(resumo.total).toBe(3);
    expect(resumo.perfeitos).toBe(1);
    expect(resumo.bons).toBe(1);
    expect(resumo.faltaram).toBe(1);
    expect(resumo.acertoPercentual).toBeCloseTo((2 / 3) * 100);
    expect(resumo.desvioMedioMs).toBeCloseTo(40);
  });
});
