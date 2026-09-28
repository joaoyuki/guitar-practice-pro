import { RelogioAudio } from './relogioAudio';

const NOME_PROCESSADOR = 'coletor-amostras';
const TAMANHO_PACOTE = 512;

/**
 * AudioWorklet mínimo: junta blocos de 128 amostras em pacotes de 512 e manda para a thread
 * principal junto com `currentFrame` (índice da primeira amostra). A detecção roda na thread
 * principal, mas como o tempo vem do índice da amostra, atrasos de entrega não afetam a precisão.
 * Fica como string para não depender de como o bundler empacota worklets.
 */
const CODIGO_WORKLET = `
class ColetorAmostras extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pacote = new Float32Array(${TAMANHO_PACOTE});
    this.preenchido = 0;
    this.frameInicio = 0;
  }

  enviar() {
    const amostras = this.pacote.slice(0, this.preenchido);
    this.port.postMessage({ frame: this.frameInicio, amostras }, [amostras.buffer]);
    this.preenchido = 0;
  }

  process(inputs) {
    const canal = inputs[0] && inputs[0][0];
    if (!canal) return true;
    const descontinuo = currentFrame !== this.frameInicio + this.preenchido;
    const cheio = this.preenchido + canal.length > this.pacote.length;
    if (this.preenchido > 0 && (descontinuo || cheio)) this.enviar();
    if (this.preenchido === 0) this.frameInicio = currentFrame;
    this.pacote.set(canal, this.preenchido);
    this.preenchido += canal.length;
    if (this.preenchido === this.pacote.length) this.enviar();
    return true;
  }
}
registerProcessor('${NOME_PROCESSADOR}', ColetorAmostras);
`;

export interface PacoteAmostras {
  frame: number;
  amostras: Float32Array;
}

export interface CapturaMicrofone {
  ctx: AudioContext;
  analyser: AnalyserNode;
  rotuloDispositivo: string;
  /** Converte um índice de amostra do AudioContext para o relógio de `performance.now()`. */
  frameParaPerfMs(frame: number): number;
  contextTimeParaPerfMs(segundos: number): number;
  aoReceberPacote(callback: (pacote: PacoteAmostras) => void): void;
  parar(): Promise<void>;
}

export async function iniciarCaptura(deviceId: string | null): Promise<CapturaMicrofone> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      // Esses processamentos do navegador aumentam a latência e amortecem justamente o ataque da nota.
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    },
  });

  const ctx = new AudioContext({ latencyHint: 'interactive' });
  try {
    const urlWorklet = URL.createObjectURL(new Blob([CODIGO_WORKLET], { type: 'application/javascript' }));
    try {
      await ctx.audioWorklet.addModule(urlWorklet);
    } finally {
      URL.revokeObjectURL(urlWorklet);
    }
    await ctx.resume();
  } catch (erro) {
    stream.getTracks().forEach((track) => track.stop());
    await ctx.close();
    throw erro;
  }

  const fonte = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  const coletor = new AudioWorkletNode(ctx, NOME_PROCESSADOR, { numberOfInputs: 1, numberOfOutputs: 1 });
  // O coletor precisa estar ligado ao destino para ser processado, mas sem som: ganho zero evita microfonia.
  const mudo = ctx.createGain();
  mudo.gain.value = 0;
  fonte.connect(analyser);
  fonte.connect(coletor);
  coletor.connect(mudo);
  mudo.connect(ctx.destination);

  const relogio = new RelogioAudio();
  relogio.registrar(performance.now(), ctx.currentTime);
  let callbackPacote: ((pacote: PacoteAmostras) => void) | null = null;
  coletor.port.onmessage = (evento: MessageEvent<PacoteAmostras>) => {
    relogio.registrar(performance.now(), ctx.currentTime);
    callbackPacote?.(evento.data);
  };

  return {
    ctx,
    analyser,
    rotuloDispositivo: stream.getAudioTracks()[0]?.label ?? '',
    frameParaPerfMs: (frame) => relogio.paraPerfMs(frame / ctx.sampleRate),
    contextTimeParaPerfMs: (segundos) => relogio.paraPerfMs(segundos),
    aoReceberPacote: (callback) => {
      callbackPacote = callback;
    },
    parar: async () => {
      coletor.port.onmessage = null;
      stream.getTracks().forEach((track) => track.stop());
      await ctx.close();
    },
  };
}

export async function listarMicrofones(): Promise<MediaDeviceInfo[]> {
  const dispositivos = await navigator.mediaDevices.enumerateDevices();
  return dispositivos.filter((d) => d.kind === 'audioinput');
}
