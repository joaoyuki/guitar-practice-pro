/** Nível até onde o sinal ainda é tratado como ruído (e não como música) ao atualizar o piso. */
const FAIXA_RUIDO_DB = 6;
const SUBIDA_RUIDO_DB_POR_SEGUNDO = 3;
const SUBIDA_MUSICA_DB_POR_SEGUNDO = 0.2;

/**
 * Estima o nível do ruído de fundo seguindo os mínimos do sinal. Desce na hora quando o nível cai.
 * Sobe rápido só enquanto o sinal está perto do piso (é ruído mudando, ex.: ventilador ligou);
 * com notas soando o tempo todo, sobe bem devagar, senão o "ruído" viraria o som das próprias
 * notas e o portão passaria a bloquear palhetadas de verdade.
 */
export class PisoDeRuido {
  private pisoDb: number | null = null;

  reiniciar(): void {
    this.pisoDb = null;
  }

  atualizar(nivelDb: number, duracaoSeg: number): number {
    if (this.pisoDb === null || nivelDb < this.pisoDb) {
      this.pisoDb = nivelDb;
    } else {
      const ehRuido = nivelDb - this.pisoDb < FAIXA_RUIDO_DB;
      const subida = ehRuido ? SUBIDA_RUIDO_DB_POR_SEGUNDO : SUBIDA_MUSICA_DB_POR_SEGUNDO;
      this.pisoDb += Math.min(nivelDb - this.pisoDb, subida * duracaoSeg);
    }
    return this.pisoDb;
  }
}

/**
 * Nível mínimo para aceitar um ataque: acima de um piso absoluto e acima do ruído de fundo medido
 * por uma margem que diminui conforme a sensibilidade aumenta.
 */
export function limiteDoPortao(pisoRuidoDb: number, sensibilidade: number): number {
  const pisoAbsolutoDb = -35 - 30 * sensibilidade;
  const margemDb = 10 - 6 * sensibilidade;
  return Math.max(pisoAbsolutoDb, pisoRuidoDb + margemDb);
}
