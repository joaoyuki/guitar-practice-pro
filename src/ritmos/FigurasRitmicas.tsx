import { useState } from 'react';
import { CICLOS, GRUPOS, MODOS } from './figuras';
import type { Ciclo } from './figuras';
import { useReprodutorRitmo } from './useReprodutorRitmo';
import './FigurasRitmicas.css';

const arredondar = (v: number) => String(Math.round(v));

function marcas(ciclo: Ciclo): number[] {
  const passo = ciclo.tickStep === undefined ? (ciclo.L === 100 ? 25 : 50) : ciclo.tickStep;
  const valores = new Set([0, ciclo.L]);
  if (passo) for (let v = 0; v <= ciclo.L; v += passo) valores.add(v);
  ciclo.notes.forEach((n) => valores.add(n.at));
  return [...valores].sort((a, b) => a - b);
}

function legenda(ciclo: Ciclo): string {
  const partes: string[] = [];
  if (ciclo.L > 100) {
    partes.push(`Padrão de ${ciclo.L} (${String(ciclo.L / 100).replace('.', ',')} tempos). Linha tracejada = batida.`);
  }
  if (ciclo.notes.some((n) => n.rest)) partes.push('Bloco listrado = pausa.');
  return partes.join(' ');
}

export function FigurasRitmicas() {
  const [grupoId, setGrupoId] = useState(GRUPOS[0].id);
  const [modo, setModo] = useState(GRUPOS[0].modes[0]);
  const [bpm, setBpm] = useState(60);
  const [cliqueLigado, setCliqueLigado] = useState(true);
  const { tocando, quadro, alternar } = useReprodutorRitmo(modo, bpm, cliqueLigado);

  const grupo = GRUPOS.find((g) => g.id === grupoId) ?? GRUPOS[0];
  const seq = MODOS[modo].seq;
  const chave = quadro?.chave ?? seq[0];
  const ciclo = CICLOS[chave];
  const pos = quadro?.pos ?? 0;
  const tempoAtual = quadro ? quadro.indiceTempo % 4 : -1;

  const chavesDoGrupo: string[] = [];
  grupo.modes.forEach((m) =>
    MODOS[m].seq.forEach((k) => {
      if (!chavesDoGrupo.includes(k)) chavesDoGrupo.push(k);
    }),
  );

  function escolherGrupo(id: string) {
    const novo = GRUPOS.find((g) => g.id === id) ?? GRUPOS[0];
    setGrupoId(novo.id);
    setModo(novo.modes[0]);
  }

  return (
    <div className="ritmos">
      <p className="ritmos__lead">
        Cada tempo vale 100. A linha anda pelo padrão e recomeça quando ele termina. Linhas tracejadas verticais marcam as
        batidas e blocos listrados são pausas (silêncio). Para praticar com o microfone, use os arquivos de
        <code> exercicios/ritmos/ </code>
        na aba Exercícios ("Carregar arquivo").
      </p>

      <div className="ritmos__abas" role="tablist" aria-label="Grupos de figuras rítmicas">
        {GRUPOS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === grupoId}
            onClick={() => escolherGrupo(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <section className="ritmos__painel" aria-label="Escolha do ritmo">
        <div className="ritmos__modos" role="group" aria-label="Ritmo">
          {grupo.modes.map((m) => (
            <button key={m} type="button" aria-pressed={m === modo} onClick={() => setModo(m)}>
              {MODOS[m].label}
            </button>
          ))}
        </div>
        <p className="ritmos__desc">{MODOS[modo].desc}</p>
      </section>

      <section className="ritmos__painel" aria-label="Linha do tempo">
        <div className="ritmos__leitura">
          <div className="ritmos__pos">{Math.floor(pos)}</div>
          <div className="ritmos__pos-rotulo">
            {ciclo.L === 100 ? 'posição dentro do tempo' : 'posição no padrão (100 = um tempo)'}
            <br />
            tempo {(tempoAtual < 0 ? 0 : tempoAtual) + 1} de 4
          </div>
          <div className="ritmos__nome">{ciclo.name}</div>
        </div>

        <div className="ritmos__pista" key={chave}>
          {Array.from({ length: Math.ceil(ciclo.L / 100) - 1 }, (_, i) => (
            <div key={i} className="ritmos__divisor" style={{ left: `${(((i + 1) * 100) / ciclo.L) * 100}%` }} />
          ))}
          {ciclo.notes.map((n, i) => (
            <div
              key={i}
              className={
                'ritmos__bloco' +
                (n.rest ? ' ritmos__bloco--pausa' : '') +
                (quadro && pos >= n.at && pos < n.at + n.len ? ' ritmos__bloco--ativo' : '')
              }
              style={{ left: `${(n.at / ciclo.L) * 100}%`, width: `${(n.len / ciclo.L) * 100}%` }}
            >
              {n.len / ciclo.L >= 0.3 ? n.label : ''}
            </div>
          ))}
          <div className="ritmos__cursor" style={{ left: `${(pos / ciclo.L) * 100}%` }} />
        </div>

        <div className="ritmos__marcas">
          {marcas(ciclo).map((v) => (
            <span
              key={v}
              className={
                'ritmos__marca' +
                (v === 0 ? ' ritmos__marca--primeira' : v === ciclo.L ? ' ritmos__marca--ultima' : '') +
                (ciclo.notes.some((n) => !n.rest && Math.abs(n.at - v) < 1e-6) ? ' ritmos__marca--toca' : '')
              }
              style={{ left: `${(v / ciclo.L) * 100}%` }}
            >
              {arredondar(v)}
            </span>
          ))}
        </div>
        <p className="ritmos__legenda">{legenda(ciclo)}</p>

        <div className="ritmos__batidas" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={'ritmos__batida' + (i === tempoAtual ? ' ritmos__batida--ativa' : '')} />
          ))}
        </div>
      </section>

      <section className="ritmos__painel ritmos__controles" aria-label="Controles">
        <button type="button" className="ritmos__tocar" data-tocando={tocando} onClick={alternar}>
          {tocando ? 'Parar' : 'Tocar'}
        </button>
        <div className="ritmos__linha">
          <label htmlFor="ritmos-bpm">Andamento</label>
          <input
            id="ritmos-bpm"
            type="range"
            min={40}
            max={160}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <span className="ritmos__bpm">{bpm} BPM</span>
        </div>
        <div className="ritmos__linha">
          <label>
            <input type="checkbox" checked={cliqueLigado} onChange={(e) => setCliqueLigado(e.target.checked)} /> Clique do
            metrônomo em cada tempo
          </label>
        </div>
        <p className="ritmos__dica">
          Dica: comece em 60 BPM e bata o pé a cada batida. Com o clique ligado você ouve onde cada nota cai em relação ao
          tempo.
        </p>
      </section>

      <section className="ritmos__painel" aria-label="Resumo">
        <table className="ritmos__tabela">
          <thead>
            <tr>
              <th>Ritmo</th>
              <th>Toca em</th>
              <th>Duração de cada bloco</th>
              <th>Soma</th>
            </tr>
          </thead>
          <tbody>
            {chavesDoGrupo.map((k) => {
              const c = CICLOS[k];
              const inicios = c.notes.filter((n) => !n.rest).map((n) => arredondar(n.at));
              return (
                <tr key={k} className={seq.includes(k) ? 'ritmos__atual' : undefined}>
                  <td>{c.name}</td>
                  <td>{inicios.join(inicios.length === 2 ? ' e ' : ', ')}</td>
                  <td>{c.notes.map((n) => arredondar(n.len) + (n.rest ? ' (pausa)' : '')).join(' + ')}</td>
                  <td>{c.L}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
