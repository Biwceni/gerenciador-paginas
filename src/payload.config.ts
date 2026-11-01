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
import { Templates } from './collections/Templates'
import { Users } from './collections/Users'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { Site } from './globals/Site'
import { LOCKED_MESSAGE, NEW_PASSWORD_PATH, WRONG_LOGIN_MESSAGE } from './lib/auth'
import { EDITOR_VIEW_PATH } from './lib/editor'
import { getServerURL, PRODUCT_NAME } from './lib/site'
import { formsPlugin } from './plugins/forms'

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
    // Sem Gravatar: nenhum e-mail sai do painel para o gravatar.com. No menu lateral, a pessoa
    // aparece com as iniciais (PanelNav).
    avatar: 'default',
    // Datas das telas padrão (Mensagens, Avançado) no formato brasileiro.
    dateFormat: "dd/MM/yyyy 'às' HH:mm",
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ` | ${PRODUCT_NAME}`,
      description: `Painel do ${PRODUCT_NAME}`,
    },
    components: {
      graphics: {
        // O Payload só usa o Icon no começo do caminho de volta das telas padrão.
        Icon: '/components/admin/HomeCrumb#HomeCrumb',
        Logo: '/components/admin/Logo#Logo',
      },
      // Painel do leigo (fase 3): menu e tela inicial nossos, no visual do protótipo.
      Nav: '/components/panel/PanelNav#PanelNav',
      // Barra de topo do celular e do tablet (v2): ☰, nome do produto, Mensagens e Ver meu site.
      header: ['/components/panel/PanelTopBar#PanelTopBar'],
      providers: ['/components/panel/PanelFonts#PanelFonts'],
      views: {
        // Entrar e senha (v2): telas nossas no lugar das do Payload.
        login: {
          Component: '/components/auth/AuthViews#LoginView',
          meta: { title: 'Entrar' },
        },
        forgot: {
          Component: '/components/auth/AuthViews#ForgotView',
          meta: { title: 'Criar uma senha nova' },
        },
        createFirstUser: {
          Component: '/components/auth/AuthViews#FirstUserView',
          meta: { title: 'Crie sua conta' },
        },
        // Link dos e-mails de convite e de senha: /admin/nova-senha/<token>. Sem `:token` no
        // endereço e sem `exact`: só assim o Payload abre a tela para quem ainda não entrou.
        authNewPassword: {
          Component: '/components/auth/AuthViews#NewPasswordView',
          path: NEW_PASSWORD_PATH,
          meta: { title: 'Criar senha' },
        },
        dashboard: {
          Component: '/components/panel/Dashboard#Dashboard',
        },
        panelPages: {
          Component: '/components/panel/PagesView#PagesView',
          path: '/paginas',
          exact: true,
          meta: { title: 'Páginas' },
        },
        panelNewPage: {
          Component: '/components/panel/NewPageView#NewPageView',
          path: '/paginas/nova',
          exact: true,
          meta: { title: 'Nova página' },
        },
        panelPhotos: {
          Component: '/components/panel/PhotosView#PhotosView',
          path: '/fotos',
          exact: true,
          meta: { title: 'Fotos' },
        },
        panelMenu: {
          Component: '/components/panel/MenuView#MenuView',
          path: '/menu-e-rodape',
          exact: true,
          meta: { title: 'Menu e rodapé' },
        },
        panelSettings: {
          Component: '/components/panel/SettingsView#SettingsView',
          path: '/configuracoes',
          exact: true,
          meta: { title: 'Configurações' },
        },
        panelMessages: {
          Component: '/components/panel/MessagesView#MessagesView',
          path: '/mensagens',
          exact: true,
          meta: { title: 'Mensagens' },
        },
        panelForms: {
          Component: '/components/panel/FormsView#FormsView',
          path: '/formularios',
          exact: true,
          meta: { title: 'Formulários' },
        },
        panelFormEditor: {
          Component: '/components/panel/FormEditView#FormEditView',
          path: '/formularios/:id',
          meta: { title: 'Formulário' },
        },
        // Início guiado (fase 4), em tela cheia: tipo de site, modelo e o básico.
        panelStart: {
          Component: '/components/panel/StartView#StartView',
          path: '/comecar',
          exact: true,
          meta: { title: 'Começar o site' },
        },
        // Editor visual das páginas, em tela cheia: /admin/editor/<id>.
        pageEditor: {
          Component: '/components/editor/EditorView#EditorView',
          path: EDITOR_VIEW_PATH,
          meta: { title: 'Editor' },
        },
      },
    },
  },
  i18n: {
    fallbackLanguage: 'pt',
    supportedLanguages: { pt },
    translations: {
      pt: {
        error: {
          // As telas de entrar comparam com estas frases (`src/lib/auth.ts`).
          emailOrPasswordIncorrect: WRONG_LOGIN_MESSAGE,
          userLocked: LOCKED_MESSAGE,
        },
        general: {
          // A tradução do Payload chama o menu de "Cardápio" ("Abrir Cardápio" no botão ☰).
          menu: 'menu',
          email: 'E-mail',
          emailAddress: 'Endereço de e-mail',
          restoring: 'Restaurando…',
          time: 'Hora',
        },
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
  collections: [Pages, Media, Users, Templates],
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
    formsPlugin,
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
