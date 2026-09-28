import type { FonteEntrada, TipoDetector } from './tipos';

export interface ConfiguracaoDetector {
  sensibilidade: number;
  /** Atraso medido na calibração (entrada + saída de áudio + detector), descontado de cada toque. */
  compensacaoMs: number;
}

export interface ConfiguracaoMicrofone {
  fonte: FonteEntrada;
  tipo: TipoDetector;
  intervaloMinimoMs: number;
  deviceId: string | null;
  porDetector: Record<TipoDetector, ConfiguracaoDetector>;
}

const CHAVE = 'guitar-practice:microfone';

export const CONFIGURACAO_PADRAO: ConfiguracaoMicrofone = {
  fonte: 'teclado',
  tipo: 'energia',
  intervaloMinimoMs: 60,
  deviceId: null,
  porDetector: {
    'limiar-fixo': { sensibilidade: 0.5, compensacaoMs: 0 },
    energia: { sensibilidade: 0.5, compensacaoMs: 0 },
    'spectral-flux': { sensibilidade: 0.5, compensacaoMs: 0 },
    meyda: { sensibilidade: 0.5, compensacaoMs: 0 },
  },
};

export function carregarConfiguracao(): ConfiguracaoMicrofone {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (!salvo) return CONFIGURACAO_PADRAO;
    const dados = JSON.parse(salvo) as Partial<ConfiguracaoMicrofone>;
    return {
      ...CONFIGURACAO_PADRAO,
      ...dados,
      porDetector: { ...CONFIGURACAO_PADRAO.porDetector, ...dados.porDetector },
    };
  } catch {
    return CONFIGURACAO_PADRAO;
  }
}

export function salvarConfiguracao(configuracao: ConfiguracaoMicrofone): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(configuracao));
  } catch {
    // Sem armazenamento (aba privada etc.): a configuração vale só para esta sessão.
  }
}
