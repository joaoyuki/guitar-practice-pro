import { describe, expect, it } from 'vitest';
import { validarExercicio } from '../editor/exercicioArquivo';
import type { Nota } from '../editor/types';
import { GRUPOS, MODOS, modoParaExercicio } from './figuras';

function tamanhoEmTempos(nota: Nota): number {
  const base = 4 / nota.duracao;
  const comPonto = nota.pontuada ? base * 1.5 : base;
  return nota.tercina ? (comPonto * 2) / 3 : comPonto;
}

describe('modoParaExercicio', () => {
  it('todos os modos dos grupos existem', () => {
    for (const grupo of GRUPOS) for (const modo of grupo.modes) expect(MODOS[modo]).toBeDefined();
  });

  for (const modo of Object.keys(MODOS)) {
    it(`${modo}: gera exercício válido com compassos completos`, () => {
      const exercicio = modoParaExercicio(modo);
      expect(validarExercicio(exercicio).valido).toBe(true);

      const [numerador, denominador] = exercicio.formula;
      const esperado = (numerador * 4) / denominador;
      for (const compasso of exercicio.compassos) {
        const soma = compasso.notas.reduce((total, nota) => total + tamanhoEmTempos(nota), 0);
        expect(soma).toBeCloseTo(esperado, 6);
      }
    });
  }
});
