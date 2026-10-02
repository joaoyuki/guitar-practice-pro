import type { Compasso, Duracao, Exercicio, Nota } from '../editor/types';

// Unidades: 100 = um tempo (semínima). `at` e `len` são posições/durações dentro do padrão.
export interface NotaRitmo {
  at: number;
  len: number;
  label: string;
  rest?: boolean;
  tercina?: boolean;
}

export interface Ciclo {
  name: string;
  L: number; // duração do padrão
  tickStep?: number | null; // null = só marca onde as notas tocam
  notes: NotaRitmo[];
}

export interface Modo {
  label: string;
  seq: string[]; // ciclos tocados em sequência
  desc: string;
}

export interface Grupo {
  id: string;
  label: string;
  modes: string[];
}

const N = (at: number, len: number, label: string): NotaRitmo => ({ at, len, label });
const R = (at: number, len: number, label = 'pausa'): NotaRitmo => ({ at, len, label, rest: true });
const tercina = (count: number, label: string): NotaRitmo[] =>
  Array.from({ length: count }, (_, i) => ({ ...N((i * 100) / count, 100 / count, label), tercina: true }));

export const CICLOS: Record<string, Ciclo> = {
  A: { name: 'Duas colcheias', L: 100, notes: [N(0, 50, 'colcheia'), N(50, 50, 'colcheia')] },
  B: { name: 'Colcheia pontuada + semicolcheia', L: 100, notes: [N(0, 75, 'colcheia pontuada'), N(75, 25, 'semicolcheia')] },

  SM: { name: 'Semínima', L: 100, notes: [N(0, 100, 'semínima')] },
  SC: { name: 'Semínima – colcheia', L: 150, notes: [N(0, 100, 'semínima'), N(100, 50, 'colcheia')] },
  CS: { name: 'Colcheia – semínima', L: 150, notes: [N(0, 50, 'colcheia'), N(50, 100, 'semínima')] },
  PP: {
    name: 'Semínima pontuada – semínima pontuada',
    L: 300,
    notes: [N(0, 150, 'semínima pontuada'), N(150, 150, 'semínima pontuada')],
  },

  S4: { name: '4 semicolcheias', L: 100, notes: [N(0, 25, 'semi'), N(25, 25, 'semi'), N(50, 25, 'semi'), N(75, 25, 'semi')] },
  C22: { name: 'Colcheia + 2 semicolcheias', L: 100, notes: [N(0, 50, 'colcheia'), N(50, 25, 'semi'), N(75, 25, 'semi')] },
  S2C: { name: '2 semicolcheias + colcheia', L: 100, notes: [N(0, 25, 'semi'), N(25, 25, 'semi'), N(50, 50, 'colcheia')] },
  SCS: {
    name: 'Semicolcheia – colcheia – semicolcheia',
    L: 100,
    notes: [N(0, 25, 'semi'), N(25, 50, 'colcheia'), N(75, 25, 'semi')],
  },
  SP: { name: 'Semicolcheia + colcheia pontuada', L: 100, notes: [N(0, 25, 'semi'), N(25, 75, 'colcheia pontuada')] },

  CSC: {
    name: 'Colcheia – semínima – colcheia',
    L: 200,
    notes: [N(0, 50, 'colcheia'), N(50, 100, 'semínima'), N(150, 50, 'colcheia')],
  },
  PC: { name: 'Semínima pontuada – colcheia', L: 200, notes: [N(0, 150, 'semínima pontuada'), N(150, 50, 'colcheia')] },
  TRE: {
    name: 'Tresillo (3-3-2)',
    L: 400,
    notes: [N(0, 150, 'semínima pontuada'), N(150, 150, 'semínima pontuada'), N(300, 100, 'semínima')],
  },

  MIN: { name: 'Mínima', L: 200, notes: [N(0, 200, 'mínima')] },
  MINP: { name: 'Mínima pontuada', L: 300, notes: [N(0, 300, 'mínima pontuada')] },
  SB: { name: 'Semibreve', L: 400, notes: [N(0, 400, 'semibreve')] },

  RC: { name: 'Pausa de colcheia + colcheia', L: 100, notes: [R(0, 50, 'pausa de colcheia'), N(50, 50, 'colcheia')] },
  SR: { name: 'Semínima – pausa de semínima', L: 200, notes: [N(0, 100, 'semínima'), R(100, 100, 'pausa de semínima')] },
  RS3: {
    name: 'Pausa de semicolcheia + 3 semicolcheias',
    L: 100,
    notes: [R(0, 25, 'pausa'), N(25, 25, 'semi'), N(50, 25, 'semi'), N(75, 25, 'semi')],
  },

  T3: { name: 'Tercina de colcheias', L: 100, tickStep: null, notes: tercina(3, 'tercina') },
  T6: { name: 'Tercina de semicolcheias', L: 100, tickStep: null, notes: tercina(6, '') },
};

