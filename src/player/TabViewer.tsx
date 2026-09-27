import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import './TabViewer.css';

interface TabViewerProps {
  alphaTex: string;
}

export function TabViewer({ alphaTex }: TabViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);
  const [playerPronto, setPlayerPronto] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [totalCompassos, setTotalCompassos] = useState(0);
  const [compassoAtivo, setCompassoAtivo] = useState(0);
  const [progressoCompasso, setProgressoCompasso] = useState(0);
  const [repetindo, setRepetindo] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const api = new alphaTab.AlphaTabApi(containerRef.current, {
      core: {
        fontDirectory: '/font/',
      },
      player: {
        playerMode: alphaTab.PlayerMode.EnabledSynthesizer,
        soundFont: '/soundfont/sonivox.sf3',
      },
    });
    apiRef.current = api;
    api.metronomeVolume = 1;

    const removerPlayerReady = api.playerReady.on(() => setPlayerPronto(true));
    const removerPlayerStateChanged = api.playerStateChanged.on((args) => {
      setTocando(args.state === alphaTab.synth.PlayerState.Playing);
      if (args.stopped) {
        setCompassoAtivo(0);
        setProgressoCompasso(0);
      }
    });
    const removerScoreLoaded = api.scoreLoaded.on((score) => {
      setTotalCompassos(score.masterBars.length);
      setCompassoAtivo(0);
      setProgressoCompasso(0);
    });
    const removerPositionChanged = api.playerPositionChanged.on((args) => {
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
    };
  }, []);

  useEffect(() => {
    apiRef.current?.tex(alphaTex);
  }, [alphaTex]);

  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.isLooping = repetindo;
    }
  }, [repetindo]);

  return (
    <div className="tab-viewer">
      <div className="tab-viewer__controles">
        <button type="button" onClick={() => apiRef.current?.playPause()} disabled={!playerPronto}>
          {tocando ? 'Pausar' : 'Tocar'}
        </button>
        <button type="button" onClick={() => apiRef.current?.stop()} disabled={!playerPronto}>
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
        {!playerPronto && <span className="tab-viewer__status">Carregando player…</span>}
      </div>
      <div ref={containerRef} className="tab-viewer__tab" />
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
