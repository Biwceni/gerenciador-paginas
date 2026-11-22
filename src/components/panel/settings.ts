import { formatCNPJ, validateCNPJ } from '@/lib/company'
import { socialURL, validateSocial } from '@/lib/links'
import { type Motion, safeMotion } from '@/lib/motion'
import { relationID } from '@/lib/relations'
import type { SiteColors } from '@/lib/style-presets'
import { DEFAULT_COLORS, type Personality, safePersonality } from '@/lib/theme'
import { mainContact, siteUnits, toUnitData, type Unit, unitErrors } from '@/lib/units'
import type { Site } from '@/payload-types'

// Estado da tela Configurações e a conversão de/para o global `site`. Fica fora do componente
// para a tela do servidor e o editor no navegador usarem a mesma leitura.

export type SettingsState = {
  name: string
  tagline: string
  logo: number | null
  /** A3: o nome ao lado do logo no topo (desligado: só o logo). */
  showNameWithLogo: boolean
  /** E2: versão clara do logo e o que fazer com o logo sobre fundo escuro sem ela. */
  logoLight: number | null
  logoOnDark: 'auto' | 'white' | 'plate'
  homepage: number | null
  privacyPage: number | null
  colors: SiteColors
  personality: Personality
  motion: Motion
  fonts: { headings: string; body: string }
  contact: {
    /** D1: as unidades. A primeira é a principal (rodapé, topo, botões de WhatsApp). */
    units: Unit[]
    email: string
    /** Mensagem que já vem escrita no WhatsApp (W2). */
    whatsappMessage: string
  }
  /** Botão do WhatsApp no canto da tela, no celular e no computador (W1). */
  whatsappFloat: { phone: boolean; desktop: boolean }
  /** Logo que some no fundo do topo ou do rodapé: ganha contorno (T6, calculado em Sua marca). */
  logoRing: { header: boolean; footer: boolean }
  social: { instagram: string; facebook: string; youtube: string; tiktok: string; linkedin: string }
  seoDescription: string
  shareImage: number | null
  /** D3: dados da empresa, que o rodapé só lê. */
  company: { legalName: string; cnpj: string; responsible: string }
}

/** As configurações como a tela mostra (sem valor vira texto vazio). */
export function toSettingsState(site: Partial<Site>): SettingsState {
  return {
    name: site.name ?? '',
    tagline: site.tagline ?? '',
    logo: relationID(site.logo),
    showNameWithLogo: site.showNameWithLogo === true,
    logoLight: relationID(site.logoLight),
    logoOnDark:
      site.logoOnDark === 'white' || site.logoOnDark === 'plate' ? site.logoOnDark : 'auto',
    homepage: relationID(site.homepage),
    privacyPage: relationID(site.privacyPage),
    colors: { ...DEFAULT_COLORS, ...site.colors },
    personality: safePersonality(site.personality),
    motion: safeMotion(site.motion),
    fonts: { headings: site.fonts?.headings ?? '', body: site.fonts?.body ?? '' },
    contact: {
      units: siteUnits(site.contact),
      email: site.contact?.email ?? '',
      whatsappMessage: site.contact?.whatsappMessage ?? '',
    },
    whatsappFloat: {
      phone: site.contact?.whatsappFloat?.phone !== false,
      desktop: site.contact?.whatsappFloat?.desktop === true,
    },
    logoRing: {
      header: site.logoRing?.header === true,
      footer: site.logoRing?.footer === true,
    },
    social: {
      instagram: site.social?.instagram ?? '',
      facebook: site.social?.facebook ?? '',
      youtube: site.social?.youtube ?? '',
      tiktok: site.social?.tiktok ?? '',
      linkedin: site.social?.linkedin ?? '',
    },
    seoDescription: site.seoDescription ?? '',
    shareImage: relationID(site.shareImage),
    company: {
      legalName: site.company?.legalName ?? '',
      cnpj: site.company?.cnpj ?? '',
      responsible: site.company?.responsible ?? '',
    },
  }
}

