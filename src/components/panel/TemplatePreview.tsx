'use client'

import '@/app/(frontend)/styles.css'

import { Render } from '@puckeditor/core'
import React, { useMemo } from 'react'

import { SiteFooterView, SiteHeaderView } from '@/components/site/SiteChrome'
import { themeStyle } from '@/components/site/theme'
import type { FormDefinition } from '@/lib/forms'
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
  name: string
  description: string | null
  home: { title: string; campaign: boolean; data: PuckPageData }
  pageTitles: string[]
}

const googleFontCSS = (name: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}&display=swap`

/** Foto do banco de fotos em tamanho de prévia (o modelo guarda a de 1600 px). */
const smaller = (url: string) => url.replace(/([?&])w=\d+/, '$1w=900')

/**
 * Página inicial de um modelo como vai ficar no site, com as fotos vindas direto do banco de fotos
 * (ainda não estão na biblioteca). Os links têm destinos de mentira, mas válidos (o site esconde
 * link com endereço inseguro, como "#"); a prévia não deixa clicar em nada. Só para ver.
 */
export function TemplatePreview({
  template,
  name,
  width = 1100,
}: {
  template: TemplatePreviewData
  /** Nome digitado no início guiado; sem ele, o nome de exemplo do modelo. */
  name?: string
  width?: number
}) {
  const siteName = name?.trim() || template.site?.name || template.name

  const metadata = useMemo<ContentMetadata>(() => {
    const photos = Object.fromEntries(
      (template.photos ?? []).map((photo, index) => [
        index + 1,
        {
          id: index + 1,
          alt: photo.alt,
          url: smaller(photo.url),
          width: 1600,
          height: 1067,
        } as Media,
      ]),
    )
    const forms = Object.fromEntries(
      (template.forms ?? []).map((form, index): [number, FormDefinition] => [
        index + 1,
        {
          id: index + 1,
          title: form.title,
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
      anchors: sectionAnchors(template.home.data),
      whatsappHref: 'https://wa.me/',
      site: {
        name: siteName,
        logo: null,
        contact: { address: template.site?.address, hours: template.site?.hours },
      },
      mainHeadingId: mainHeadingID(template.home.data),
    }
  }, [template, siteName])

  const theme = themeStyle({
    colors: template.site?.colors,
    fonts: template.site?.fonts,
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
        <Render config={renderConfig} data={template.home.data} metadata={metadata} />
      </main>
      <SiteFooterView
        campaign={campaign}
        contact={{
          whatsapp: null,
          whatsappHref: null,
          email: null,
          address: template.site?.address ?? null,
          hours: template.site?.hours ?? null,
        }}
        menu={template.footer?.showMenu !== false ? items : []}
        name={siteName}
        showContact={template.footer?.showContact !== false}
        social={[]}
        text={template.footer?.text ?? null}
      />
    </SiteFrame>
  )
}
