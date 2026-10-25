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
import { Users } from './collections/Users'
import { getServerURL, PRODUCT_NAME } from './lib/site'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Sem as variáveis do Storage (ex.: rodando local sem Supabase), as fotos ficam na pasta /media.
const storageEnabled = Boolean(process.env.S3_BUCKET)

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
  collections: [Users, Media],
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
