import { describe, expect, it } from 'vitest'

import { weakAlt } from '@/components/editor/PublishDialog'
import { createQueue } from '@/components/panel/photoQueue'
import { PHOTO_MAX_BYTES, photoLabel, photoProblem } from '@/lib/photos'

describe('que arquivo serve como foto', () => {
  it('aceita os tipos da biblioteca até 10 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']) {
      expect(photoProblem({ type, size: 6_000_000 })).toBeNull()
    }
    expect(photoProblem({ type: 'image/png', size: PHOTO_MAX_BYTES })).toBeNull()
  })

  it('recusa com uma frase simples o que não é foto e o que passa do limite', () => {
    expect(photoProblem({ type: 'application/pdf', size: 10 })).toContain('não é uma foto')
    // SVG pode carregar script e fica público no bucket.
    expect(photoProblem({ type: 'image/svg+xml', size: 10 })).toContain('não é uma foto')
    expect(photoProblem({ type: 'image/jpeg', size: PHOTO_MAX_BYTES + 1 })).toContain('10 MB')
  })
})

describe('foto sem descrição', () => {
  it('aparece pelo nome do arquivo', () => {
    expect(photoLabel({ alt: '', filename: 'loja.jpg' })).toBe('loja.jpg')
    expect(photoLabel({ alt: null, filename: 'loja.jpg' })).toBe('loja.jpg')
    expect(photoLabel({ alt: 'Fachada da loja', filename: 'loja.jpg' })).toBe('Fachada da loja')
  })

  it('o Publicar avisa quando a descrição está vazia', () => {
    expect(weakAlt(null)).toBe(true)
    expect(weakAlt('')).toBe(true)
    expect(weakAlt('   ')).toBe(true)
    expect(weakAlt('Fachada da loja')).toBe(false)
  })
})

describe('fila de envio', () => {
  const run = (limit: number, work: (item: string) => Promise<string>) => {
    const log = { done: [] as string[], failed: [] as string[], idle: 0, most: 0 }
    let running = 0
    let finish = () => {}
    const idle = new Promise<void>((resolve) => (finish = resolve))
    const queue = createQueue<string, string>({
      limit,
      work: async (item) => {
        running++
        log.most = Math.max(log.most, running)
        try {
          return await work(item)
        } finally {
          running--
        }
      },
      onStart: () => {},
      onDone: (item) => log.done.push(item),
      onFail: (item) => log.failed.push(item),
      onIdle: () => {
        log.idle++
        finish()
      },
    })
    return { idle, log, queue }
  }

  it('uma foto que falha não para as outras', async () => {
    const { idle, log, queue } = run(2, async (item) => {
      if (item === 'b') throw new Error('sem internet')
      return item
    })
    queue.add(['a', 'b', 'c', 'd'])
    await idle
    expect(log.done.sort()).toEqual(['a', 'c', 'd'])
    expect(log.failed).toEqual(['b'])
    expect(log.idle).toBe(1)
  })

  it('não passa do limite de envios ao mesmo tempo', async () => {
    const { idle, log, queue } = run(
      3,
      (item) => new Promise((resolve) => setTimeout(() => resolve(item), 5)),
    )
    queue.add(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
    await idle
    expect(log.most).toBe(3)
    expect(log.done).toHaveLength(7)
  })

  it('a que falhou pode entrar de novo na fila', async () => {
    let online = false
    const { idle, log, queue } = run(1, async (item) => {
      if (!online) throw new Error('sem internet')
      return item
    })
    queue.add(['a'])
    await idle
    expect(log.failed).toEqual(['a'])

    online = true
    queue.add(['a'])
    await expect.poll(() => log.done).toEqual(['a'])
    expect(log.idle).toBe(2)
  })
})
