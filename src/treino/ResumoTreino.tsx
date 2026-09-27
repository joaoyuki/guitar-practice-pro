import { resumirExecucao } from './ritmoEngine';
import type { ResultadoNota } from './ritmoEngine';
import './treino.css';

interface ResumoTreinoProps {
  resultados: ResultadoNota[];
}

export function ResumoTreino({ resultados }: ResumoTreinoProps) {
  if (resultados.length === 0) return null;
  const resumo = resumirExecucao(resultados);

  return (
    <div className="resumo-treino">
      <span className="resumo-treino__acerto">{resumo.acertoPercentual.toFixed(0)}% no tempo</span>
      <span className="resumo-treino__detalhe">
        {resumo.perfeitos} perfeitas · {resumo.bons} boas · {resumo.faltaram} faltando
      </span>
      {resumo.desvioMedioMs != null && (
        <span className="resumo-treino__detalhe">desvio médio: {Math.round(resumo.desvioMedioMs)}ms</span>
      )}
    </div>
  );
}
