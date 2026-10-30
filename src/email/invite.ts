import { newPasswordURL } from '../lib/auth'
import { PRODUCT_NAME } from '../lib/site'

const escapeHTML = (text: string) => text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

export const inviteEmailSubject = (siteName: string) =>
  `Convite para cuidar do site ${siteName} | ${PRODUCT_NAME}`

/** Convite para o painel: o link leva para a tela de criar a senha (a mesma de "esqueci a senha",
 * com o título de convite). */
export const inviteEmailHTML = ({
  token,
  siteName,
  invitedBy,
}: {
  token: string
  siteName: string
  invitedBy: string
}) => {
  const url = newPasswordURL(token, 'invite')

  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5;">
    <p>Olá!</p>
    <p>${escapeHTML(invitedBy)} convidou você para cuidar do site <b>${escapeHTML(siteName)}</b>.</p>
    <p>Para entrar, crie a sua senha:</p>
    <p>
      <a href="${url}" style="display: inline-block; padding: 12px 20px; background: #0f6b55; color: #ffffff; text-decoration: none; border-radius: 6px;">
        Criar minha senha
      </a>
    </p>
    <p>Se o botão não funcionar, copie e cole este endereço no navegador:<br />${url}</p>
    <p>O link vale por 7 dias. Se não esperava este convite, pode ignorar este e-mail.</p>
  </body>
</html>`
}
