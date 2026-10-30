import { describe, expect, it } from 'vitest'

import { Users } from '@/collections/Users'
import { inviteEmailHTML } from '@/email/invite'
import { resetPasswordEmailHTML } from '@/email/resetPassword'
import {
  LOCK_MINUTES,
  LOCKED_MESSAGE,
  MAX_LOGIN_ATTEMPTS,
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
