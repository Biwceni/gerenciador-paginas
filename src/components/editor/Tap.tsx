/**
 * "Clique" no computador e "Toque" na tela de toque (rodada 2, F7): quem edita pelo celular não tem
 * mouse. A troca é pelo CSS (`pointer: coarse`), sem esperar o navegador responder.
 */
export function Tap({ lower = false }: { lower?: boolean }) {
  return (
    <>
      <span className="ed-mouse">{lower ? 'clique' : 'Clique'}</span>
      <span className="ed-touch">{lower ? 'toque' : 'Toque'}</span>
    </>
  )
}
