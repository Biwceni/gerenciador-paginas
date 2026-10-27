import { randomBytes } from 'crypto'
import type { PayloadHandler } from 'payload'

import { inviteEmailHTML, inviteEmailSubject } from '../email/invite'
import { FALLBACK_SITE_NAME } from '../lib/site'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVITE_EXPIRATION = 7 * 24 * 60 * 60 * 1000

const fail = (message: string, status = 400) => Response.json({ errors: [{ message }] }, { status })

/**
 * `POST /api/users/invite`: cria a conta com uma senha aleatória (que ninguém sabe) e manda por
 * e-mail o link para a pessoa criar a dela. Só administrador convida; a criação passa pelo controle
 * de acesso normal da coleção (`overrideAccess: false`).
 */
export const inviteUser: PayloadHandler = async (req) => {
  if (req.user?.role !== 'admin') return fail('Só administradores podem convidar pessoas.', 403)

  const body = (await req.json?.().catch(() => null)) as {
    email?: unknown
    name?: unknown
    role?: unknown
  } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : ''
  const role = body?.role === 'admin' ? 'admin' : 'editor'
  if (!EMAIL.test(email)) return fail('Confira o e-mail. Ex.: maria@seunegocio.com.br')

  const { totalDocs } = await req.payload.count({
    collection: 'users',
    where: { email: { equals: email } },
    overrideAccess: true,
    req,
  })
  if (totalDocs) return fail('Já existe uma pessoa com esse e-mail.')

  const doc = await req.payload.create({
    collection: 'users',
    data: { email, name: name || null, role, password: randomBytes(32).toString('base64url') },
    overrideAccess: false,
    req,
  })

  // Sem conseguir mandar o e-mail, a conta fica criada: dá para mandar de novo pelo
  // "Esqueceu a senha?" da tela de entrar.
  let emailSent = true
  try {
    const token = await req.payload.forgotPassword({
      collection: 'users',
      data: { email },
      disableEmail: true,
      expiration: INVITE_EXPIRATION,
      req,
    })
    const site = await req.payload.findGlobal({ slug: 'site', depth: 0, overrideAccess: true, req })
    const siteName = site.name || FALLBACK_SITE_NAME
    await req.payload.sendEmail({
      to: email,
      subject: inviteEmailSubject(siteName),
      html: inviteEmailHTML({
        token,
        siteName,
        invitedBy: req.user.name || req.user.email,
      }),
    })
  } catch (error) {
    req.payload.logger.error({ err: error }, 'Não deu para mandar o convite')
    emailSent = false
  }

  return Response.json({
    doc: { id: doc.id, email: doc.email, name: doc.name, role: doc.role },
    emailSent,
  })
}
