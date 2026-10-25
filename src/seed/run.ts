// Uso: npm run seed (cria as páginas de teste no banco do DATABASE_URL).
// npm run seed -- recriar apaga as páginas de teste e regrava configurações, cabeçalho e rodapé.
import { getPayload } from 'payload'

import config from '../payload.config'
import { seed } from './index'

const payload = await getPayload({ config })
await seed(payload, { recreate: process.argv.includes('recriar') })
payload.logger.info('Páginas de teste prontas.')
process.exit(0)
