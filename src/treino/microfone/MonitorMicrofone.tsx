import { useEffect, useRef, useState } from 'react';
import type { Microfone } from './useMicrofone';

const JANELA_MS = 4000;
const NIVEL_MINIMO_DB = -70;
const COR_TOQUE = '#2fb96b';
const COR_SATURACAO = '#e0512f';

interface MonitorMicrofoneProps {
  microfone: Microfone;
}

/**
 * Mostra os últimos segundos da "curva de detecção" do detector escolhido (linha cheia), o limiar
 * (tracejado) e os toques detectados (traços verdes), mais um medidor de nível de entrada.
 */
export function MonitorMicrofone({ microfone }: MonitorMicrofoneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nivelRef = useRef<HTMLDivElement>(null);
  const [saturou, setSaturou] = useState(false);
  const { monitorRef } = microfone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const contexto = canvas?.getContext('2d');
    if (!canvas || !contexto) return;

    let quadro = 0;
    const desenhar = () => {
      quadro = requestAnimationFrame(desenhar);
      const estilo = getComputedStyle(canvas);
      const corCurva = estilo.getPropertyValue('--accent').trim() || '#aa3bff';
      const corTexto = estilo.getPropertyValue('--text').trim() || '#6b6375';

      const escala = window.devicePixelRatio || 1;
      const largura = canvas.clientWidth;
      const altura = canvas.clientHeight;
      if (canvas.width !== largura * escala || canvas.height !== altura * escala) {
        canvas.width = largura * escala;
        canvas.height = altura * escala;
      }
      contexto.setTransform(escala, 0, 0, escala, 0, 0);
      contexto.clearRect(0, 0, largura, altura);

      const agora = performance.now();
      const inicio = agora - JANELA_MS;
      const x = (perfMs: number) => ((perfMs - inicio) / JANELA_MS) * largura;
      const { curva, toques, nivelDb, saturou } = monitorRef.current;

      contexto.strokeStyle = COR_TOQUE;
      contexto.lineWidth = 2;
      for (const toque of toques) {
        if (toque < inicio) continue;
        contexto.beginPath();
        contexto.moveTo(x(toque), 0);
        contexto.lineTo(x(toque), altura);
        contexto.stroke();
      }

      const visiveis = curva.filter((p) => p.perfMs >= inicio);
      if (visiveis.length > 1) {
        let minimo = Infinity;
        let maximo = -Infinity;
        for (const p of visiveis) {
          minimo = Math.min(minimo, p.valor, p.limiar);
          maximo = Math.max(maximo, p.valor, p.limiar);
        }
        const faixa = Math.max(maximo - minimo, 1e-6);
        const y = (valor: number) => altura - 4 - ((valor - minimo) / faixa) * (altura - 8);

        contexto.setLineDash([4, 4]);
        contexto.strokeStyle = corTexto;
        contexto.lineWidth = 1;
        contexto.beginPath();
        visiveis.forEach((p, i) => (i === 0 ? contexto.moveTo(x(p.perfMs), y(p.limiar)) : contexto.lineTo(x(p.perfMs), y(p.limiar))));
        contexto.stroke();

        contexto.setLineDash([]);
        contexto.strokeStyle = corCurva;
        contexto.lineWidth = 1.5;
        contexto.beginPath();
        visiveis.forEach((p, i) => (i === 0 ? contexto.moveTo(x(p.perfMs), y(p.valor)) : contexto.lineTo(x(p.perfMs), y(p.valor))));
        contexto.stroke();
      }

      const nivel = nivelRef.current;
      if (nivel) {
        const fracao = Math.min(1, Math.max(0, (nivelDb - NIVEL_MINIMO_DB) / -NIVEL_MINIMO_DB));
        nivel.style.width = `${fracao * 100}%`;
        nivel.style.background = saturou || nivelDb > -3 ? COR_SATURACAO : COR_TOQUE;
      }
      setSaturou(saturou);
    };
    quadro = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(quadro);
  }, [monitorRef]);

  return (
    <div className="monitor-microfone">
      <canvas ref={canvasRef} className="monitor-microfone__grafico" />
      <div className="monitor-microfone__rodape">
        <span>Nível</span>
        <div className="monitor-microfone__nivel">
          <div ref={nivelRef} className="monitor-microfone__nivel-barra" />
        </div>
        <span>Toques detectados: {microfone.totalToques}</span>
        {saturou && (
          <button type="button" className="monitor-microfone__saturou" onClick={microfone.limparSaturacao}>
            Sinal saturou — afaste o microfone ou baixe o ganho ✕
          </button>
        )}
      </div>
    </div>
  );
}
