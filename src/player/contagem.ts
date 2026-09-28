const MARGEM_INICIAL_SEG = 0.05;
const FREQUENCIA_HZ = 880;
const DURACAO_BIPE_SEG = 0.08;

export function tocarBipe(ctx: AudioContext, quando: number, frequenciaHz = FREQUENCIA_HZ) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = frequenciaHz;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, quando);
  gain.gain.exponentialRampToValueAtTime(0.35, quando + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, quando + DURACAO_BIPE_SEG);
  osc.start(quando);
  osc.stop(quando + DURACAO_BIPE_SEG + 0.02);
}

/** Agenda os bipes de contagem no bpm informado e retorna, em ms, quanto esperar até o fim da contagem. */
export function agendarContagem(ctx: AudioContext, bpm: number, quantidade: number): number {
  const intervaloSeg = 60 / bpm;
  const inicio = ctx.currentTime + MARGEM_INICIAL_SEG;
  for (let i = 0; i < quantidade; i++) {
    tocarBipe(ctx, inicio + i * intervaloSeg);
  }
  return (MARGEM_INICIAL_SEG + quantidade * intervaloSeg) * 1000;
}

export function obterAudioContext(atual: AudioContext | null): AudioContext {
  if (atual && atual.state !== 'closed') return atual;
  return new AudioContext();
}
