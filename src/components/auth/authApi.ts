'use client'

// Conversa das telas de entrar e senha com a API de autenticação do Payload. Diferente do
// `request` do editor, devolve o status: a tela de entrar precisa separar senha errada (401) de
// conta bloqueada, e a de senha nova precisa saber quando o link venceu (403).

export type AuthResult = { ok: true } | { ok: false; status: number; message: string }

export async function authRequest(
  apiRoute: string,
  path: string,
  body: Record<string, string>,
): Promise<AuthResult> {
  try {
    const response = await fetch(`${apiRoute}/users${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (response.ok) return { ok: true }
    const data = (await response.json().catch(() => ({}))) as {
      errors?: { message?: string; data?: { errors?: { message?: string }[] } }[]
    }
    const error = data.errors?.[0]
    return {
      ok: false,
      status: response.status,
      message: error?.data?.errors?.[0]?.message || error?.message || '',
    }
  } catch {
    return { ok: false, status: 0, message: 'Sem conexão com o servidor. Confira a internet.' }
  }
}
