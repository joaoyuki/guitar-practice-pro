import { describe, expect, it } from 'vitest';
import { criarDetectorBlocos } from './criarDetector';
import { DetectorLimiarFixo } from './detectorLimiarFixo';
import { Enquadrador } from './enquadrador';
import { FFT } from './fft';
import { PicoAdaptativo } from './picoAdaptativo';
import type { TipoDetector } from './tipos';

const SAMPLE_RATE = 48000;

/** Gerador pseudo-aleatório determinístico (LCG) para os testes não variarem entre execuções. */
function criarAleatorio(semente = 1) {
  let estado = semente;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x100000000 - 0.5;
  };
}

interface Palhetada {
  segundos: number;
  frequenciaHz: number;
  amplitude: number;
}

/** Sinal sintético de guitarra: ruído de fundo + para cada palhetada um transiente curto e harmônicos decaindo. */
function gerarSinal(duracaoSeg: number, palhetadas: Palhetada[], ruido = 0.002): Float32Array {
  const aleatorio = criarAleatorio();
  const sinal = new Float32Array(Math.round(duracaoSeg * SAMPLE_RATE));
  for (let i = 0; i < sinal.length; i++) sinal[i] = aleatorio() * 2 * ruido;

  for (const { segundos, frequenciaHz, amplitude } of palhetadas) {
    const inicio = Math.round(segundos * SAMPLE_RATE);
    for (let i = inicio; i < sinal.length; i++) {
      const t = (i - inicio) / SAMPLE_RATE;
      let amostra = 0;
      for (let h = 1; h <= 8; h++) {
        amostra += (Math.sin(2 * Math.PI * frequenciaHz * h * t) / h) * Math.exp(-t / (0.6 / h));
      }
      amostra *= amplitude * 0.4 * Math.min(1, t / 0.002);
      amostra += aleatorio() * amplitude * Math.exp(-t / 0.004);
      sinal[i] += amostra;
    }
  }
  return sinal;
}

function detectar(tipo: Exclude<TipoDetector, 'limiar-fixo'>, sinal: Float32Array, sensibilidade = 0.5): number[] {
  const detector = criarDetectorBlocos(tipo, { sampleRate: SAMPLE_RATE, sensibilidade, intervaloMinimoMs: 60 });
  const onsets: number[] = [];
  for (let i = 0; i < sinal.length; i += 512) {
    onsets.push(...detector.processar(sinal.slice(i, i + 512), i).onsets);
  }
  return onsets.map((frame) => (frame / SAMPLE_RATE) * 1000);
}

describe.each(['energia', 'spectral-flux', 'meyda'] as const)('detector %s', (tipo) => {
  it.each([0, 0.5, 1])('não dispara com apenas ruído de fundo (sensibilidade %s)', (sensibilidade) => {
    expect(detectar(tipo, gerarSinal(2, []), sensibilidade)).toEqual([]);
    expect(detectar(tipo, gerarSinal(2, [], 0.02), sensibilidade)).toEqual([]);
  });

  it('encontra palhetadas isoladas com erro pequeno', () => {
    const tempos = [0.3, 0.8, 1.3, 1.8];
    const sinal = gerarSinal(2.3, tempos.map((segundos) => ({ segundos, frequenciaHz: 110, amplitude: 0.3 })));
    const detectados = detectar(tipo, sinal);
    expect(detectados).toHaveLength(tempos.length);
    detectados.forEach((ms, i) => expect(Math.abs(ms - tempos[i] * 1000)).toBeLessThan(12));
  });

  it.each([0.5, 1])('encontra palhetadas com o ruído de fundo mais alto (sensibilidade %s)', (sensibilidade) => {
    const tempos = [0.8, 1.3, 1.8];
    const sinal = gerarSinal(2.3, tempos.map((segundos) => ({ segundos, frequenciaHz: 110, amplitude: 0.3 })), 0.02);
    const detectados = detectar(tipo, sinal, sensibilidade);
    expect(detectados).toHaveLength(tempos.length);
    detectados.forEach((ms, i) => expect(Math.abs(ms - tempos[i] * 1000)).toBeLessThan(12));
  });

  it('encontra uma palhetada nova enquanto a anterior ainda está soando', () => {
    const tempos = [0.3, 0.55, 0.8, 1.05];
    const frequencias = [110, 146.8, 110, 196];
    const sinal = gerarSinal(
      1.5,
      tempos.map((segundos, i) => ({ segundos, frequenciaHz: frequencias[i], amplitude: 0.25 })),
    );
    const detectados = detectar(tipo, sinal);
    expect(detectados).toHaveLength(tempos.length);
    detectados.forEach((ms, i) => expect(Math.abs(ms - tempos[i] * 1000)).toBeLessThan(12));
  });

  it('não perde toques com palhetadas contínuas (notas sempre soando)', () => {
    // O passo de 0,5013 s faz cada ataque cair numa posição diferente dentro da janela de análise.
    const tempos = Array.from({ length: 20 }, (_, i) => 0.3 + i * 0.5013);
    const sinal = gerarSinal(10.5, tempos.map((segundos) => ({ segundos, frequenciaHz: 110, amplitude: 0.1 })));
    const detectados = detectar(tipo, sinal);
    expect(detectados).toHaveLength(tempos.length);
  });

  it('acha toques bem mais fracos que o anterior', () => {
    const sinal = gerarSinal(1.5, [
      { segundos: 0.3, frequenciaHz: 110, amplitude: 0.4 },
      { segundos: 0.7, frequenciaHz: 164.8, amplitude: 0.1 },
    ]);
    expect(detectar(tipo, sinal)).toHaveLength(2);
  });
});

