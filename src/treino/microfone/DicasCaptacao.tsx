export function AvisoMetronomo() {
  return (
    <p className="aviso-microfone">
      <strong>Atenção ao som do app:</strong> se o metrônomo, o playback ou a contagem saírem pelo alto-falante, o
      microfone capta esse som e conta como se fosse você tocando (dando "perfeito" sem você tocar). Use{' '}
      <strong>fone de ouvido</strong> ou ative o modo <strong>Silencioso</strong> no treino.
    </p>
  );
}

export function DicasCaptacao() {
  return (
    <details className="dicas-captacao" open>
      <summary>Dicas para melhorar a captação</summary>
      <ul>
        <li>
          <strong>Fone com fio, não Bluetooth:</strong> fones Bluetooth atrasam o som em 150–300 ms, e esse atraso
          varia, então nem a calibração consegue corrigir direito.
        </li>
        <li>
          <strong>Microfone perto do violão/amplificador</strong> (20–30 cm), apontado para onde a palheta bate ou para a
          boca do violão / alto-falante do amp.
        </li>
        <li>
          <strong>Guitarra elétrica:</strong> o melhor é ligar direto numa interface de áudio e escolhê-la como
          dispositivo. Não pega ruído da sala. Prefira som limpo ou pouco drive: distorção pesada achata o ataque.
        </li>
        <li>
          <strong>Ambiente silencioso:</strong> conversa, batidas na mesa e bater o pé no chão podem virar toques.
        </li>
        <li>
          <strong>Abafe as cordas que você não está tocando</strong> e palhete com firmeza: notas que continuam soando
          escondem o ataque da próxima.
        </li>
        <li>
          <strong>Hammer-on, pull-off e slide</strong> quase não têm ataque e podem não ser detectados. Para treinar
          ritmo, palhete todas as notas.
        </li>
        <li>
          <strong>Ajuste a sensibilidade olhando o monitor:</strong> cada palhetada deve gerar exatamente um traço verde.
          Se aparecem traços sem você tocar, diminua; se faltam traços, aumente. A barra de nível não deve ficar
          vermelha.
        </li>
        <li>
          <strong>Calibre cada detector</strong> uma vez por dispositivo (e de novo se trocar de microfone ou fone). A
          calibração mede o atraso de entrada/saída de áudio e desconta de cada toque.
        </li>
        <li>
          Use o Chrome ou o Edge para a menor latência. O app já desliga o cancelamento de eco e a supressão de ruído do
          navegador, que atrasam e amortecem o ataque.
        </li>
      </ul>
    </details>
  );
}
