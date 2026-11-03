import { normalizeWhatsApp, validateExternalURL, validateInstagram } from '@/lib/links'
import { relationID } from '@/lib/relations'
import type { SiteColors } from '@/lib/style-presets'
import { DEFAULT_COLORS } from '@/lib/theme'
import type { Site } from '@/payload-types'

// Estado da tela Configurações e a conversão de/para o global `site`. Fica fora do componente
// para a tela do servidor e o editor no navegador usarem a mesma leitura.

export type SettingsState = {
  name: string
  tagline: string
  logo: number | null
  homepage: number | null
  privacyPage: number | null
  colors: SiteColors
  fonts: { headings: string; body: string }
  contact: { whatsapp: string; phone: string; email: string; address: string; hours: string }
  social: { instagram: string; facebook: string; youtube: string; tiktok: string; linkedin: string }
  seoDescription: string
  shareImage: number | null
}

/** As configurações como a tela mostra (sem valor vira texto vazio). */
export function toSettingsState(site: Partial<Site>): SettingsState {
  return {
    name: site.name ?? '',
    tagline: site.tagline ?? '',
    logo: relationID(site.logo),
    homepage: relationID(site.homepage),
    privacyPage: relationID(site.privacyPage),
    colors: { ...DEFAULT_COLORS, ...site.colors },
    fonts: { headings: site.fonts?.headings ?? '', body: site.fonts?.body ?? '' },
    contact: {
      whatsapp: site.contact?.whatsapp ?? '',
      phone: site.contact?.phone ?? '',
      email: site.contact?.email ?? '',
      address: site.contact?.address ?? '',
      hours: site.contact?.hours ?? '',
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
  }
}

/** As configurações como o Payload guarda (texto vazio vira "sem valor"). */
export function toSiteData(state: SettingsState) {
  const orNull = (value: string) => value.trim() || null
  return {
    name: state.name.trim(),
    tagline: orNull(state.tagline),
    logo: state.logo,
    homepage: state.homepage,
    privacyPage: state.privacyPage,
    colors: state.colors,
    fonts: { headings: orNull(state.fonts.headings), body: orNull(state.fonts.body) },
    contact: {
      whatsapp: orNull(state.contact.whatsapp),
      phone: orNull(state.contact.phone),
      email: orNull(state.contact.email),
      address: orNull(state.contact.address),
      hours: orNull(state.contact.hours),
    },
    social: {
      instagram: orNull(state.social.instagram),
      facebook: orNull(state.social.facebook),
      youtube: orNull(state.social.youtube),
      tiktok: orNull(state.social.tiktok),
      linkedin: orNull(state.social.linkedin),
    },
    seoDescription: orNull(state.seoDescription),
    shareImage: state.shareImage,
  }
}

export type SiteData = ReturnType<typeof toSiteData>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Problemas que impedem salvar, por campo, em linguagem simples. */
export function validateSettings(state: SettingsState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!state.name.trim()) errors.name = 'Escreva o nome do negócio.'
  if (state.contact.whatsapp && !normalizeWhatsApp(state.contact.whatsapp)) {
    errors.whatsapp = 'Digite o número com DDD. Ex.: (31) 99999-0000.'
  }
  if (state.contact.email && !EMAIL.test(state.contact.email.trim())) {
    errors.email = 'Confira o e-mail. Ex.: contato@seunegocio.com.br'
  }
  const instagram = validateInstagram(state.social.instagram)
  if (instagram !== true) errors.instagram = instagram
  for (const key of ['facebook', 'youtube', 'tiktok', 'linkedin'] as const) {
    const value = state.social[key].trim()
    const result = value ? validateExternalURL(value) : true
    if (result !== true) errors[key] = result
  }
  return errors
}
