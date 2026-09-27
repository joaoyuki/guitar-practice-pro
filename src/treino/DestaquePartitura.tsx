import type * as alphaTab from '@coderline/alphatab';
import { obterBeat } from './alphaTabBounds';
import type { ResultadoNota } from './ritmoEngine';
import './treino.css';

interface DestaquePartituraProps {
  api: alphaTab.AlphaTabApi;
  score: alphaTab.model.Score;
  resultados: ResultadoNota[];
}

function corDaClassificacao(classificacao: ResultadoNota['classificacao']): string {
  if (classificacao === 'perfeito') return 'destaque-partitura__marca--perfeito';
  if (classificacao === 'bom') return 'destaque-partitura__marca--bom';
  return 'destaque-partitura__marca--faltou';
}

export function DestaquePartitura({ api, score, resultados }: DestaquePartituraProps) {
  return (
    <div className="destaque-partitura">
      {resultados.map((resultado) => {
        const beat = obterBeat(score, resultado.compassoIndex, resultado.notaIndex);
        const bounds = beat ? api.boundsLookup?.findBeat(beat) : null;
        if (!bounds) return null;

        return (
          <div
            key={`${resultado.compassoIndex}-${resultado.notaIndex}`}
            className={`destaque-partitura__marca ${corDaClassificacao(resultado.classificacao)}`}
            style={{
              left: bounds.visualBounds.x + bounds.visualBounds.w / 2,
              top: bounds.visualBounds.y,
            }}
          />
        );
      })}
    </div>
  );
}
