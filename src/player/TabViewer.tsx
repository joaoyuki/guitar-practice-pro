import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import type { Exercicio } from '../editor/types';
import { DestaquePartitura } from '../treino/DestaquePartitura';
import { LinhaDoTempo } from '../treino/LinhaDoTempo';
import { ResumoTreino } from '../treino/ResumoTreino';
import { useTreinoRitmo } from '../treino/useTreinoRitmo';
import { agendarContagem, obterAudioContext } from './contagem';
import './TabViewer.css';

const QUANTIDADE_CONTAGEM = 3;

interface TabViewerProps {
  alphaTex: string;
  exercicio: Exercicio;
}

type ModoFeedback = 'linha-do-tempo' | 'destaque-partitura' | 'resumo';

export function TabViewer({ alphaTex, exercicio }: TabViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const tocandoRef = useRef(false);
  const foiParadoRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const contagemTimeoutRef = useRef<number | null>(null);
  const [playerPronto, setPlayerPronto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [totalCompassos, setTotalCompassos] = useState(0);
  const [compassoAtivo, setCompassoAtivo] = useState(0);
  const [progressoCompasso, setProgressoCompasso] = useState(0);
  const [repetindo, setRepetindo] = useState(false);
  const [score, setScore] = useState<alphaTab.model.Score | null>(null);

  const [modoTreino, setModoTreino] = useState(false);
  const [modoFeedback, setModoFeedback] = useState<ModoFeedback>('linha-do-tempo');
  const [silencioso, setSilencioso] = useState(false);
  const [tempoAtualMs, setTempoAtualMs] = useState(0);
  const [resumoFechado, setResumoFechado] = useState(false);
  const [contarAteTres, setContarAteTres] = useState(false);
  const [contando, setContando] = useState(false);

  const treino = useTreinoRitmo({ ativo: modoTreino, exercicio });

  useEffect(() => {
    if (!containerRef.current) return;

    const api = new alphaTab.AlphaTabApi(containerRef.current, {
      core: {
        fontDirectory: '/font/',
      },
      player: {
        playerMode: alphaTab.PlayerMode.EnabledSynthesizer,
        soundFont: '/soundfont/sonivox.sf3',
        enableCursor: true,
        enableAnimatedBeatCursor: true,
      },
    });
    apiRef.current = api;
    api.metronomeVolume = 1;

    const removerPlayerReady = api.playerReady.on(() => setPlayerPronto(true));
    const removerPlayerStateChanged = api.playerStateChanged.on((args) => {
      tocandoRef.current = args.state === alphaTab.synth.PlayerState.Playing;
      setTocando(tocandoRef.current);
      if (args.stopped) {
        setCompassoAtivo(0);
        setProgressoCompasso(0);
        setTempoAtualMs(0);
        treino.finalizar();
        foiParadoRef.current = true;
      } else if (tocandoRef.current && foiParadoRef.current) {
        // Começando um treino novo depois de uma parada completa: aí sim limpa o resultado anterior.
        foiParadoRef.current = false;
        treino.reiniciar();
        setResumoFechado(false);
      }
    });
    const removerScoreLoaded = api.scoreLoaded.on((score) => {
      setTotalCompassos(score.masterBars.length);
      setCompassoAtivo(0);
      setProgressoCompasso(0);
      setScore(score);
    });
    const removerPositionChanged = api.playerPositionChanged.on((args) => {
      setTempoAtualMs(args.currentTime);
      if (tocandoRef.current) {
        treino.sincronizarTempoAtual(args.currentTime);
      }

      const masterBars = api.score?.masterBars;
      if (!masterBars) return;
      const indice = masterBars.findIndex((compasso) => {
        const duracao = compasso.calculateDuration();
        return args.currentTick >= compasso.start && args.currentTick < compasso.start + duracao;
      });
      if (indice === -1) return;
      const duracao = masterBars[indice].calculateDuration();
      const progresso = duracao > 0 ? (args.currentTick - masterBars[indice].start) / duracao : 0;
      setCompassoAtivo(indice);
      setProgressoCompasso(Math.min(1, Math.max(0, progresso)));
    });

    return () => {
      removerPlayerReady();
      removerPlayerStateChanged();
      removerScoreLoaded();
      removerPositionChanged();
      api.destroy();
      apiRef.current = null;
      setPlayerPronto(false);
      setTocando(false);
      setTotalCompassos(0);
      setCompassoAtivo(0);
      setProgressoCompasso(0);
      setScore(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    apiRef.current?.tex(alphaTex);
  }, [alphaTex]);

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.isLooping = repetindo;
    }
  }, [repetindo]);

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.masterVolume = modoTreino && silencioso ? 0 : 1;
    }
  }, [modoTreino, silencioso]);

  useEffect(() => {
    return () => {
      if (contagemTimeoutRef.current !== null) {
        window.clearTimeout(contagemTimeoutRef.current);
      }
      audioCtxRef.current?.close();
    };
  }, []);

  function aoClicarTocarPausar() {
    if (!apiRef.current) return;
    if (tocando || !contarAteTres) {
      apiRef.current.playPause();
      return;
    }

    const ctx = obterAudioContext(audioCtxRef.current);
    audioCtxRef.current = ctx;
    void ctx.resume();
    setContando(true);
    const duracaoMs = agendarContagem(ctx, exercicio.bpm, QUANTIDADE_CONTAGEM);
    contagemTimeoutRef.current = window.setTimeout(() => {
      contagemTimeoutRef.current = null;
      setContando(false);
      apiRef.current?.playPause();
    }, duracaoMs);
  }

  function aoClicarParar() {
    if (contagemTimeoutRef.current !== null) {
      window.clearTimeout(contagemTimeoutRef.current);
      contagemTimeoutRef.current = null;
      setContando(false);
    }
    apiRef.current?.stop();
  }

  return (
    <div className="tab-viewer">
      <div className="tab-viewer__controles">
        <button type="button" onClick={aoClicarTocarPausar} disabled={!playerPronto || contando}>
          {contando ? 'Contando…' : tocando ? 'Pausar' : 'Tocar'}
        </button>
        <button type="button" onClick={aoClicarParar} disabled={!playerPronto}>
          Parar
        </button>
        <label className="tab-viewer__repetir">
          <input
            type="checkbox"
            checked={repetindo}
            onChange={(e) => setRepetindo(e.target.checked)}
            disabled={!playerPronto}
          />
          Repetir
        </label>
        <label className="tab-viewer__repetir">
          <input
            type="checkbox"
            checked={contarAteTres}
            onChange={(e) => setContarAteTres(e.target.checked)}
            disabled={!playerPronto || tocando || contando}
          />
          Contar até 3
        </label>
        {!playerPronto && <span className="tab-viewer__status">Carregando player…</span>}
      </div>

      <div className="tab-viewer__treino-controles">
        <label>
          <input
            type="checkbox"
            checked={modoTreino}
            onChange={(e) => setModoTreino(e.target.checked)}
            disabled={!playerPronto || tocando || contando}
          />
          Treinar ritmo (aperte espaço no tempo)
        </label>

        {modoTreino && (
          <>
            <div className="tab-viewer__treino-modos">
              <label>
                <input
                  type="radio"
                  name="modo-feedback"
                  checked={modoFeedback === 'linha-do-tempo'}
                  onChange={() => setModoFeedback('linha-do-tempo')}
                />
                Linha do tempo
              </label>
              <label>
                <input
                  type="radio"
                  name="modo-feedback"
                  checked={modoFeedback === 'destaque-partitura'}
                  onChange={() => setModoFeedback('destaque-partitura')}
                />
                Destacar na partitura
              </label>
              <label>
                <input
                  type="radio"
                  name="modo-feedback"
                  checked={modoFeedback === 'resumo'}
                  onChange={() => setModoFeedback('resumo')}
                />
                Só resumo
              </label>
            </div>

            <label>
              <input
                type="checkbox"
                checked={silencioso}
                onChange={(e) => setSilencioso(e.target.checked)}
                disabled={tocando}
              />
              Silencioso (sem som, só o tempo)
            </label>
          </>
        )}
      </div>

      <div className="tab-viewer__tab-wrapper">
        <div ref={containerRef} className="tab-viewer__tab" />
        {modoTreino && modoFeedback === 'destaque-partitura' && apiRef.current && score && (
          <DestaquePartitura api={apiRef.current} score={score} resultados={treino.resultados} />
        )}
      </div>

      {modoTreino && modoFeedback === 'linha-do-tempo' && (
        <LinhaDoTempo
          esperados={treino.esperados}
          resultados={treino.resultados}
          duracaoTotalMs={treino.duracaoTotalMs}
          progressoMs={tempoAtualMs}
        />
      )}

      {modoTreino && !resumoFechado && (
        <ResumoTreino resultados={treino.resultados} onFechar={() => setResumoFechado(true)} />
      )}

      {totalCompassos > 0 && (
        <div className="tab-viewer__progresso">
          <span className="tab-viewer__progresso-info">
            Compasso {compassoAtivo + 1} de {totalCompassos}
          </span>
          <div className="tab-viewer__progresso-barra">
            <div
              className="tab-viewer__progresso-preenchimento"
              style={{ width: `${progressoCompasso * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
