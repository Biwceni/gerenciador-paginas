// Fila de envio: até `limit` itens ao mesmo tempo. Um item que falha não para os outros, e pode
// entrar de novo na fila. Não sabe nada de foto nem de React.

type Handlers<Item, Result> = {
  limit: number
  work: (item: Item) => Promise<Result>
  onStart: (item: Item) => void
  onDone: (item: Item, result: Result) => void
  onFail: (item: Item, error: unknown) => void
  /** A fila esvaziou. */
  onIdle: () => void
}

export function createQueue<Item, Result>(handlers: Handlers<Item, Result>) {
  const waiting: Item[] = []
  let running = 0

  const pump = () => {
    while (running < handlers.limit && waiting.length) {
      const item = waiting.shift() as Item
      running++
      handlers.onStart(item)
      handlers
        .work(item)
        .then(
          (result) => handlers.onDone(item, result),
          (error) => handlers.onFail(item, error),
        )
        .finally(() => {
          running--
          pump()
          if (!running && !waiting.length) handlers.onIdle()
        })
    }
  }

  return {
    add(items: Item[]) {
      waiting.push(...items)
      pump()
    },
    /** Nada subindo nem esperando. */
    idle: () => !running && !waiting.length,
  }
}
