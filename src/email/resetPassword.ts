import { newPasswordURL } from '../lib/auth'
import { PRODUCT_NAME } from '../lib/site'

export const resetPasswordEmailSubject = () => `Criar uma nova senha | ${PRODUCT_NAME}`

export const resetPasswordEmailHTML = (args?: { token?: string }) => {
  const url = newPasswordURL(args?.token ?? '', 'forgot')

  return `<!doctype html>
<html lang="pt-BR">
  <body style="font-family: Arial, sans-serif; color: #1f2933; line-height: 1.5;">
    <p>Olá!</p>
    <p>Recebemos um pedido para criar uma nova senha no painel do seu site.</p>
    <p>
      <a href="${url}" style="display: inline-block; padding: 12px 20px; background: #0f6b55; color: #ffffff; text-decoration: none; border-radius: 6px;">
        Criar nova senha
      </a>
    </p>
    <p>Se o botão não funcionar, copie e cole este endereço no navegador:<br />${url}</p>
    <p>O link vale por 1 hora. Se não foi você que pediu, pode ignorar este e-mail: sua senha continua a mesma.</p>
  </body>
</html>`
}
