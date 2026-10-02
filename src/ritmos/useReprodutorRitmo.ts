import { useCallback, useEffect, useRef, useState } from 'react';
import { CICLOS, MODOS, duracaoTotal } from './figuras';

export interface Quadro {
  chave: string; // ciclo atual
  pos: number; // posição dentro do ciclo (100 = um tempo)
  indiceTempo: number; // tempo absoluto desde o início
}

const HORIZONTE_S = 0.12;
const INTERVALO_AGENDADOR_MS = 25;

function localizar(modo: string, segundos: number, bpm: number): Quadro {
  const unidades = (segundos / (60 / bpm)) * 100;
  const seq = MODOS[modo].seq;
  let resto = unidades % duracaoTotal(modo);
  let i = 0;
  while (i < seq.length - 1 && resto >= CICLOS[seq[i]].L) {
    resto -= CICLOS[seq[i]].L;
    i++;
  }
  return { chave: seq[i], pos: resto, indiceTempo: Math.floor(unidades / 100) };
}

function clique(ctx: AudioContext, destino: AudioNode, tempo: number) {
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = 1400;
  ganho.gain.setValueAtTime(0.0001, tempo);
  ganho.gain.exponentialRampToValueAtTime(0.12, tempo + 0.002);
  ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + 0.04);
  osc.connect(ganho).connect(destino);
  osc.start(tempo);
  osc.stop(tempo + 0.05);
}

function nota(ctx: AudioContext, destino: AudioNode, tempo: number, duracaoS: number, acento: boolean) {
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = acento ? 330 : 247;
  ganho.gain.setValueAtTime(0.0001, tempo);
  ganho.gain.exponentialRampToValueAtTime(0.35, tempo + 0.01);
  ganho.gain.setValueAtTime(0.3, tempo + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.0001, tempo + Math.max(duracaoS * 0.95, 0.06));
  osc.connect(ganho).connect(destino);
  osc.start(tempo);
  osc.stop(tempo + duracaoS + 0.05);
}

export function useReprodutorRitmo(modo: string, bpm: number, cliqueLigado: boolean) {
  const [tocando, setTocando] = useState(false);
  const [quadro, setQuadro] = useState<Quadro | null>(null);

  // Valores lidos pelo agendador/animação sem recriar os timers.
  const modoRef = useRef(modo);
  const bpmRef = useRef(bpm);
  const cliqueRef = useRef(cliqueLigado);
  const tocandoRef = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    modoRef.current = modo;
    bpmRef.current = bpm;
    cliqueRef.current = cliqueLigado;
  });

  const parar = useCallback(() => {
    tocandoRef.current = false;
    if (timerRef.current !== null) clearInterval(timerRef.current);
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
    masterRef.current?.disconnect();
    masterRef.current = null;
    setTocando(false);
    setQuadro(null);
  }, []);

  const iniciar = useCallback(() => {
    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') void ctx.resume();

    const master = ctx.createGain();
    master.connect(ctx.destination);
    masterRef.current = master;

    // Congela modo/bpm da execução: mudanças reiniciam (ver efeito abaixo).
    const modoAtual = modoRef.current;
    const bpmAtual = bpmRef.current;
    const duracaoTempo = 60 / bpmAtual;
    const seq = MODOS[modoAtual].seq;
    const inicio = ctx.currentTime + 0.1;
    let proximoTempo = 0;
    let proximasUnidades = 0;
    let proximoIndice = 0;

    const agendar = () => {
      const horizonte = ctx.currentTime + HORIZONTE_S;
      while (inicio + proximoTempo * duracaoTempo < horizonte) {
        if (cliqueRef.current) clique(ctx, master, inicio + proximoTempo * duracaoTempo);
        proximoTempo++;
      }
      while (inicio + (proximasUnidades / 100) * duracaoTempo < horizonte) {
        const ciclo = CICLOS[seq[proximoIndice]];
        for (const n of ciclo.notes) {
          if (n.rest) continue;
          const t = inicio + ((proximasUnidades + n.at) / 100) * duracaoTempo;
          nota(ctx, master, t, (n.len / 100) * duracaoTempo, n.at === 0);
        }
        proximasUnidades += ciclo.L;
        proximoIndice = (proximoIndice + 1) % seq.length;
      }
    };

    const quadroAtual = () => {
      setQuadro(localizar(modoAtual, Math.max(0, ctx.currentTime - inicio), bpmAtual));
      rafRef.current = requestAnimationFrame(quadroAtual);
    };

    tocandoRef.current = true;
    setTocando(true);
    timerRef.current = window.setInterval(agendar, INTERVALO_AGENDADOR_MS);
    agendar();
    rafRef.current = requestAnimationFrame(quadroAtual);
  }, []);

  const alternar = useCallback(() => {
    if (tocandoRef.current) parar();
    else iniciar();
  }, [iniciar, parar]);

  // Trocar de ritmo ou andamento reinicia a reprodução (com atraso para o slider).
  useEffect(() => {
    if (!tocandoRef.current) return;
    const id = window.setTimeout(() => {
      parar();
      iniciar();
    }, 150);
    return () => clearTimeout(id);
  }, [modo, bpm, iniciar, parar]);

  useEffect(() => parar, [parar]);

  return { tocando, quadro, alternar, parar };
}
