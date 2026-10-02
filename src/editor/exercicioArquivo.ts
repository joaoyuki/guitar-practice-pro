import type { Compasso, Duracao, Exercicio, Nota } from './types';

const DURACOES_VALIDAS: readonly Duracao[] = [1, 2, 4, 8, 16, 32, 64];
const CORDA_MIN = 1;
const CORDA_MAX = 6;
const CASA_MIN = 0;
const CASA_MAX = 36;
const BPM_MIN = 20;
const BPM_MAX = 400;
const FORMULA_MIN = 1;
const FORMULA_MAX = 32;
const MAX_COMPASSOS = 200;
const MAX_NOTAS_POR_COMPASSO = 64;

// Extensão .json é obrigatória; tamanho é limitado para não travar o navegador
// tentando ler/parsear um arquivo enorme.
const EXTENSAO_VALIDA = '.json';
const TAMANHO_MAXIMO_BYTES = 256 * 1024;

export type ResultadoValidacao = { valido: true; exercicio: Exercicio } | { valido: false; erro: string };

class ErroValidacao extends Error {}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function validarNota(dados: unknown, contexto: string): Nota {
  if (!ehObjeto(dados)) throw new ErroValidacao(`${contexto}: nota inválida.`);
  const { corda, casa, duracao, pontuada, tercina } = dados;

  if (typeof corda !== 'number' || !Number.isInteger(corda) || corda < CORDA_MIN || corda > CORDA_MAX) {
    throw new ErroValidacao(`${contexto}: corda deve ser um número inteiro entre ${CORDA_MIN} e ${CORDA_MAX}.`);
  }
  if (casa !== 'r' && (typeof casa !== 'number' || !Number.isInteger(casa) || casa < CASA_MIN || casa > CASA_MAX)) {
    throw new ErroValidacao(`${contexto}: casa deve ser 'r' ou um número inteiro entre ${CASA_MIN} e ${CASA_MAX}.`);
  }
  if (typeof duracao !== 'number' || !DURACOES_VALIDAS.includes(duracao as Duracao)) {
    throw new ErroValidacao(`${contexto}: duração inválida (use ${DURACOES_VALIDAS.join(', ')}).`);
  }
  if (pontuada !== undefined && typeof pontuada !== 'boolean') {
    throw new ErroValidacao(`${contexto}: pontuada deve ser verdadeiro ou falso.`);
  }

  if (tercina !== undefined && typeof tercina !== 'boolean') {
    throw new ErroValidacao(`${contexto}: tercina deve ser verdadeiro ou falso.`);
  }

  const nota: Nota = { corda, casa: casa as number | 'r', duracao: duracao as Duracao };
  if (pontuada) nota.pontuada = true;
  if (tercina) nota.tercina = true;
  return nota;
}

function validarCompasso(dados: unknown, indice: number): Compasso {
  if (!ehObjeto(dados)) throw new ErroValidacao(`Compasso ${indice + 1}: formato inválido.`);
  const { notas } = dados;
  if (!Array.isArray(notas) || notas.length === 0) {
    throw new ErroValidacao(`Compasso ${indice + 1}: precisa ter ao menos uma nota.`);
  }
  if (notas.length > MAX_NOTAS_POR_COMPASSO) {
    throw new ErroValidacao(`Compasso ${indice + 1}: excede o máximo de ${MAX_NOTAS_POR_COMPASSO} notas.`);
  }
  return {
    notas: notas.map((nota, i) => validarNota(nota, `Compasso ${indice + 1}, nota ${i + 1}`)),
  };
}

export function validarExercicio(dados: unknown): ResultadoValidacao {
  try {
    if (!ehObjeto(dados)) throw new ErroValidacao('O arquivo não contém um exercício válido.');

    const { bpm, formula, compassos } = dados;

    if (typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm < BPM_MIN || bpm > BPM_MAX) {
      throw new ErroValidacao(`BPM deve ser um número entre ${BPM_MIN} e ${BPM_MAX}.`);
    }

    if (
      !Array.isArray(formula) ||
      formula.length !== 2 ||
      !formula.every((v) => typeof v === 'number' && Number.isInteger(v) && v >= FORMULA_MIN && v <= FORMULA_MAX)
    ) {
      throw new ErroValidacao(`Fórmula de compasso inválida (cada valor entre ${FORMULA_MIN} e ${FORMULA_MAX}).`);
    }

    if (!Array.isArray(compassos) || compassos.length === 0) {
      throw new ErroValidacao('O exercício precisa ter ao menos um compasso.');
    }
    if (compassos.length > MAX_COMPASSOS) {
      throw new ErroValidacao(`O exercício excede o máximo de ${MAX_COMPASSOS} compassos.`);
    }

    const exercicio: Exercicio = {
      bpm,
      formula: [formula[0], formula[1]],
      compassos: compassos.map((compasso, i) => validarCompasso(compasso, i)),
    };

    return { valido: true, exercicio };
  } catch (erro) {
    if (erro instanceof ErroValidacao) return { valido: false, erro: erro.message };
    return { valido: false, erro: 'Não foi possível validar o exercício.' };
  }
}

export function serializarExercicio(exercicio: Exercicio): string {
  return JSON.stringify(exercicio, null, 2);
}

export function nomeArquivoExercicio(): string {
  const carimbo = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `exercicio-${carimbo}.json`;
}

export function baixarExercicio(exercicio: Exercicio): void {
  const blob = new Blob([serializarExercicio(exercicio)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivoExercicio();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function lerArquivoExercicio(arquivo: File): Promise<ResultadoValidacao> {
  if (!arquivo.name.toLowerCase().endsWith(EXTENSAO_VALIDA)) {
    return { valido: false, erro: `O arquivo precisa ter a extensão ${EXTENSAO_VALIDA}.` };
  }
  if (arquivo.size === 0) {
    return { valido: false, erro: 'O arquivo está vazio.' };
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return {
      valido: false,
      erro: `O arquivo excede o tamanho máximo permitido (${TAMANHO_MAXIMO_BYTES / 1024} KB).`,
    };
  }

  let texto: string;
  try {
    texto = await arquivo.text();
  } catch {
    return { valido: false, erro: 'Não foi possível ler o arquivo.' };
  }

  let dados: unknown;
  try {
    dados = JSON.parse(texto);
  } catch {
    return { valido: false, erro: 'O arquivo não contém um JSON válido.' };
  }

  return validarExercicio(dados);
}
