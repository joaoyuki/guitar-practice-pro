import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Exercicio } from '../editor/types';
import {
  avaliarExecucao,
  calcularDuracaoTotalMs,
  calcularTemposEsperados,
  JANELA_MAXIMA_MS,
  type ResultadoNota,
  type TempoEsperado,
} from './ritmoEngine';
import type { FonteEntrada } from './microfone/tipos';
import type { ToqueMicrofone } from './microfone/useMicrofone';

interface UseTreinoRitmoOptions {
  ativo: boolean;
  exercicio: Exercicio | null;
  fonte: FonteEntrada;
  assinarMicrofone: (ouvinte: (toque: ToqueMicrofone) => void) => () => void;
}

/** Elementos onde a barra de espaço deve continuar com o comportamento padrão (rolar página, marcar checkbox etc). */
function focoEmCampoDeFormulario(): boolean {
  const elemento = document.activeElement;
  if (!elemento) return false;
  const tag = elemento.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || elemento.hasAttribute('contenteditable');
}

export function useTreinoRitmo({ ativo, exercicio, fonte, assinarMicrofone }: UseTreinoRitmoOptions) {
  const [resultados, setResultados] = useState<ResultadoNota[]>([]);
  const esperadosRef = useRef<TempoEsperado[]>([]);
  const tentativasRef = useRef<number[]>([]);
  const sincroniaRef = useRef({ tempoAudioMs: 0, tempoPerfMs: 0 });

  const esperados = useMemo(() => (exercicio ? calcularTemposEsperados(exercicio) : []), [exercicio]);
  const duracaoTotalMs = useMemo(() => (exercicio ? calcularDuracaoTotalMs(exercicio) : 0), [exercicio]);

  useEffect(() => {
    esperadosRef.current = esperados;
  }, [esperados]);

  const avaliarAte = useCallback((tempoAtualMs: number) => {
    const alcancados = esperadosRef.current.filter((e) => e.tempoMs <= tempoAtualMs + JANELA_MAXIMA_MS);
    setResultados(avaliarExecucao(alcancados, tentativasRef.current));
  }, []);

  const reiniciar = useCallback(() => {
    tentativasRef.current = [];
    sincroniaRef.current = { tempoAudioMs: 0, tempoPerfMs: performance.now() };
    setResultados([]);
  }, []);

  /** Chamado a cada atualização de posição do player, para recalibrar o relógio do treino com o áudio real. */
  const sincronizarTempoAtual = useCallback(
    (tempoAudioMs: number) => {
      sincroniaRef.current = { tempoAudioMs, tempoPerfMs: performance.now() };
      avaliarAte(tempoAudioMs);
    },
    [avaliarAte],
  );

  /** Converte um instante de `performance.now()` para o tempo do exercício, usando a última sincronia com o player. */
  const tempoDoExercicioEm = useCallback((perfMs: number) => {
    const { tempoAudioMs, tempoPerfMs } = sincroniaRef.current;
    return tempoAudioMs + (perfMs - tempoPerfMs);
  }, []);

  /** Registra um toque vindo de qualquer fonte. O toque do microfone chega alguns ms depois de acontecer, por isso o tempo vem de fora. */
  const registrarTentativa = useCallback(
    (perfMs: number) => {
      tentativasRef.current = [...tentativasRef.current, tempoDoExercicioEm(perfMs)];
      avaliarAte(tempoDoExercicioEm(Math.max(perfMs, performance.now())));
    },
    [tempoDoExercicioEm, avaliarAte],
  );

  useEffect(() => {
    if (!ativo || fonte !== 'teclado') return;

    function aoApertarTecla(evento: KeyboardEvent) {
      if (evento.code !== 'Space' || evento.repeat || focoEmCampoDeFormulario()) return;
      evento.preventDefault();
      registrarTentativa(performance.now());
    }

    window.addEventListener('keydown', aoApertarTecla);
    return () => window.removeEventListener('keydown', aoApertarTecla);
  }, [ativo, fonte, registrarTentativa]);

  useEffect(() => {
    if (!ativo || fonte !== 'microfone') return;
    return assinarMicrofone((toque) => registrarTentativa(toque.perfMs));
  }, [ativo, fonte, assinarMicrofone, registrarTentativa]);

  /** Avalia todas as notas do exercício, mesmo as que ainda não tinham passado pela janela de tolerância. */
  const finalizar = useCallback(() => {
    setResultados(avaliarExecucao(esperadosRef.current, tentativasRef.current));
  }, []);

  return {
    esperados,
    duracaoTotalMs,
    resultados,
    reiniciar,
    sincronizarTempoAtual,
    finalizar,
  };
}
