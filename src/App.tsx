import { useEffect, useState } from 'react'
import './App.css'
import { paraAlphaTex } from './editor/alphaTexBuilder'
import { ExercicioForm } from './editor/ExercicioForm'
import type { Exercicio } from './editor/types'
import { TabViewer } from './player/TabViewer'
import { carregarConfiguracao, salvarConfiguracao } from './treino/microfone/configuracao'
import { MenuEntrada } from './treino/microfone/MenuEntrada'
import { useMicrofone } from './treino/microfone/useMicrofone'

function App() {
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
      <main>
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
    </>
  )
}

export default App
