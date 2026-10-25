// Os testes criam e apagam usuários: rodam só no banco de TEST_DATABASE_URL, nunca no DATABASE_URL.
import 'dotenv/config'

const testDatabaseURL = process.env.TEST_DATABASE_URL

if (!testDatabaseURL) {
  throw new Error('Defina TEST_DATABASE_URL com um banco só para testes (veja o .env.example).')
}
if (testDatabaseURL === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL não pode ser o mesmo banco de DATABASE_URL.')
}

process.env.DATABASE_URL = testDatabaseURL
