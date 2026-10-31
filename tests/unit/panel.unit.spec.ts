import { describe, expect, it } from 'vitest'

import { type FinishInput, finishSteps, pageStatus, timeAgo } from '@/lib/panel'
import { uniqueSlug } from '@/lib/slug'
import {
  COLOR_PRESETS,
  contrastWarnings,
  formatRatio,
  normalizeFontName,
} from '@/lib/style-presets'

describe('finishSteps', () => {
  const pending: FinishInput = {
    tagline: ' ',
    whatsapp: null,
    email: '',
    examplePages: [
      { id: 7, title: 'Início' },
      { id: 9, title: 'Sobre' },
    ],
    examplePhotoPages: 1,
    home: { id: 7, live: false },
  }
  const done: FinishInput = {
    tagline: 'Café torrado toda semana.',
    whatsapp: '(31) 99999-0000',
    email: null,
    examplePages: [],
    examplePhotoPages: 0,
    home: { id: 7, live: true },
  }
  const doneKeys = (input: FinishInput) =>
    finishSteps(input)
      .filter((step) => step.done)
      .map((step) => step.key)

  it('são 5 passos, e nenhum está feito num site recém-montado', () => {
    const steps = finishSteps(pending)
    expect(steps.map((step) => step.key)).toEqual(['tagline', 'contact', 'texts', 'photos', 'home'])
    expect(doneKeys(pending)).toEqual([])
  })

  it('site pronto tem os 5 feitos', () => {
    expect(doneKeys(done)).toHaveLength(5)
  })

  it('cada passo olha só para o seu dado', () => {
    expect(doneKeys({ ...pending, tagline: 'Frase' })).toEqual(['tagline'])
    expect(doneKeys({ ...pending, examplePages: [] })).toEqual(['texts'])
    expect(doneKeys({ ...pending, examplePhotoPages: 0 })).toEqual(['photos'])
    expect(doneKeys({ ...pending, home: { id: 7, live: true } })).toEqual(['home'])
  })

  it('o contato vale com WhatsApp ou com e-mail', () => {
    expect(doneKeys({ ...pending, whatsapp: '(31) 99999-0000' })).toEqual(['contact'])
    expect(doneKeys({ ...pending, email: 'oi@cafe.com.br' })).toEqual(['contact'])
  })

  it('os botões levam ao lugar certo', () => {
    const targets = Object.fromEntries(finishSteps(pending).map((step) => [step.key, step.target]))
    expect(targets).toEqual({
      tagline: { screen: 'settings' },
      contact: { screen: 'settings' },
      texts: { page: 7 },
      photos: { screen: 'photos' },
      home: { page: 7 },
    })
  })

  it('sem página inicial, o último passo leva à lista de páginas', () => {
    const last = finishSteps({ ...pending, home: null }).at(-1)
    expect(last).toMatchObject({ done: false, target: { screen: 'pages' } })
  })
})

describe('uniqueSlug', () => {
  it('usa o nome quando o endereço está livre', () => {
    expect(uniqueSlug('Promoção de Inverno', ['contato'])).toBe('promocao-de-inverno')
  })

  it('acrescenta um número quando já existe', () => {
    expect(uniqueSlug('Contato', ['contato'])).toBe('contato-2')
    expect(uniqueSlug('Contato', ['contato', 'contato-2'])).toBe('contato-3')
  })

  it('não usa endereços do sistema nem fica vazio', () => {
    expect(uniqueSlug('Admin', [])).toBe('admin-2')
    expect(uniqueSlug('!!!', [])).toBe('pagina')
  })
})

describe('pageStatus', () => {
  it('fala como o leigo entende', () => {
    expect(pageStatus('draft', false)).toBe('draft')
    expect(pageStatus('published', true)).toBe('live')
    expect(pageStatus('draft', true)).toBe('changed')
  })
})

describe('timeAgo', () => {
  const now = Date.parse('2026-10-26T12:00:00Z')
  it('mostra minutos, horas e dias', () => {
    expect(timeAgo('2026-10-26T11:59:30Z', now)).toBe('agora mesmo')
    expect(timeAgo('2026-10-26T11:55:00Z', now)).toBe('há 5 min')
    expect(timeAgo('2026-10-26T09:00:00Z', now)).toBe('há 3 h')
    expect(timeAgo('2026-10-25T12:00:00Z', now)).toBe('há 1 dia')
    expect(timeAgo('2026-10-23T12:00:00Z', now)).toBe('há 3 dias')
  })
})

describe('estilo do site', () => {
  it('escreve o nome da fonte como o Google', () => {
    expect(normalizeFontName('  playfair   display ')).toBe('Playfair Display')
    expect(normalizeFontName('dm sans')).toBe('DM Sans')
  })

  it('avisa só das combinações difíceis de ler', () => {
    const good = COLOR_PRESETS[0].colors
    expect(contrastWarnings(good)).toEqual([])
    const bad = contrastWarnings({ ...good, text: '#cccccc' })
    expect(bad.map((warning) => warning.label)).toContain('Texto sobre o fundo')
  })

  it('arredonda o contraste para baixo', () => {
    expect(formatRatio(4.49)).toBe('4,4:1')
  })
})
