import { describe, expect, it } from 'vitest'

import { nameProblem } from '@/components/auth/FirstUserForm'
import { passwordMissing } from '@/components/auth/PasswordFields'
import { Users } from '@/collections/Users'
import { inviteEmailHTML } from '@/email/invite'
import { resetPasswordEmailHTML } from '@/email/resetPassword'
import {
  emailProblem,
  LOCK_MINUTES,
  LOCKED_MESSAGE,
  MAX_LOGIN_ATTEMPTS,
  passwordProblem,
  passwordRules,
  WRONG_LOGIN_MESSAGE,
} from '@/lib/auth'
import config from '@/payload.config'

describe('senha errada', () => {
  it('diz os números do bloqueio da coleção, sem contar tentativas nem citar o e-mail', () => {
    expect(WRONG_LOGIN_MESSAGE).toBe(
      'E-mail ou senha errados. Depois de 5 tentativas, a entrada fica bloqueada por 10 minutos.',
    )
    const auth = Users.auth as { maxLoginAttempts: number; lockTime: number }
    expect(auth.maxLoginAttempts).toBe(MAX_LOGIN_ATTEMPTS)
    expect(auth.lockTime).toBe(LOCK_MINUTES * 60 * 1000)
    expect(WRONG_LOGIN_MESSAGE).not.toMatch(/resta|ainda|cadastrad|não existe/i)
  })

  it('é a resposta do Payload para senha errada e para conta bloqueada', async () => {
    const translations = (await config).i18n.translations as {
      pt: { error: Record<string, string> }
    }
    expect(translations.pt.error.emailOrPasswordIncorrect).toBe(WRONG_LOGIN_MESSAGE)
    expect(translations.pt.error.userLocked).toBe(LOCKED_MESSAGE)
    // A tela separa as duas pela frase: elas não podem ser iguais.
    expect(LOCKED_MESSAGE).not.toBe(WRONG_LOGIN_MESSAGE)
  })
})

describe('links dos e-mails', () => {
  it('o esqueci a senha leva para a tela nova, sem a marca de convite', () => {
    const html = resetPasswordEmailHTML({ token: 'abc123' })
    expect(html).toContain('/admin/nova-senha/abc123"')
    expect(html).not.toContain('/admin/reset/')
    expect(html).not.toContain('#1d4ed8')
  })

  it('o convite leva para a mesma tela, com o título de convite', () => {
    const html = inviteEmailHTML({ token: 'abc123', siteName: 'Café', invitedBy: 'Fábio' })
    expect(html).toContain('/admin/nova-senha/abc123?convite=1"')
    expect(html).not.toContain('/admin/reset/')
  })
})

describe('regras da senha nova', () => {
  it('pedem 8 caracteres com letras e números', () => {
    expect(passwordRules('abc').every((rule) => rule.ok)).toBe(false)
    expect(passwordRules('abcdefgh').every((rule) => rule.ok)).toBe(false)
    expect(passwordRules('12345678').every((rule) => rule.ok)).toBe(false)
    expect(passwordRules('café2026').every((rule) => rule.ok)).toBe(true)
  })
})

describe('avisos dos campos de entrar', () => {
  it('são nossos, em português, e somem com o campo certo', () => {
    expect(emailProblem('')).toBe('Digite o seu e-mail.')
    expect(emailProblem('   ')).toBe('Digite o seu e-mail.')
    expect(emailProblem('fabio')).toBe('Confira o e-mail. Ex.: nome@exemplo.com.br')
    expect(emailProblem('fabio@exemplo')).toBe('Confira o e-mail. Ex.: nome@exemplo.com.br')
    expect(emailProblem(' fabio@exemplo.com.br ')).toBeNull()
    expect(passwordProblem('')).toBe('Digite a sua senha.')
    expect(passwordProblem('x')).toBeNull()
  })
})

// Avaliação Impeccable, rodada 1 (telas A2 a A7).
describe('telas de acesso (rodada 1 do Impeccable)', () => {
  it('antes de digitar, o motivo do botão desligado é um convite, não um erro', () => {
    expect(passwordMissing('', '')).toBe('Crie uma senha para continuar.')
    expect(passwordMissing('abc', '')).toBe('Siga as regras da senha acima.')
    expect(passwordMissing('senha1234', 'senha')).toBe('Repita a mesma senha no segundo campo.')
    expect(passwordMissing('senha1234', 'senha1234')).toBeNull()
  })

  it('a primeira conta pede o nome', () => {
    expect(nameProblem('')).toBe('Digite seu nome.')
    expect(nameProblem('   ')).toBe('Digite seu nome.')
    expect(nameProblem('Ana')).toBeNull()
  })

  it('sem acesso e fim da sessão usam as telas nossas', async () => {
    const views = (await config).admin.components?.views as Record<string, { Component?: string }>
    expect(views.unauthorized?.Component).toBe('/components/auth/AuthViews#UnauthorizedView')
    expect(views.inactivity?.Component).toBe('/components/auth/AuthViews#InactivityView')
  })

  it('os textos do Payload nestas telas ficam simples', async () => {
    const pt = (await config).i18n.translations as {
      pt: { general: Record<string, string>; authentication: Record<string, string> }
    }
    const texts = [
      pt.pt.general.notFound,
      pt.pt.general.nothingFound,
      pt.pt.general.sorryNotFound,
      pt.pt.general.backToDashboard,
      pt.pt.authentication.loggedOutSuccessfully,
      pt.pt.authentication.loggedOutInactivity,
      pt.pt.authentication.stayLoggedIn,
      pt.pt.authentication.youAreInactive,
    ]
    for (const text of texts) {
      expect(text).toBeTruthy()
      expect(text).not.toMatch(/requisição|log out|recurso|painel de controle/i)
    }
  })
})
