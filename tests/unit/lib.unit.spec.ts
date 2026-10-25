import { describe, expect, it } from 'vitest'

import { contrastRatio, readableTextColor, safeColor } from '@/lib/colors'
import { isSafeURL, normalizeWhatsApp, validateExternalURL } from '@/lib/links'
import { slugify, validateSlug } from '@/lib/slug'

describe('slugify', () => {
  it('tira acentos, símbolos e espaços', () => {
    expect(slugify('Quem Somos & Nossa História')).toBe('quem-somos-nossa-historia')
    expect(slugify('  Serviços  ')).toBe('servicos')
    expect(slugify('Ação — Promoção 2026!')).toBe('acao-promocao-2026')
  })

  it('não deixa hífen no fim depois de cortar', () => {
    const slug = slugify(`${'a'.repeat(79)} b`)
    expect(slug.endsWith('-')).toBe(false)
    expect(slug.length).toBeLessThanOrEqual(80)
  })
})

describe('validateSlug', () => {
  it('aceita endereço simples', () => {
    expect(validateSlug('quem-somos')).toBe(true)
  })

  it('recusa endereços do sistema, vazios e fora do formato', () => {
    expect(validateSlug('admin')).not.toBe(true)
    expect(validateSlug('api')).not.toBe(true)
    expect(validateSlug('')).not.toBe(true)
    expect(validateSlug('Quem Somos')).not.toBe(true)
    expect(validateSlug('a/b')).not.toBe(true)
  })
})

describe('cores', () => {
  it('calcula contraste como a WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })

  it('escolhe texto claro em fundo escuro e escuro em fundo claro', () => {
    expect(readableTextColor('#1d4ed8')).toBe('#ffffff')
    expect(readableTextColor('#111827')).toBe('#ffffff')
    expect(readableTextColor('#fde047')).toBe('#111111')
    expect(readableTextColor('#ffffff')).toBe('#111111')
  })

  it('troca cor inválida pela padrão', () => {
    expect(safeColor('#ABCDEF', '#000000')).toBe('#abcdef')
    expect(safeColor('red; background: url(x)', '#000000')).toBe('#000000')
    expect(safeColor(null, '#000000')).toBe('#000000')
  })
})

describe('links', () => {
  it('aceita só endereços seguros', () => {
    expect(isSafeURL('https://instagram.com/x')).toBe(true)
    expect(isSafeURL('mailto:a@b.com')).toBe(true)
    expect(isSafeURL('tel:+5531999990000')).toBe(true)
    expect(isSafeURL('javascript:alert(1)')).toBe(false)
    expect(isSafeURL('instagram.com/x')).toBe(false)
    expect(validateExternalURL('')).not.toBe(true)
  })

  it('normaliza WhatsApp com o código do Brasil', () => {
    expect(normalizeWhatsApp('(31) 99999-0000')).toBe('5531999990000')
    expect(normalizeWhatsApp('+55 31 99999-0000')).toBe('5531999990000')
    expect(normalizeWhatsApp('3133330000')).toBe('553133330000')
    expect(normalizeWhatsApp('12345')).toBeNull()
  })
})
