import type * as alphaTab from '@coderline/alphatab';

/** Encontra o Beat do alphaTab correspondente a uma nota do exercício (mesma ordem de índices usada no alphaTexBuilder). */
export function obterBeat(
  score: alphaTab.model.Score,
  compassoIndex: number,
  notaIndex: number,
): alphaTab.model.Beat | null {
  const bar = score.tracks[0]?.staves[0]?.bars[compassoIndex];
  const beat = bar?.voices[0]?.beats[notaIndex];
  return beat ?? null;
}
