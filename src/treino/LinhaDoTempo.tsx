import type { ResultadoNota, TempoEsperado } from './ritmoEngine';
import './treino.css';

interface LinhaDoTempoProps {
  esperados: TempoEsperado[];
  resultados: ResultadoNota[];
  duracaoTotalMs: number;
  progressoMs: number;
}

function corDaClassificacao(resultado: ResultadoNota | undefined): string {
  if (!resultado) return 'linha-do-tempo__marca--pendente';
  if (resultado.classificacao === 'perfeito') return 'linha-do-tempo__marca--perfeito';
  if (resultado.classificacao === 'bom') return 'linha-do-tempo__marca--bom';
  return 'linha-do-tempo__marca--faltou';
}

export function LinhaDoTempo({ esperados, resultados, duracaoTotalMs, progressoMs }: LinhaDoTempoProps) {
  const total = duracaoTotalMs > 0 ? duracaoTotalMs : 1;

  return (
    <div className="linha-do-tempo">
      <div className="linha-do-tempo__trilha">
        {esperados.map((esperado) => {
          const resultado = resultados.find(
            (r) => r.compassoIndex === esperado.compassoIndex && r.notaIndex === esperado.notaIndex,
          );
          return (
            <div
              key={`${esperado.compassoIndex}-${esperado.notaIndex}`}
              className={`linha-do-tempo__marca ${corDaClassificacao(resultado)}`}
              style={{ left: `${(esperado.tempoMs / total) * 100}%` }}
              title={
                resultado?.desvioMs != null
                  ? `${resultado.desvioMs > 0 ? '+' : ''}${Math.round(resultado.desvioMs)}ms`
                  : undefined
              }
            />
          );
        })}
        <div
          className="linha-do-tempo__cursor"
          style={{ left: `${Math.min(100, (progressoMs / total) * 100)}%` }}
        />
      </div>
    </div>
  );
}
