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

interface UseTreinoRitmoOptions {
  ativo: boolean;
  exercicio: Exercicio | null;
}

/** Elementos onde a barra de espaço deve continuar com o comportamento padrão (rolar página, marcar checkbox etc). */
function focoEmCampoDeFormulario(): boolean {
  const elemento = document.activeElement;
  if (!elemento) return false;
  const tag = elemento.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || elemento.hasAttribute('contenteditable');
}

export function useTreinoRitmo({ ativo, exercicio }: UseTreinoRitmoOptions) {
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

  const estimarTempoAtualMs = useCallback(() => {
    const { tempoAudioMs, tempoPerfMs } = sincroniaRef.current;
    return tempoAudioMs + (performance.now() - tempoPerfMs);
  }, []);

  useEffect(() => {
    if (!ativo) return;

    function aoApertarTecla(evento: KeyboardEvent) {
      if (evento.code !== 'Space' || evento.repeat || focoEmCampoDeFormulario()) return;
      evento.preventDefault();
      const tempoMs = estimarTempoAtualMs();
      tentativasRef.current = [...tentativasRef.current, tempoMs];
      avaliarAte(tempoMs);
    }

    window.addEventListener('keydown', aoApertarTecla);
    return () => window.removeEventListener('keydown', aoApertarTecla);
  }, [ativo, estimarTempoAtualMs, avaliarAte]);

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
