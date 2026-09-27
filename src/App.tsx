import { useState } from 'react'
import './App.css'
import { paraAlphaTex } from './editor/alphaTexBuilder'
import { ExercicioForm } from './editor/ExercicioForm'
import type { Exercicio } from './editor/types'
import { TabViewer } from './player/TabViewer'

function App() {
  const [exercicioAtivo, setExercicioAtivo] = useState<Exercicio | null>(null)

  return (
    <main>
      <ExercicioForm onCarregar={setExercicioAtivo} />
      {exercicioAtivo ? (
        <TabViewer alphaTex={paraAlphaTex(exercicioAtivo)} exercicio={exercicioAtivo} />
      ) : (
        <p className="app__sem-exercicio">
          Monte um exercício acima e clique em "Carregar no player".
        </p>
      )}
    </main>
  )
}

export default App
