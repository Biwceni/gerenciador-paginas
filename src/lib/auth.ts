import { getServerURL } from './site'

// Entrar e senha: os números do bloqueio, as mensagens das telas e o endereço do link dos e-mails.
// Os mesmos números vão para a coleção de usuários (`auth` em `src/collections/Users.ts`).

export const MAX_LOGIN_ATTEMPTS = 5
export const LOCK_MINUTES = 10

/**
 * Senha errada ou e-mail sem conta: a mesma frase, sem dizer quantas tentativas restam nem se o
 * e-mail existe. O Payload responde com ela (tradução `error:emailOrPasswordIncorrect`).
 */
export const WRONG_LOGIN_MESSAGE = `E-mail ou senha errados. Depois de ${MAX_LOGIN_ATTEMPTS} tentativas, a entrada fica bloqueada por ${LOCK_MINUTES} minutos.`

/**
 * Conta bloqueada: a tela de entrar compara a resposta do Payload com esta frase (tradução
 * `error:userLocked`) para mostrar a tela de conta bloqueada.
 */
export const LOCKED_MESSAGE = `Conta bloqueada por ${LOCK_MINUTES} minutos depois de ${MAX_LOGIN_ATTEMPTS} tentativas com a senha errada.`

// Tela nossa de criar a senha. A `/admin/reset/<token>` do Payload não pode ser trocada; os links
// antigos que ainda apontam para ela são redirecionados para cá (`next.config.ts`).
export const NEW_PASSWORD_PATH = '/nova-senha'

/** Link do e-mail de convite ou de "esqueci a senha": a tela muda o título conforme a origem. */
export function newPasswordURL(token: string, origin: 'invite' | 'forgot'): string {
  const query = origin === 'invite' ? '?convite=1' : ''
  return `${getServerURL()}/admin${NEW_PASSWORD_PATH}/${encodeURIComponent(token)}${query}`
}

// Cookie de quem entrou no painel: sem dado nenhum, só diz que vale a pena o site perguntar ao
// servidor se a pessoa está logada (a barra "Voltar ao painel"). Quem decide é o `/users/me`; o
// cookie é visível e pode ser falsificado à vontade, sem abrir nada. Dura mais que a sessão: quando
// ela vence, a própria barra apaga o cookie.
const PANEL_COOKIE = 'gp-painel=1'
const PANEL_COOKIE_DAYS = 30

function writePanelCookie(value: string, maxAge: number) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

export function markPanelLogin() {
  writePanelCookie(PANEL_COOKIE, PANEL_COOKIE_DAYS * 24 * 60 * 60)
}

export function clearPanelLogin() {
  writePanelCookie('gp-painel=', 0)
}

export function hasPanelCookie(cookies: string): boolean {
  return cookies.split('; ').includes(PANEL_COOKIE)
}

/** A pessoa ainda está logada? Sessão vencida apaga o cookie; sem conexão, fica para a próxima. */
export async function checkPanelLogin(apiRoute: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiRoute}/users/me`, { credentials: 'include' })
    if (!response.ok) return false
    const { user } = (await response.json()) as { user?: unknown }
    if (!user) clearPanelLogin()
    return Boolean(user)
  } catch {
    return false
  }
}

export type PasswordRule = { ok: boolean; label: string }

/** As regras da senha nova, mostradas enquanto a pessoa digita. */
export function passwordRules(password: string): PasswordRule[] {
  return [
    { ok: password.length >= 8, label: 'Pelo menos 8 letras ou números' },
    { ok: /\d/.test(password) && /\p{L}/u.test(password), label: 'Letras e números misturados' },
  ]
}
