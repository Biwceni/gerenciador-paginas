/**
 * Guarda um valor escolhido aos poucos (como a personalidade, trocada pelas setas do teclado): espera
 * um pouco depois da última troca, manda um pedido por vez e só o pedido mais recente avisa. Assim o
 * rascunho termina sempre com o último valor da tela, mesmo que um pedido antigo demore mais.
 */
export function createDraftSaver<T>({
  initial,
  save,
  onSaved,
  onFailed,
  delay = 400,
}: {
  /** O que já está guardado ao abrir. */
  initial: T
  save: (value: T) => Promise<void>
  /** Depois do pedido mais recente dar certo. */
  onSaved: (value: T) => void
  /** O pedido mais recente falhou: recebe o último valor que chegou a ser guardado. */
  onFailed: (lastSaved: T) => void
  delay?: number
}) {
  let saved = initial
  let latest = 0
  let waiting: { value: T; id: number } | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let queue: Promise<void> = Promise.resolve()

  const send = (): Promise<void> => {
    if (timer) clearTimeout(timer)
    timer = null
    const next = waiting
    waiting = null
    if (!next) return queue
    queue = queue.then(async () => {
      try {
        await save(next.value)
        saved = next.value
        if (next.id === latest) onSaved(next.value)
      } catch {
        if (next.id === latest) onFailed(saved)
      }
    })
    return queue
  }

  return {
    /** Uma troca na tela: guarda depois de `delay` sem outra troca. */
    change(value: T) {
      latest += 1
      waiting = { value, id: latest }
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void send(), delay)
    },
    /** Manda já o que estiver esperando (ao sair do editor) e espera a fila terminar. */
    flush: send,
    /** Para de esperar (o editor saiu da tela). */
    dispose() {
      if (timer) clearTimeout(timer)
      timer = null
    },
  }
}
