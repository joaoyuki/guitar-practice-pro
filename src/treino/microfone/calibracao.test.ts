import { describe, expect, it } from 'vitest';
import { calcularCompensacao } from './calibracao';
import { RelogioAudio } from './relogioAudio';

describe('calcularCompensacao', () => {
  const cliques = [0, 750, 1500, 2250, 3000, 3750, 4500, 5250];

  it('usa a mediana do atraso entre clique e toque', () => {
    const atrasos = [40, 45, 38, 42, 44, 41, 39, 120];
    const toques = cliques.map((c, i) => c + atrasos[i]);
    const resultado = calcularCompensacao(cliques, toques);
    expect(resultado).toMatchObject({ compensacaoMs: 42, pares: 8, total: 8 });
    expect(resultado!.variacaoMs).toBeLessThanOrEqual(3);
  });

  it('ignora toques extras e fora da janela', () => {
    const toques = [...cliques.map((c) => c + 30), 400, 1100, 9000];
    expect(calcularCompensacao(cliques, toques)?.compensacaoMs).toBe(30);
  });

  it('retorna null quando há poucas batidas pareadas', () => {
    expect(calcularCompensacao(cliques, [30, 780, 1530])).toBeNull();
  });
});

describe('RelogioAudio', () => {
  it('usa o menor offset recente, já que o currentTime lido na thread principal chega atrasado', () => {
    const relogio = new RelogioAudio();
    relogio.registrar(1000, 0.5); // offset 500
    relogio.registrar(1010, 0.508); // offset 502 (currentTime ainda não tinha atualizado)
    expect(relogio.paraPerfMs(1)).toBe(1500);
  });

  it('descarta leituras antigas para acompanhar a deriva entre os relógios', () => {
    const relogio = new RelogioAudio();
    relogio.registrar(0, 0); // offset 0
    relogio.registrar(5000, 4.99); // offset 10
    expect(relogio.paraPerfMs(5)).toBe(5010);
  });
});
