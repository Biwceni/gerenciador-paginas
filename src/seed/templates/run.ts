// Uso: npm run modelos (grava na coleção Modelos os modelos que ainda não existem).
// npm run modelos -- atualizar regrava também os que já existem (pelo identificador), desfazendo o
// que tiver sido mudado neles pelo painel, e apaga os modelos de antes dos ramos (entrega 6,
// `RETIRED`). Modelo criado no painel fica, e o log avisa. Nenhuma página guarda de qual modelo veio,
// então apagar não afeta sites.
//
// Os modelos não são conteúdo de teste: são parte do produto e não aparecem no site enquanto
// ninguém os aplica. Por isso, ao contrário do `seed`, não pedem SEED_PERMITIDO.
import { getPayload } from 'payload'

import config from '../../payload.config'
import { templateSeeds } from './data'

/** Identificadores dos modelos de site de antes dos ramos (entrega 6), que o `atualizar` apaga. */
const RETIRED = [
  'cafe-aconchegante',
  'cafe-moderno',
  'saude-leve',
  'saude-classico',
  'servicos-confianca',
  'servicos-sobrio',
  'loja-delicado',
  'loja-alegre',
  'outro-simples',
  'outro-colorido',
  'onepage-claro',
  'onepage-terroso',
  'landing-energia',
  'landing-escuro',
  'evento-campo',
  'evento-festa',
  'pessoal-minimal',
  'pessoal-criativo',
  'links-cafe',
  'links-noite',
  'embreve-serra',
  'embreve-doce',
]

const update = process.argv.includes('atualizar')
const current = new Set(templateSeeds.map((seed) => seed.key))
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

let removed = 0
if (update) {
  // Só os modelos de antes dos ramos, gravados por este script. Modelo criado no painel fica.
  const { docs } = await payload.delete({
    collection: 'templates',
    where: { key: { in: RETIRED.filter((key) => !current.has(key)) } },
    overrideAccess: true,
  })
  removed = docs.length
  const { docs: others } = await payload.find({
    collection: 'templates',
    where: { key: { not_in: [...current] } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  if (others.length) {
    payload.logger.info(
      `Ficaram modelos que não são deste script (criados no painel?): ${others.map((doc) => doc.key).join(', ')}.`,
    )
  }
}

payload.logger.info(
  `Modelos: ${created} criados, ${updated} atualizados, ${removed} apagados, ${templateSeeds.length - created - updated} sem mudança.`,
)
process.exit(0)