/** As configurações como o Payload guarda (texto vazio vira "sem valor"). */
export function toSiteData(state: SettingsState) {
  const orNull = (value: string) => value.trim() || null
  return {
    name: state.name.trim(),
    tagline: orNull(state.tagline),
    logo: state.logo,
    showNameWithLogo: state.showNameWithLogo,
    logoLight: state.logoLight,
    logoOnDark: state.logoOnDark,
    homepage: state.homepage,
    privacyPage: state.privacyPage,
    colors: { ...state.colors, second: state.colors.second || null },
    personality: state.personality,
    motion: state.motion,
    fonts: { headings: orNull(state.fonts.headings), body: orNull(state.fonts.body) },
    contact: {
      units: state.contact.units.map(toUnitData),
      ...mainContact(state.contact.units),
      email: orNull(state.contact.email),
      whatsappMessage: orNull(state.contact.whatsappMessage),
      whatsappFloat: state.whatsappFloat,
    },
    logoRing: state.logoRing,
    social: {
      instagram: orNull(socialURL('instagram', state.social.instagram)),
      facebook: orNull(socialURL('facebook', state.social.facebook)),
      youtube: orNull(socialURL('youtube', state.social.youtube)),
      tiktok: orNull(socialURL('tiktok', state.social.tiktok)),
      linkedin: orNull(socialURL('linkedin', state.social.linkedin)),
    },
    seoDescription: orNull(state.seoDescription),
    shareImage: state.shareImage,
    company: {
      legalName: orNull(state.company.legalName),
      cnpj: orNull(formatCNPJ(state.company.cnpj)),
      responsible: orNull(state.company.responsible),
    },
  }
}

export type SiteData = ReturnType<typeof toSiteData>

/** Os dados da unidade principal, para as prévias (rodapé, topo) e o resumo da tela. */
export const mainOf = (state: Pick<SettingsState, 'contact'>) => mainContact(state.contact.units)

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Problemas que impedem salvar, por campo, em linguagem simples. */
export function validateSettings(state: SettingsState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!state.name.trim()) errors.name = 'Escreva o nome do negócio.'
  state.contact.units.forEach((unit, index) => {
    for (const [key, message] of Object.entries(unitErrors(unit, state.contact.units.length))) {
      errors[`unit-${index}-${key}`] = message
    }
  })
  if (state.contact.email && !EMAIL.test(state.contact.email.trim())) {
    errors.email = 'Confira o e-mail. Ex.: contato@seunegocio.com.br'
  }
  for (const key of ['instagram', 'facebook', 'youtube', 'tiktok', 'linkedin'] as const) {
    const result = validateSocial(key, state.social[key])
    if (result !== true) errors[key] = result
  }
  const cnpj = validateCNPJ(state.company.cnpj)
  if (cnpj !== true) errors.cnpj = cnpj
  return errors
}

/** A parte de Sua marca que o editor troca: personalidade, cores e letras (E8). */
export type SiteLook = Pick<SettingsState, 'personality' | 'colors' | 'fonts'>

export function lookOf(state: SettingsState): SiteLook {
  return { personality: state.personality, colors: state.colors, fonts: state.fonts }
}

const COLOR_KEYS = ['primary', 'background', 'surface', 'text', 'footer'] as const

/** Mesma personalidade, mesmas cores (sem diferença de maiúscula) e mesmas letras. */
export function sameLook(a: SiteLook, b: SiteLook): boolean {
  return (
    a.personality === b.personality &&
    COLOR_KEYS.every((key) => a.colors[key]?.toLowerCase() === b.colors[key]?.toLowerCase()) &&
    (a.colors.second || '').toLowerCase() === (b.colors.second || '').toLowerCase() &&
    a.fonts.headings.trim() === b.fonts.headings.trim() &&
    a.fonts.body.trim() === b.fonts.body.trim()
  )
}
