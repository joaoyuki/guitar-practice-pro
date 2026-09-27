import { describe, expect, it } from 'vitest';
import { nomeArquivoExercicio, serializarExercicio, validarExercicio } from './exercicioArquivo';
import type { Exercicio } from './types';

const exercicioValido: Exercicio = {
  bpm: 120,
  formula: [4, 4],
  compassos: [{ notas: [{ corda: 6, casa: 0, duracao: 4 }] }],
};

describe('validarExercicio', () => {
  it('aceita um exercício válido', () => {
    const resultado = validarExercicio(exercicioValido);
    expect(resultado).toEqual({ valido: true, exercicio: exercicioValido });
  });

  it('faz o round-trip pela serialização', () => {
    const resultado = validarExercicio(JSON.parse(serializarExercicio(exercicioValido)));
    expect(resultado).toEqual({ valido: true, exercicio: exercicioValido });
  });

  it('aceita nota pontuada e pausa', () => {
    const exercicio: Exercicio = {
      bpm: 90,
      formula: [3, 4],
      compassos: [{ notas: [{ corda: 1, casa: 'r', duracao: 8 }, { corda: 2, casa: 5, duracao: 2, pontuada: true }] }],
    };
    expect(validarExercicio(exercicio)).toEqual({ valido: true, exercicio });
  });

  it('rejeita entrada que não é um objeto', () => {
    const resultado = validarExercicio('não é um exercício');
    expect(resultado.valido).toBe(false);
  });

  it('rejeita entrada nula', () => {
    expect(validarExercicio(null).valido).toBe(false);
  });

  it('rejeita bpm fora do intervalo', () => {
    const resultado = validarExercicio({ ...exercicioValido, bpm: 1000 });
    expect(resultado.valido).toBe(false);
  });

  it('rejeita bpm não numérico', () => {
    const resultado = validarExercicio({ ...exercicioValido, bpm: '120' });
    expect(resultado.valido).toBe(false);
  });

  it('rejeita fórmula de compasso com tamanho errado', () => {
    const resultado = validarExercicio({ ...exercicioValido, formula: [4] });
    expect(resultado.valido).toBe(false);
  });

  it('rejeita lista de compassos vazia', () => {
    const resultado = validarExercicio({ ...exercicioValido, compassos: [] });
    expect(resultado.valido).toBe(false);
  });

  it('rejeita compasso sem notas', () => {
    const resultado = validarExercicio({ ...exercicioValido, compassos: [{ notas: [] }] });
    expect(resultado.valido).toBe(false);
  });

  it('rejeita corda fora do intervalo 1-6', () => {
    const resultado = validarExercicio({
      ...exercicioValido,
      compassos: [{ notas: [{ corda: 7, casa: 0, duracao: 4 }] }],
    });
    expect(resultado.valido).toBe(false);
  });

  it('rejeita casa que não é número nem "r"', () => {
    const resultado = validarExercicio({
      ...exercicioValido,
      compassos: [{ notas: [{ corda: 6, casa: 'x', duracao: 4 }] }],
    });
    expect(resultado.valido).toBe(false);
  });

  it('rejeita duração fora do conjunto permitido', () => {
    const resultado = validarExercicio({
      ...exercicioValido,
      compassos: [{ notas: [{ corda: 6, casa: 0, duracao: 3 }] }],
    });
    expect(resultado.valido).toBe(false);
  });

  it('ignora campos desconhecidos e não os propaga para o exercício validado', () => {
    const resultado = validarExercicio({ ...exercicioValido, campoMalicioso: '<script>alert(1)</script>' });
    expect(resultado).toEqual({ valido: true, exercicio: exercicioValido });
    if (resultado.valido) {
      expect(resultado.exercicio).not.toHaveProperty('campoMalicioso');
    }
  });

  it('não deixa __proto__ vindo do JSON poluir o objeto validado', () => {
    const dados = JSON.parse('{"bpm":120,"formula":[4,4],"compassos":[{"notas":[{"corda":6,"casa":0,"duracao":4}]}],"__proto__":{"poluido":true}}');
    const resultado = validarExercicio(dados);
    expect(resultado.valido).toBe(true);
    expect((resultado as { exercicio: Exercicio }).exercicio).not.toHaveProperty('poluido');
    expect(({} as Record<string, unknown>).poluido).toBeUndefined();
  });
});

describe('nomeArquivoExercicio', () => {
  it('gera um nome de arquivo .json', () => {
    expect(nomeArquivoExercicio()).toMatch(/^exercicio-.*\.json$/);
  });
});
