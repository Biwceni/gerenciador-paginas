'use client'

import '@/app/(frontend)/styles.css'

import { Render } from '@puckeditor/core'
import React, { useMemo } from 'react'

import { SiteFooterView, SiteHeaderView } from '@/components/site/SiteChrome'
import { themeStyle } from '@/components/site/theme'
import type { FormDefinition } from '@/lib/forms'
import { fillPhotoSlots, ILLUSTRATION_SIZE, illustrationURL } from '@/lib/illustration'
import { fillExamples, templatePersonality } from '@/lib/templates'
import type { Media, Template } from '@/payload-types'
import { sectionAnchors } from '@/puck/anchors'
import { renderConfig } from '@/puck/config'
import { type ContentMetadata, mainHeadingID } from '@/puck/references'
import type { PuckPageData } from '@/puck/schema'

import { SiteFrame } from './SiteFrame'

/** O que a prévia precisa de um modelo de site: a primeira página e o visual dele. */
export type TemplatePreviewData = Pick<
  Template,
  'photos' | 'forms' | 'site' | 'header' | 'footer'
> & {
  id: number
  /** O identificador: leva a personalidade sugerida (`templatePersonality`). */
  key?: string
  name: string
  description: string | null
  home: { title: string; campaign: boolean; data: PuckPageData }
  pageTitles: string[]
}

const googleFontCSS = (name: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}&display=swap`

/**
 * Página inicial de um modelo como vai ficar no site, com o nome e a cidade nos textos de exemplo,
 * a personalidade sugerida e uma ilustração nas cores do site no lugar de cada foto (os modelos não
 * trazem foto: o lugar fica para as fotos da pessoa). Os links têm destinos de mentira, mas válidos
 * (o site esconde link com endereço inseguro, como "#"); a prévia não deixa clicar em nada. Só para
 * ver.
 */
export function TemplatePreview({
  template,
  name,
  city,
  width = 1100,
}: {
  template: TemplatePreviewData
  /** Nome digitado no início guiado; sem ele, o nome de exemplo do modelo. */
  name?: string
  /** Cidade digitada no início guiado; sem ela, "sua cidade". */
  city?: string
  width?: number
}) {
  const siteName = name?.trim() || template.site?.name || template.name
  const colors = template.site?.colors

  // Os textos com o nome e a cidade, e um número de foto em cada lugar de foto vazio.
  const page = useMemo(() => {
    const examples = { name: siteName, city: city ?? '' }
    return {
      ...fillPhotoSlots(fillExamples(template.home.data, examples)),
      footer: template.footer?.text ? fillExamples(template.footer.text, examples) : null,
      address: template.site?.address ? fillExamples(template.site.address, examples) : null,
    }
  }, [template, siteName, city])

  const metadata = useMemo<ContentMetadata>(() => {
    const photos = Object.fromEntries(
      Array.from({ length: page.count }, (_, index) => [
        index + 1,
        {
          id: index + 1,
          alt: '',
          url: illustrationURL(colors, index),
          ...ILLUSTRATION_SIZE,
        } as Media,
      ]),
    )
    const forms = Object.fromEntries(
      (template.forms ?? []).map((form, index): [number, FormDefinition] => [
        index + 1,
        {
          id: index + 1,
          title: form.title,
          successMessage: '',
          submitLabel: form.submitButtonLabel,
          fields: (form.fields ?? []).map((field) => ({
            type: field.type,
            name: field.name,
            label: field.label,
            required: Boolean(field.required),
            placeholder: '',
            options: [],
          })),
        },
      ]),
    )
    return {
      photos,
      forms,
      pageHrefs: Object.fromEntries(template.pageTitles.map((_, index) => [index + 1, '/'])),
      pageAnchors: {},
      anchors: sectionAnchors(page.data),
      whatsappHref: 'https://wa.me/',
      site: {
        name: siteName,
        logo: null,
        contact: { address: page.address, hours: template.site?.hours },
      },
      mainHeadingId: mainHeadingID(page.data),
    }
  }, [template, siteName, page, colors])

  const theme = themeStyle({
    colors,
    fonts: template.site?.fonts,
    personality: templatePersonality(template.key),
  }) as Record<string, string>
  const fonts = [template.site?.fonts?.headings, template.site?.fonts?.body].filter(
    (font): font is string => Boolean(font),
  )
  const items = (template.header?.items ?? []).map((item, index) => ({
    id: String(index),
    label: item.label,
    href: '/',
    current: false,
  }))
  const button = template.header?.button?.label
    ? { label: template.header.button.label, href: '/' }
    : null
  const campaign = template.home.campaign

  return (
    <SiteFrame
      fontFaces={null}
      stylesheets={[...new Set(fonts)].map(googleFontCSS)}
      theme={theme}
      title={`Prévia do modelo ${template.name}`}
      width={width}
    >
      <SiteHeaderView
        button={button}
        campaign={campaign}
        items={items}
        logo={null}
        name={siteName}
      />
      <main>
        <Render config={renderConfig} data={page.data} metadata={metadata} />
      </main>
      <SiteFooterView
        campaign={campaign}
        contact={{
          whatsapp: null,
          whatsappHref: null,
          email: null,
          address: page.address,
          hours: template.site?.hours ?? null,
        }}
        menu={template.footer?.showMenu !== false ? items : []}
        name={siteName}
        showContact={template.footer?.showContact !== false}
        social={[]}
        text={page.footer}
      />
    </SiteFrame>
  )
}
