import { useEffect, useState } from 'react';
import { CalibracaoMicrofone } from './CalibracaoMicrofone';
import type { ConfiguracaoDetector, ConfiguracaoMicrofone } from './configuracao';
import { AvisoMetronomo, DicasCaptacao } from './DicasCaptacao';
import { MonitorMicrofone } from './MonitorMicrofone';
import { DETECTORES, type TipoDetector } from './tipos';
import type { Microfone } from './useMicrofone';
import './microfone.css';

interface MenuEntradaProps {
  configuracao: ConfiguracaoMicrofone;
  onMudar: (configuracao: ConfiguracaoMicrofone) => void;
  microfone: Microfone;
}

const ROTULO_ESTADO = {
  inativo: 'Microfone desligado',
  iniciando: 'Abrindo microfone…',
  ativo: 'Microfone ligado',
  erro: 'Erro no microfone',
} as const;

export function MenuEntrada({ configuracao, onMudar, microfone }: MenuEntradaProps) {
  const [painelAberto, setPainelAberto] = useState(true);
  const { fonte, tipo, intervaloMinimoMs, deviceId } = configuracao;
  const configDetector = configuracao.porDetector[tipo];
  const descricao = DETECTORES.find((d) => d.tipo === tipo);
  const usandoMicrofone = fonte === 'microfone';
  const { estado, parar } = microfone;

  useEffect(() => {
    if (!usandoMicrofone && estado === 'ativo') void parar();
  }, [usandoMicrofone, estado, parar]);

  function mudarDetector(parcial: Partial<ConfiguracaoDetector>) {
    onMudar({
      ...configuracao,
      porDetector: { ...configuracao.porDetector, [tipo]: { ...configDetector, ...parcial } },
    });
  }

  function mudarDispositivo(novoId: string) {
    const id = novoId || null;
    onMudar({ ...configuracao, deviceId: id });
    if (estado === 'ativo') void microfone.iniciar(id);
  }

  return (
    <header className="menu-entrada">
      <div className="menu-entrada__barra">
        <span className="menu-entrada__titulo">Entrada do treino</span>
        <div className="menu-entrada__segmentos" role="group" aria-label="Entrada do treino">
          <button
            type="button"
            aria-pressed={fonte === 'teclado'}
            onClick={() => onMudar({ ...configuracao, fonte: 'teclado' })}
          >
            Teclado (espaço)
          </button>
          <button
            type="button"
            aria-pressed={fonte === 'microfone'}
            onClick={() => onMudar({ ...configuracao, fonte: 'microfone' })}
          >
            Microfone
          </button>
        </div>

        {usandoMicrofone && (
          <>
            <label className="menu-entrada__campo">
              Detector
              <select
                value={tipo}
                onChange={(e) => onMudar({ ...configuracao, tipo: e.target.value as TipoDetector })}
              >
                {DETECTORES.map((d) => (
                  <option key={d.tipo} value={d.tipo}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </label>

            <span className={`menu-entrada__estado menu-entrada__estado--${estado}`}>{ROTULO_ESTADO[estado]}</span>
            {estado === 'ativo' ? (
              <button type="button" onClick={() => void parar()}>
                Desligar microfone
              </button>
            ) : (
              <button type="button" onClick={() => void microfone.iniciar(deviceId)} disabled={estado === 'iniciando'}>
                Ligar microfone
              </button>
            )}
            <button type="button" className="menu-entrada__alternar" onClick={() => setPainelAberto((a) => !a)}>
              {painelAberto ? 'Esconder ajustes ▲' : 'Mostrar ajustes ▼'}
            </button>
          </>
        )}
      </div>

      {usandoMicrofone && painelAberto && (
        <div className="menu-entrada__painel">
          {descricao && <p className="menu-entrada__descricao">{descricao.resumo}</p>}
          {microfone.erro && <p className="menu-entrada__erro">{microfone.erro}</p>}
          <AvisoMetronomo />

          <div className="menu-entrada__ajustes">
            <label className="menu-entrada__campo">
              Dispositivo
              <select value={deviceId ?? ''} onChange={(e) => mudarDispositivo(e.target.value)}>
                <option value="">Padrão do sistema</option>
                {microfone.dispositivos.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || 'Microfone sem nome'}
                  </option>
                ))}
              </select>
            </label>

            <label className="menu-entrada__campo">
              Sensibilidade: {Math.round(configDetector.sensibilidade * 100)}%
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={configDetector.sensibilidade}
                onChange={(e) => mudarDetector({ sensibilidade: Number(e.target.value) })}
              />
            </label>

            <label className="menu-entrada__campo">
              Intervalo mínimo entre toques: {intervaloMinimoMs} ms
              <input
                type="range"
                min={30}
                max={200}
                step={5}
                value={intervaloMinimoMs}
                onChange={(e) => onMudar({ ...configuracao, intervaloMinimoMs: Number(e.target.value) })}
              />
            </label>

            <label className="menu-entrada__campo">
              Compensação de atraso (ms)
              <input
                type="number"
                min={-200}
                max={500}
                value={configDetector.compensacaoMs}
                onChange={(e) => mudarDetector({ compensacaoMs: Number(e.target.value) || 0 })}
              />
            </label>
          </div>

          <CalibracaoMicrofone microfone={microfone} onCalibrado={(compensacaoMs) => mudarDetector({ compensacaoMs })} />

          {estado === 'ativo' ? (
            <MonitorMicrofone microfone={microfone} />
          ) : (
            <p className="menu-entrada__descricao">Ligue o microfone para ver o monitor e testar a detecção.</p>
          )}

          <DicasCaptacao />
        </div>
      )}
    </header>
  );
}
