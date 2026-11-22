// @vitest-environment node
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cleanupFormFiles } from '@/hooks/formFiles'
import config from '@/payload.config'

// Etapa 4b, no banco de TEST_DATABASE_URL: unidades no global Site (D1) e a limpeza dos arquivos
// dos formulários (D2).

let payload: Payload
let savedContact: unknown
let formId: number

beforeAll(async () => {
  payload = await getPayload({ config })
  const site = await payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true })
  savedContact = site.contact
  const form = await payload.create({
    collection: 'forms',
    data: { title: `Arquivos ${Date.now()}`, fields: [] } as never,
    overrideAccess: true,
  })
  formId = form.id
})

afterAll(async () => {
  await payload.updateGlobal({
    slug: 'site',
    data: { contact: savedContact, _status: 'published' } as never,
    overrideAccess: true,
  })
  await payload.delete({
    collection: 'form-files',
    where: { form: { equals: formId } },
    overrideAccess: true,
  })
  await payload.delete({ collection: 'forms', id: formId, overrideAccess: true })
})

const saveContact = (contact: Record<string, unknown>) =>
  payload.updateGlobal({
    slug: 'site',
    data: { contact, _status: 'published' } as never,
    overrideAccess: true,
  })

describe('D1: unidades no global Site', () => {
  it('quem grava só o contato de sempre ganha a primeira unidade', async () => {
    await saveContact({ units: [], whatsapp: null, phone: null, address: null, hours: null })
    const site = await saveContact({
      whatsapp: '31999990000',
      address: 'Rua A, 1',
      hours: 'Seg a sex',
      units: [],
    })
    expect(site.contact?.units).toHaveLength(1)
    expect(site.contact?.units?.[0]).toMatchObject({
      whatsapp: '(31) 99999-0000',
      address: 'Rua A, 1',
      hoursNote: 'Seg a sex',
    })
    expect(site.contact?.whatsapp).toBe('(31) 99999-0000')
  })

  it('com a lista, os campos de sempre copiam a primeira; lista vazia limpa', async () => {
    const schedule = [null, ...Array(5).fill({ open: '09:00', close: '17:00' }), null]
    let site = await saveContact({
      units: [
        {
          name: 'Centro',
          phone: '3133334444',
          schedule,
          specials: [{ date: '2026-12-25', closed: true }, { date: 'x' }],
        },
        { name: 'Savassi', whatsapp: '31988887777' },
      ],
    })
    expect(site.contact?.phone).toBe('(31) 3333-4444')
    expect(site.contact?.whatsapp).toBeNull()
    expect(site.contact?.hours).toBe('Seg a sex, 9h às 17h')
    expect(site.contact?.units?.[0].specials).toEqual([
      { date: '2026-12-25', label: '', closed: true, open: '', close: '' },
    ])
    site = await saveContact({ units: [], whatsapp: null, phone: null, address: null, hours: null })
    expect(site.contact?.units).toEqual([])
    expect(site.contact?.address).toBeNull()
  })

  it('recusa duas unidades sem nome', async () => {
    await expect(saveContact({ units: [{ name: 'A' }, { name: '' }] })).rejects.toThrow()
  })
})

describe('D2: limpeza dos arquivos', () => {
  it('apaga os de mais de 90 dias e os pendentes de mais de um dia, e deixa os novos', async () => {
    const make = async (status: 'pending' | 'attached', daysAgo: number) => {
      const doc = await payload.create({
        collection: 'form-files',
        data: {
          form: formId,
          field: 'foto',
          filename: 'a.jpg',
          size: 1,
          key: `teste/${Math.random()}`,
          tokenHash: 'x',
          status,
        },
        overrideAccess: true,
      })
      const createdAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString()
      await payload.db.updateOne({ collection: 'form-files', id: doc.id, data: { createdAt } })
      return doc.id
    }
    const keep = [await make('attached', 89), await make('pending', 0.5)]
    const gone = [await make('attached', 91), await make('pending', 2)]
    expect(await cleanupFormFiles(payload)).toBeGreaterThanOrEqual(2)
    const { docs } = await payload.find({
      collection: 'form-files',
      where: { form: { equals: formId } },
      overrideAccess: true,
    })
    const ids = docs.map((doc) => doc.id)
    expect(ids).toEqual(expect.arrayContaining(keep))
    for (const id of gone) expect(ids).not.toContain(id)
  })
})
