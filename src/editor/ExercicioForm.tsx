import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { paraAlphaTex } from './alphaTexBuilder';
import { baixarExercicio, lerArquivoExercicio } from './exercicioArquivo';
import type { Compasso, Duracao, Exercicio, Nota } from './types';
import './ExercicioForm.css';

const DURACOES: { valor: Duracao; label: string }[] = [
  { valor: 1, label: 'semibreve' },
  { valor: 2, label: 'mínima' },
  { valor: 4, label: 'semínima' },
  { valor: 8, label: 'colcheia' },
  { valor: 16, label: 'semicolcheia' },
  { valor: 32, label: 'fusa' },
  { valor: 64, label: 'semifusa' },
];

function notaVazia(): Nota {
  return { corda: 6, casa: 0, duracao: 4 };
}

function compassoVazio(): Compasso {
  return { notas: [notaVazia()] };
}

function exercicioInicial(): Exercicio {
  return { bpm: 120, formula: [4, 4], compassos: [compassoVazio()] };
}

function numeroOu(valor: string, atual: number): number {
  const numero = Number(valor);
  return Number.isNaN(numero) ? atual : numero;
}

interface ExercicioFormProps {
  onCarregar: (exercicio: Exercicio) => void;
}

export function ExercicioForm({ onCarregar }: ExercicioFormProps) {
  const [exercicio, setExercicio] = useState<Exercicio>(exercicioInicial);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  function atualizar(proximo: Exercicio) {
    setExercicio(proximo);
  }

  function salvarEmArquivo() {
    baixarExercicio(exercicio);
  }

  function abrirSeletorDeArquivo() {
    inputArquivoRef.current?.click();
  }

  async function aoSelecionarArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;

    const resultado = await lerArquivoExercicio(arquivo);
    if (resultado.valido) {
      setErroArquivo(null);
      atualizar(resultado.exercicio);
    } else {
      setErroArquivo(resultado.erro);
    }
  }

  function atualizarBpm(valor: string) {
    atualizar({ ...exercicio, bpm: numeroOu(valor, exercicio.bpm) });
  }

  function atualizarFormula(indice: 0 | 1, valor: string) {
    const formula: [number, number] = [...exercicio.formula];
    formula[indice] = numeroOu(valor, formula[indice]);
    atualizar({ ...exercicio, formula });
  }

  function adicionarCompasso() {
    atualizar({ ...exercicio, compassos: [...exercicio.compassos, compassoVazio()] });
  }

  function removerCompasso(indiceCompasso: number) {
    atualizar({
      ...exercicio,
      compassos: exercicio.compassos.filter((_, i) => i !== indiceCompasso),
    });
  }

  function adicionarNota(indiceCompasso: number) {
    atualizar({
      ...exercicio,
      compassos: exercicio.compassos.map((compasso, i) =>
        i === indiceCompasso ? { notas: [...compasso.notas, notaVazia()] } : compasso,
      ),
    });
  }

  function removerNota(indiceCompasso: number, indiceNota: number) {
    atualizar({
      ...exercicio,
      compassos: exercicio.compassos.map((compasso, i) =>
        i === indiceCompasso
          ? { notas: compasso.notas.filter((_, j) => j !== indiceNota) }
          : compasso,
      ),
    });
  }

  function atualizarNota(indiceCompasso: number, indiceNota: number, proximaNota: Nota) {
    atualizar({
      ...exercicio,
      compassos: exercicio.compassos.map((compasso, i) =>
        i === indiceCompasso
          ? { notas: compasso.notas.map((nota, j) => (j === indiceNota ? proximaNota : nota)) }
          : compasso,
      ),
    });
  }

  return (
    <div className="exercicio-form">
      <h2>Montar exercício</h2>

      <div className="exercicio-form__metadados">
        <label>
          BPM
          <input
            type="number"
            min={20}
            max={300}
            value={exercicio.bpm}
            onChange={(e) => atualizarBpm(e.target.value)}
          />
        </label>

        <label>
          Fórmula de compasso
          <div className="exercicio-form__formula">
            <input
              type="number"
              min={1}
              max={32}
              value={exercicio.formula[0]}
              onChange={(e) => atualizarFormula(0, e.target.value)}
            />
            <span>/</span>
            <input
              type="number"
              min={1}
              max={32}
              value={exercicio.formula[1]}
              onChange={(e) => atualizarFormula(1, e.target.value)}
            />
          </div>
        </label>
      </div>

      <div className="exercicio-form__compassos">
        {exercicio.compassos.map((compasso, indiceCompasso) => (
          <fieldset key={indiceCompasso} className="exercicio-form__compasso">
            <legend>
              Compasso {indiceCompasso + 1}
              {exercicio.compassos.length > 1 && (
                <button
                  type="button"
                  className="exercicio-form__remover"
                  onClick={() => removerCompasso(indiceCompasso)}
                >
                  remover compasso
                </button>
              )}
            </legend>

            {compasso.notas.map((nota, indiceNota) => (
              <div key={indiceNota} className="exercicio-form__nota">
                <label>
                  Pausa
                  <input
                    type="checkbox"
                    checked={nota.casa === 'r'}
                    onChange={(e) =>
                      atualizarNota(indiceCompasso, indiceNota, {
                        ...nota,
                        casa: e.target.checked ? 'r' : 0,
                      })
                    }
                  />
                </label>

                <label>
                  Corda
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={nota.corda}
                    onChange={(e) =>
                      atualizarNota(indiceCompasso, indiceNota, {
                        ...nota,
                        corda: numeroOu(e.target.value, nota.corda),
                      })
                    }
                  />
                </label>

                <label>
                  Casa
                  <input
                    type="number"
                    min={0}
                    max={24}
                    disabled={nota.casa === 'r'}
                    value={nota.casa === 'r' ? '' : nota.casa}
                    onChange={(e) =>
                      atualizarNota(indiceCompasso, indiceNota, {
                        ...nota,
                        casa: numeroOu(e.target.value, nota.casa === 'r' ? 0 : nota.casa),
                      })
                    }
                  />
                </label>

                <label>
                  Duração
                  <select
                    value={nota.duracao}
                    onChange={(e) =>
                      atualizarNota(indiceCompasso, indiceNota, {
                        ...nota,
                        duracao: Number(e.target.value) as Duracao,
                      })
                    }
                  >
                    {DURACOES.map(({ valor, label }) => (
                      <option key={valor} value={valor}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Pontuada
                  <input
                    type="checkbox"
                    checked={nota.pontuada ?? false}
                    onChange={(e) =>
                      atualizarNota(indiceCompasso, indiceNota, {
                        ...nota,
                        pontuada: e.target.checked,
                      })
                    }
                  />
                </label>

                {compasso.notas.length > 1 && (
                  <button
                    type="button"
                    className="exercicio-form__remover"
                    onClick={() => removerNota(indiceCompasso, indiceNota)}
                  >
                    remover nota
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={() => adicionarNota(indiceCompasso)}>
              + nota
            </button>
          </fieldset>
        ))}
      </div>

      <button type="button" onClick={adicionarCompasso}>
        + compasso
      </button>

      <div className="exercicio-form__preview">
        <h3>Pré-visualização (alphaTex)</h3>
        <pre>{paraAlphaTex(exercicio)}</pre>
        <div className="exercicio-form__acoes">
          <button type="button" onClick={() => onCarregar(exercicio)}>
            Carregar no player
          </button>
          <button type="button" onClick={salvarEmArquivo}>
            Salvar em arquivo
          </button>
          <button type="button" onClick={abrirSeletorDeArquivo}>
            Fazer upload
          </button>
          <input
            ref={inputArquivoRef}
            type="file"
            accept=".json,application/json"
            className="exercicio-form__input-arquivo"
            onChange={aoSelecionarArquivo}
          />
        </div>
        {erroArquivo && (
          <p className="exercicio-form__erro" role="alert">
            {erroArquivo}
          </p>
        )}
      </div>
    </div>
  );
}
