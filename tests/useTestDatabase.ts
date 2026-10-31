// Os testes criam e apagam usuários: rodam só no banco de TEST_DATABASE_URL, nunca no DATABASE_URL.
import 'dotenv/config'

const testDatabaseURL = process.env.TEST_DATABASE_URL

if (!testDatabaseURL) {
  throw new Error('Defina TEST_DATABASE_URL com um banco só para testes (veja o .env.example).')
}
// O Playwright carrega este arquivo de novo em cada processo, que já herda o banco de testes.
if (!process.env.BANCO_DE_TESTE_ATIVO && testDatabaseURL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL não pode ser o mesmo banco de DATABASE_URL.')
}

process.env.DATABASE_URL = testDatabaseURL
process.env.BANCO_DE_TESTE_ATIVO = '1'