export const MODOS: Record<string, Modo> = {
  a: {
    label: 'Duas colcheias',
    seq: ['A'],
    desc: 'Duas colcheias dividem o tempo ao meio: tocam no 0 e no 50, cada uma com duração 50.',
  },
  b: {
    label: 'Colcheia pontuada + semicolcheia',
    seq: ['B'],
    desc: 'A colcheia pontuada dura 75 (50 + 25 do ponto) e a semicolcheia ocupa os 25 finais, tocando no 75.',
  },
  alt: {
    label: 'Alternar a cada tempo',
    seq: ['A', 'B'],
    desc: 'Um tempo de duas colcheias, outro de colcheia pontuada + semicolcheia. Treina a troca entre os dois ritmos.',
  },

  sm: {
    label: 'Semínima',
    seq: ['SM'],
    desc: 'A semínima vale um tempo inteiro: toca no 0 e dura até o 100, exatamente na próxima batida.',
  },
  sc: {
    label: 'Semínima – colcheia',
    seq: ['SC'],
    desc: 'A semínima dura 100 e a colcheia 50, somando 150 (um tempo e meio). A colcheia cai na batida (100) e o padrão recomeça no 150, que é o meio do tempo seguinte. Por isso o padrão fica deslocado em relação às batidas.',
  },
  cs: {
    label: 'Colcheia – semínima',
    seq: ['CS'],
    desc: 'Colcheia no 0 (dura 50) e semínima no 50, no contratempo, durando até o 150. Também soma um tempo e meio, então o padrão fica deslocado em relação às batidas.',
  },
  pp: {
    label: 'Semínima pontuada – semínima pontuada',
    seq: ['PP'],
    desc: 'Cada semínima pontuada dura 150 (100 da semínima + 50 do ponto). As duas somam 300, ou seja, três tempos. A segunda nota toca no 150, no meio do segundo tempo.',
  },

  s4: {
    label: '4 semicolcheias',
    seq: ['S4'],
    desc: 'Quatro semicolcheias dividem o tempo em partes iguais: 0, 25, 50 e 75. É a base de todas as combinações de semicolcheia e colcheia.',
  },
  c22: {
    label: 'Colcheia + 2 semicolcheias',
    seq: ['C22'],
    desc: 'Colcheia no 0 (dura 50) e duas semicolcheias, no 50 e no 75. A segunda metade do tempo fica mais rápida.',
  },
  s2c: {
    label: '2 semicolcheias + colcheia',
    seq: ['S2C'],
    desc: 'Duas semicolcheias no 0 e no 25 e depois a colcheia no 50. Agora a primeira metade do tempo é a mais rápida.',
  },
  scs: {
    label: 'Semicolcheia – colcheia – semicolcheia',
    seq: ['SCS'],
    desc: 'A colcheia (de 25 a 75) fica no meio, entre duas semicolcheias (0 e 75). Dá uma sensação de balanço.',
  },
  sp: {
    label: 'Semicolcheia + colcheia pontuada',
    seq: ['SP'],
    desc: 'Semicolcheia no 0 e colcheia pontuada no 25, durando até o 100. É o inverso do ritmo mais conhecido: a nota longa chega no 25, fora da batida.',
  },

  csc: {
    label: 'Colcheia – semínima – colcheia',
    seq: ['CSC'],
    desc: 'A semínima começa no contratempo (50) e atravessa a batida do 100, terminando no 150. Soma 200 (dois tempos). É a síncopa clássica.',
  },
  pc: {
    label: 'Semínima pontuada – colcheia',
    seq: ['PC'],
    desc: 'A semínima pontuada dura 150 e a colcheia fecha o padrão, tocando no 150. Soma 200 (dois tempos). Muito comum em baladas e riffs.',
  },
  tre: {
    label: 'Tresillo (3-3-2)',
    seq: ['TRE'],
    desc: 'Notas no 0, 150 e 300, com durações 150 + 150 + 100. Agrupa 8 colcheias em 3 + 3 + 2 ao longo de 4 tempos. Aparece em rock, música latina e metal.',
  },

  min: {
    label: 'Mínima',
    seq: ['MIN'],
    desc: 'A mínima vale dois tempos: toca no 0 e dura até o 200. Conte "um, dois" enquanto a nota soa.',
  },
  minp: {
    label: 'Mínima pontuada',
    seq: ['MINP'],
    desc: 'A mínima pontuada dura 300 (200 + 100 do ponto), três tempos. Conte "um, dois, três" sem tocar nada.',
  },
  sb: {
    label: 'Semibreve',
    seq: ['SB'],
    desc: 'A semibreve ocupa o compasso 4/4 inteiro: toca no 0 e dura 400.',
  },

  rc: {
    label: 'Pausa de colcheia + colcheia',
    seq: ['RC'],
    desc: 'O bloco listrado é uma pausa: não toque no 0, só no 50, no contratempo. A mão da palheta continua descendo e subindo, e só toca na subida.',
  },
  sr: {
    label: 'Semínima – pausa de semínima',
    seq: ['SR'],
    desc: 'Toque no 0 e abafe a nota no 100. Fique em silêncio até o 200 e toque de novo.',
  },
  rs3: {
    label: 'Pausa de semicolcheia + 3 semicolcheias',
    seq: ['RS3'],
    desc: 'A pausa deixa o 0 vazio: toque no 25, 50 e 75. É muito usado em funk e metal e o "um" fica em silêncio.',
  },

  t3: {
    label: 'Tercina de colcheias',
    seq: ['T3'],
    desc: 'Três notas iguais por tempo: 0, 33 e 67 (na verdade 33,3 e 66,7). Na partitura aparece com o colchete "3".',
  },
  t6: {
    label: 'Tercina de semicolcheias',
    seq: ['T6'],
    desc: 'Seis notas iguais por tempo: 0, 17, 33, 50, 67 e 83. Cada uma dura um sexto do tempo.',
  },
  t3a: {
    label: 'Duas colcheias x tercina',
    seq: ['A', 'T3'],
    desc: 'Um tempo com duas colcheias (0 e 50) e outro com a tercina (0, 33 e 67). Treina a troca de subdivisão sem perder a batida.',
  },
};

