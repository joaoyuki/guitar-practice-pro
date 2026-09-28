import { useEffect, useRef, useState } from 'react';
import { tocarBipe } from '../../player/contagem';
import { calcularCompensacao, MINIMO_PARES_CALIBRACAO, type ResultadoCalibracao } from './calibracao';
import type { Microfone } from './useMicrofone';

const BPM = 80;
const CONTAGEM = 4;
const BATIDAS = 8;
const FREQUENCIA_CONTAGEM_HZ = 1320;
const MARGEM_INICIAL_SEG = 0.4;
const ESPERA_FINAL_MS = 500;

interface CalibracaoMicrofoneProps {
  microfone: Microfone;
  onCalibrado: (compensacaoMs: number) => void;
}

type Andamento = { fase: 'parado' } | { fase: 'contagem'; batida: number } | { fase: 'tocando'; batida: number };

export function CalibracaoMicrofone({ microfone, onCalibrado }: CalibracaoMicrofoneProps) {
  const [andamento, setAndamento] = useState<Andamento>({ fase: 'parado' });
  const [mensagem, setMensagem] = useState<string | null>(null);
  const cancelarRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelarRef.current?.(), []);

  function iniciar() {
    const captura = microfone.obterCaptura();
    if (!captura) return;
    const { ctx } = captura;
    const intervaloSeg = 60 / BPM;
    const inicio = ctx.currentTime + MARGEM_INICIAL_SEG;

    const temposCliques: number[] = [];
    for (let i = 0; i < CONTAGEM + BATIDAS; i++) {
      const quando = inicio + i * intervaloSeg;
      const ehContagem = i < CONTAGEM;
      tocarBipe(ctx, quando, ehContagem ? FREQUENCIA_CONTAGEM_HZ : undefined);
      if (!ehContagem) temposCliques.push(quando);
    }

    const toques: number[] = [];
    const cancelarAssinatura = microfone.assinar((toque) => toques.push(toque.perfBrutoMs));
    setMensagem(null);

    const intervalo = window.setInterval(() => {
      const batida = Math.floor((ctx.currentTime - inicio) / intervaloSeg);
      if (batida < CONTAGEM) setAndamento({ fase: 'contagem', batida: Math.max(0, batida) + 1 });
      else setAndamento({ fase: 'tocando', batida: Math.min(BATIDAS, batida - CONTAGEM + 1) });
    }, 50);

    const duracaoMs = (MARGEM_INICIAL_SEG + (CONTAGEM + BATIDAS) * intervaloSeg) * 1000 + ESPERA_FINAL_MS;
    const finalizar = window.setTimeout(() => {
      encerrar();
      const cliquesMs = temposCliques.map((t) => captura.contextTimeParaPerfMs(t));
      const resultado = calcularCompensacao(cliquesMs, toques);
      setMensagem(descrever(resultado, toques.length));
      if (resultado) onCalibrado(resultado.compensacaoMs);
    }, duracaoMs);

    function encerrar() {
      window.clearInterval(intervalo);
      window.clearTimeout(finalizar);
      cancelarAssinatura();
      cancelarRef.current = null;
      setAndamento({ fase: 'parado' });
    }
    cancelarRef.current = encerrar;
  }

  const ativo = microfone.estado === 'ativo';
  return (
    <div className="calibracao">
      {andamento.fase === 'parado' ? (
        <button type="button" onClick={iniciar} disabled={!ativo}>
          Calibrar este detector
        </button>
      ) : (
        <button type="button" onClick={() => cancelarRef.current?.()}>
          Cancelar
        </button>
      )}
      <span className="calibracao__status">
        {andamento.fase === 'contagem' && `Contagem ${andamento.batida}/${CONTAGEM}… prepare-se`}
        {andamento.fase === 'tocando' && `Toque junto com o bipe: ${andamento.batida}/${BATIDAS}`}
        {andamento.fase === 'parado' &&
          (mensagem ??
            `Toca ${CONTAGEM} bipes agudos de contagem e depois ${BATIDAS} bipes para você acompanhar palhetando uma corda.`)}
      </span>
    </div>
  );
}

function descrever(resultado: ResultadoCalibracao | null, toquesDetectados: number): string {
  if (!resultado) {
    return `Não deu para calibrar: só ${toquesDetectados} toque(s) detectado(s) perto dos bipes (mínimo ${MINIMO_PARES_CALIBRACAO}). Ajuste a sensibilidade e tente de novo.`;
  }
  const { compensacaoMs, pares, total, variacaoMs } = resultado;
  const aviso = variacaoMs > 20 ? ' Variação alta: vale repetir a calibração.' : '';
  return `Calibrado: ${compensacaoMs} ms de atraso (${pares}/${total} batidas, variação ±${variacaoMs} ms).${aviso}`;
}
