export type Duracao = 1 | 2 | 4 | 8 | 16 | 32 | 64; // 1=semibreve, 2=mínima, 4=semínima...

export interface Nota {
  corda: number; // 1 a 6
  casa: number | 'r'; // 'r' = pausa
  duracao: Duracao;
  pontuada?: boolean;
  tercina?: boolean; // 3 notas no tempo de 2 da mesma figura
}

export interface Compasso {
  notas: Nota[];
}

export interface Exercicio {
  bpm: number;
  formula: [number, number]; // ex: [4, 4]
  compassos: Compasso[];
}
