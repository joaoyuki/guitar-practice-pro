// Gera um .json por ritmo da aba "Figuras rítmicas" em exercicios/ritmos/.
// Uso: npm run gerar:ritmos
import { mkdirSync, writeFileSync } from 'node:fs';
import { GRUPOS, MODOS, modoParaExercicio } from '../src/ritmos/figuras.ts';

const PASTA = new URL('../exercicios/ritmos/', import.meta.url);

function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

mkdirSync(PASTA, { recursive: true });

let numero = 0;
for (const grupo of GRUPOS) {
  for (const modo of grupo.modes) {
    numero += 1;
    const nome = `${String(numero).padStart(2, '0')}-${slug(grupo.label)}-${slug(MODOS[modo].label)}.json`;
    writeFileSync(new URL(nome, PASTA), JSON.stringify(modoParaExercicio(modo), null, 2) + '\n');
    console.log(nome);
  }
}
