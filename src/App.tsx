import { useEffect, useState } from 'react'
import './App.css'
import { paraAlphaTex } from './editor/alphaTexBuilder'
import { ExercicioForm } from './editor/ExercicioForm'
import type { Exercicio } from './editor/types'
import { FigurasRitmicas } from './ritmos/FigurasRitmicas'
import { TabViewer } from './player/TabViewer'
import { carregarConfiguracao, salvarConfiguracao } from './treino/microfone/configuracao'
import { MenuEntrada } from './treino/microfone/MenuEntrada'
import { useMicrofone } from './treino/microfone/useMicrofone'

function App() {
  const [aba, setAba] = useState<'exercicios' | 'ritmos'>('exercicios')
  const [exercicioAtivo, setExercicioAtivo] = useState<Exercicio | null>(null)
  const [configuracaoMicrofone, setConfiguracaoMicrofone] = useState(carregarConfiguracao)
  const microfone = useMicrofone(configuracaoMicrofone)

  useEffect(() => {
    salvarConfiguracao(configuracaoMicrofone)
  }, [configuracaoMicrofone])

  return (
    <>
      <MenuEntrada
        configuracao={configuracaoMicrofone}
        onMudar={setConfiguracaoMicrofone}
        microfone={microfone}
      />
      <nav className="app__abas" role="tablist" aria-label="Seções">
        <button type="button" role="tab" aria-selected={aba === 'exercicios'} onClick={() => setAba('exercicios')}>
          Exercícios
        </button>
        <button type="button" role="tab" aria-selected={aba === 'ritmos'} onClick={() => setAba('ritmos')}>
          Figuras rítmicas
        </button>
      </nav>
      {/* As duas seções ficam montadas; esconder preserva o exercício e o player. */}
      <main hidden={aba !== 'exercicios'}>
        <ExercicioForm onCarregar={setExercicioAtivo} />
        {exercicioAtivo ? (
          <TabViewer
            alphaTex={paraAlphaTex(exercicioAtivo)}
            exercicio={exercicioAtivo}
            fonteEntrada={configuracaoMicrofone.fonte}
            microfone={microfone}
          />
        ) : (
          <p className="app__sem-exercicio">
            Monte um exercício acima e clique em "Carregar no player".
          </p>
        )}
      </main>
      <main hidden={aba !== 'ritmos'}>{aba === 'ritmos' && <FigurasRitmicas />}</main>
    </>
  )
}

export default App
