export type TipoDetector = 'limiar-fixo' | 'energia' | 'spectral-flux' | 'meyda';

export type FonteEntrada = 'teclado' | 'microfone';

/** Ponto da "curva de detecção" de um detector, usado só para visualização no monitor. */
export interface PontoDiagnostico {
  frame: number;
  valor: number;
  limiar: number;
}

export interface ResultadoProcessamento {
  /** Frames (índice absoluto de amostra no AudioContext) onde um ataque foi detectado. */
  onsets: number[];
  diagnostico: PontoDiagnostico[];
}

/** Detector que recebe blocos contínuos de amostras e devolve os ataques encontrados, com precisão de amostra. */
export interface DetectorBlocos {
  processar(amostras: Float32Array, frameInicial: number): ResultadoProcessamento;
  reiniciar(): void;
}

export interface ParametrosDetector {
  sampleRate: number;
  /** 0 (menos sensível) a 1 (mais sensível). */
  sensibilidade: number;
  /** Intervalo mínimo entre dois ataques, para não contar a mesma batida duas vezes. */
  intervaloMinimoMs: number;
}

export interface DescricaoDetector {
  tipo: TipoDetector;
  nome: string;
  resumo: string;
}

export const DETECTORES: DescricaoDetector[] = [
  {
    tipo: 'limiar-fixo',
    nome: '1. Volume com limiar fixo',
    resumo:
      'Mede o volume a cada frame da tela (requestAnimationFrame) e dispara quando passa de um valor fixo. Simples, mas com ~16 ms de imprecisão e não percebe uma nota nova enquanto a anterior ainda soa alto.',
  },
  {
    tipo: 'energia',
    nome: '2. Energia com limiar adaptativo',
    resumo:
      'Filtra os graves (passa-alta em 2 kHz) para isolar o "clique" da palhetada e dispara quando a energia sobe de repente em relação à média recente. Precisão de ~3 ms.',
  },
  {
    tipo: 'spectral-flux',
    nome: '3. Spectral flux (FFT)',
    resumo:
      'Compara o espectro de cada janela com o anterior e dispara quando surge energia nova em qualquer frequência. Mais robusto com notas ligadas e dinâmica variando.',
  },
  {
    tipo: 'meyda',
    nome: '4. Biblioteca Meyda (loudness por bandas)',
    resumo:
      'Usa a biblioteca Meyda para extrair a loudness em 24 bandas Bark e dispara quando a loudness sobe em várias bandas ao mesmo tempo.',
  },
];

export function msParaFrames(ms: number, sampleRate: number): number {
  return Math.round((ms / 1000) * sampleRate);
}
