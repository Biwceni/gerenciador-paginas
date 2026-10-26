// Migrações do banco no build (`npm run ci`).
//
// O banco é um só (Supabase de dev) para o computador, as prévias e a produção. Por isso as prévias
// da Vercel NÃO rodam migrações: uma branch ainda em revisão mudaria o banco do site no ar antes do
// merge. Só a produção da Vercel (e o computador) migram. Migração nova de uma branch é aplicada
// no computador, e precisa só acrescentar (nada de renomear ou apagar) até o merge.
import { execSync } from 'node:child_process'

if (process.env.VERCEL && process.env.VERCEL_ENV !== 'production') {
  console.info(`Prévia da Vercel (${process.env.VERCEL_ENV}): migrações não rodam (banco único).`)
  process.exit(0)
}

execSync('npm run payload -- migrate', { stdio: 'inherit' })