export const GRUPOS: Grupo[] = [
  { id: 'col', label: 'Colcheias', modes: ['a', 'b', 'alt'] },
  { id: 'sem', label: 'Semínimas', modes: ['sm', 'sc', 'cs', 'pp'] },
  { id: 'sub', label: 'Subdivisões', modes: ['s4', 'c22', 's2c', 'scs', 'sp'] },
  { id: 'sin', label: 'Síncopas', modes: ['csc', 'pc', 'tre'] },
  { id: 'lon', label: 'Notas longas', modes: ['min', 'minp', 'sb'] },
  { id: 'pau', label: 'Pausas', modes: ['rc', 'sr', 'rs3'] },
  { id: 'ter', label: 'Tercinas', modes: ['t3', 't6', 't3a'] },
];

export function duracaoTotal(modo: string): number {
  return MODOS[modo].seq.reduce((soma, chave) => soma + CICLOS[chave].L, 0);
}

// ---------- conversão para exercício do app ----------

const BPM_EXERCICIO = 60;
const COMPASSOS_POR_EXERCICIO = 4;
// Exercícios usam a corda solta mais grave: a nota é só um veículo para o ritmo.
const CORDA = 6;
const CASA = 0;

const FIGURAS: Record<number, { duracao: Duracao; pontuada?: boolean }> = {
  25: { duracao: 16 },
  50: { duracao: 8 },
  75: { duracao: 8, pontuada: true },
  100: { duracao: 4 },
  150: { duracao: 4, pontuada: true },
  200: { duracao: 2 },
  300: { duracao: 2, pontuada: true },
  400: { duracao: 1 },
};

function notaParaExercicio(n: NotaRitmo): Nota {
  const casa = n.rest ? 'r' : CASA;
  if (n.tercina) {
    // 3 notas no tempo de 2: colcheias (len 33,3) ou semicolcheias (len 16,7)
    return { corda: CORDA, casa, duracao: n.len > 25 ? 8 : 16, tercina: true };
  }
  const figura = FIGURAS[n.len];
  if (!figura) throw new Error(`Duração sem figura equivalente: ${n.len}`);
  const nota: Nota = { corda: CORDA, casa, duracao: figura.duracao };
  if (figura.pontuada) nota.pontuada = true;
  return nota;
}

export function modoParaExercicio(modo: string): Exercicio {
  const total = duracaoTotal(modo);
  // 4/4 quando o padrão cabe em 4 tempos; senão 3/4 (padrões de 150 e 300).
  const tempos = 400 % total === 0 ? 4 : 3;
  if ((tempos * 100) % total !== 0) throw new Error(`Padrão ${modo} não cabe em um compasso`);

  const ciclosPorCompasso = (tempos * 100) / total;
  const notasDoCiclo = MODOS[modo].seq.flatMap((chave) => CICLOS[chave].notes.map(notaParaExercicio));
  const compasso = (): Compasso => ({
    notas: Array.from({ length: ciclosPorCompasso }, () => notasDoCiclo).flat().map((n) => ({ ...n })),
  });

  return {
    bpm: BPM_EXERCICIO,
    formula: [tempos, 4],
    compassos: Array.from({ length: COMPASSOS_POR_EXERCICIO }, compasso),
  };
}
