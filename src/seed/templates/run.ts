// Uso: npm run modelos (grava na coleção Modelos os modelos que ainda não existem).
// npm run modelos -- atualizar regrava também os que já existem (pelo identificador), desfazendo o
// que tiver sido mudado neles pelo painel.
//
// Os modelos não são conteúdo de teste: são parte do produto e não aparecem no site enquanto
// ninguém os aplica. Por isso, ao contrário do `seed`, não pedem SEED_PERMITIDO.
import { getPayload } from 'payload'

import config from '../../payload.config'
import { templateSeeds } from './data'

const update = process.argv.includes('atualizar')
const payload = await getPayload({ config })

let created = 0
let updated = 0
for (const seed of templateSeeds) {
  const { docs } = await payload.find({
    collection: 'templates',
    where: { key: { equals: seed.key } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  if (!docs[0]) {
    await payload.create({ collection: 'templates', data: seed, overrideAccess: true })
    created++
  } else if (update) {
    await payload.update({
      collection: 'templates',
      id: docs[0].id,
      data: seed,
      overrideAccess: true,
    })
    updated++
  }
}

payload.logger.info(
  `Modelos: ${created} criados, ${updated} atualizados, ${templateSeeds.length - created - updated} sem mudança.`,
)
process.exit(0)