describe('DetectorLimiarFixo', () => {
  it('dispara ao cruzar o limiar e só rearma depois de o volume cair', () => {
    const detector = new DetectorLimiarFixo(0.5, 60);
    const limiar = detector.limiarDb;
    expect(detector.avaliar(limiar - 20, 0)).toBe(false);
    expect(detector.avaliar(limiar + 10, 16)).toBe(true);
    expect(detector.avaliar(limiar + 12, 100)).toBe(false); // continua alto: não rearmou
    expect(detector.avaliar(limiar - 10, 200)).toBe(false);
    expect(detector.avaliar(limiar + 10, 216)).toBe(true);
  });
});

describe('PicoAdaptativo', () => {
  it('marca apenas máximos locais acima da média recente e respeita o refratário', () => {
    const pico = new PicoAdaptativo({
      tamanhoHistorico: 5,
      multiplicador: 2,
      fracaoMaximo: 0,
      decaimentoMaximo: 1,
      refratarioFrames: 3,
    });
    const valores = [1, 1, 1, 1, 8, 3, 1, 1, 1, 7, 9, 2, 1, 1];
    const onsets = valores.map((v, frame) => pico.empurrar(v, frame).onset).filter((o) => o !== null);
    expect(onsets).toEqual([4, 10]);
  });
});

describe('Enquadrador', () => {
  it('gera janelas com sobreposição continuando entre blocos', () => {
    const enquadrador = new Enquadrador(4, 2);
    const inicios: number[] = [];
    const primeiros: number[] = [];
    const aoJanela = (janela: Float32Array, inicio: number) => {
      inicios.push(inicio);
      primeiros.push(janela[0]);
    };
    enquadrador.adicionar(Float32Array.from([0, 1, 2]), 100, aoJanela);
    enquadrador.adicionar(Float32Array.from([3, 4, 5, 6, 7]), 103, aoJanela);
    expect(inicios).toEqual([100, 102, 104]);
    expect(primeiros).toEqual([0, 2, 4]);
  });

  it('recomeça quando há um buraco na captura', () => {
    const enquadrador = new Enquadrador(4, 4);
    const inicios: number[] = [];
    enquadrador.adicionar(Float32Array.from([0, 1, 2]), 0, (_, i) => inicios.push(i));
    enquadrador.adicionar(Float32Array.from([0, 1, 2, 3]), 50, (_, i) => inicios.push(i));
    expect(inicios).toEqual([50]);
  });
});

describe('FFT', () => {
  it('concentra uma senoide no bin correspondente', () => {
    const n = 64;
    const fft = new FFT(n);
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * 5 * i) / n);
    fft.transformar(re, im);
    expect(Math.hypot(re[5], im[5])).toBeCloseTo(n / 2, 6);
    expect(Math.hypot(re[6], im[6])).toBeCloseTo(0, 6);
  });
});
