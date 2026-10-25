// Uso: npm run seed (cria as páginas de teste no banco do DATABASE_URL).
// npm run seed -- recriar apaga as páginas de teste e regrava configurações, cabeçalho e rodapé.
//
// Só roda com SEED_PERMITIDO=1 (no .env do computador, nunca na Vercel) e nunca na produção:
// o seed escreve conteúdo de teste e o `recriar` regrava as configurações do site.
import { getPayload } from 'payload'

import config from '../payload.config'
import { seed } from './index'

const databaseHost = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host
  } catch {
    return 'desconhecido'
  }
})()

if (process.env.VERCEL_ENV === 'production' || process.env.SEED_PERMITIDO !== '1') {
  console.error(
    `O seed grava páginas de teste no banco ${databaseHost}. Para permitir, coloque SEED_PERMITIDO=1 ` +
      'no .env do computador (nunca na Vercel). Ele nunca roda na produção.',
  )
  process.exit(1)
}

const recreate = process.argv.includes('recriar')
console.info(
  `Banco: ${databaseHost}${recreate ? ' (recriar: apaga e regrava os dados de teste)' : ''}`,
)

const payload = await getPayload({ config })
await seed(payload, { recreate })
payload.logger.info('Páginas de teste prontas.')
process.exit(0)
