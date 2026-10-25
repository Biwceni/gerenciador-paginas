import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Users } from './collections/Users'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { Site } from './globals/Site'
import { getServerURL, PRODUCT_NAME } from './lib/site'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const STORAGE_ENV = [
  'S3_BUCKET',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_URL',
] as const
const missingStorageEnv = STORAGE_ENV.filter((name) => !process.env[name])

// Sem nenhuma variável do Storage, só em desenvolvimento, as fotos ficam na pasta /media.
// Na Vercel essa pasta é somente leitura e some a cada deploy, então lá todas são obrigatórias.
// Configuração pela metade gera endereços de foto quebrados, então também é erro.
if (
  missingStorageEnv.length > 0 &&
  (process.env.VERCEL || missingStorageEnv.length < STORAGE_ENV.length)
) {
  throw new Error(`Faltam variáveis do Storage: ${missingStorageEnv.join(', ')}`)
}
const storageEnabled = missingStorageEnv.length === 0

// Bucket das fontes do site (copiadas do Google ao publicar as configurações). Mesma regra:
// obrigatório na Vercel; no computador, sem as duas variáveis, o site usa os arquivos do Google.
const FONT_STORAGE_ENV = ['S3_FONTS_BUCKET', 'S3_FONTS_PUBLIC_URL'] as const
const missingFontEnv = FONT_STORAGE_ENV.filter((name) => !process.env[name])
if (
  missingFontEnv.length > 0 &&
  (process.env.VERCEL || missingFontEnv.length < FONT_STORAGE_ENV.length)
) {
  throw new Error(`Faltam variáveis do Storage das fontes: ${missingFontEnv.join(', ')}`)
}

export default buildConfig({
  serverURL: getServerURL(),
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ` | ${PRODUCT_NAME}`,
      description: `Painel do ${PRODUCT_NAME}`,
    },
    components: {
      graphics: {
        Icon: '/components/admin/Icon#Icon',
        Logo: '/components/admin/Logo#Logo',
      },
    },
  },
  i18n: {
    fallbackLanguage: 'pt',
    supportedLanguages: { pt },
    translations: {
      pt: {
        authentication: {
          backToLogin: 'Voltar para a tela de entrar',
          forgotPasswordEmailInstructions:
            'Digite seu e-mail. Vamos enviar um link para você criar uma nova senha.',
          logBackIn: 'Entrar novamente',
          login: 'Entrar',
          loginUser: 'Entrar',
        },
      },
    },
  },
  collections: [Pages, Media, Users],
  globals: [Site, Header, Footer],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
    // O banco só muda por migração, também em desenvolvimento: o Supabase de dev é o mesmo
    // das prévias da Vercel, que rodam migrações, e misturar os dois modos corrompe o histórico.
    push: false,
  }),
  // Sem RESEND_API_KEY, o Payload só escreve os e-mails no terminal (bom para desenvolver).
  email: process.env.RESEND_API_KEY
    ? resendAdapter({
        apiKey: process.env.RESEND_API_KEY,
        defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev',
        defaultFromName: process.env.EMAIL_FROM_NAME || PRODUCT_NAME,
      })
    : undefined,
  sharp,
  // Com envio direto ao Storage, este é o único limite que o servidor confere antes de assinar o envio.
  upload: {
    limits: {
      fileSize: 10_000_000,
    },
  },
  plugins: [
    s3Storage({
      enabled: storageEnabled,
      alwaysInsertFields: true,
      // Envio direto do navegador para o Storage: a função da Vercel limita o corpo a ~4,5 MB.
      clientUploads: true,
      collections: {
        media: {
          prefix: 'media',
          // Bucket público no Supabase: o site lê a foto direto do Storage, sem passar pelo Payload.
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) =>
            [process.env.S3_PUBLIC_URL, prefix, filename].filter(Boolean).join('/'),
        },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      },
    }),
  ],
})
