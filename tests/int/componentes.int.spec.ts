// @vitest-environment node
// (no jsdom, o Payload não reconhece o tipo do arquivo das fotos)
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

// Pacote de componentes (avaliação de 2026-11-14), no banco de TEST_DATABASE_URL.

let payload: Payload
const created: number[] = []

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYPj/HwADAgH/p+Fn4QAAAABJRU5ErkJggg==',
  'base64',
)

describe('A4: ponto de foco da foto', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  afterAll(async () => {
    for (const id of created) {
      await payload.delete({ collection: 'media', id, overrideAccess: true }).catch(() => null)
    }
  })

  it('guarda o ponto escolhido sem mexer no arquivo nem na descrição', async () => {
    const photo = await payload.create({
      collection: 'media',
      data: { alt: 'Bolo de morango' },
      file: { data: png, mimetype: 'image/png', name: 'foco.png', size: png.length },
      overrideAccess: true,
    })
    created.push(photo.id)
    // Sem escolha, o centro.
    expect([photo.focalX, photo.focalY]).toEqual([50, 50])

    const moved = await payload.update({
      collection: 'media',
      id: photo.id,
      data: { focalX: 20, focalY: 75 },
      overrideAccess: true,
    })
    expect([moved.focalX, moved.focalY]).toEqual([20, 75])
    expect(moved.filename).toBe(photo.filename)
    expect(moved.url).toBe(photo.url)
    expect(moved.alt).toBe('Bolo de morango')
  })

  it('quem não entrou não muda o ponto', async () => {
    const photo = await payload.create({
      collection: 'media',
      data: {},
      file: { data: png, mimetype: 'image/png', name: 'foco-anon.png', size: png.length },
      overrideAccess: true,
    })
    created.push(photo.id)
    await expect(
      payload.update({
        collection: 'media',
        id: photo.id,
        data: { focalX: 10, focalY: 10 },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
