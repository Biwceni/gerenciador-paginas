'use client'

import type { TextFieldClientComponent } from 'payload'

import { FieldError, FieldLabel, useConfig, useField, useFormFields } from '@payloadcms/ui'
import React, { useEffect, useState } from 'react'

type Section = { id: string; label: string }

/** Seções da página com "Nome no menu", na ordem em que aparecem (o rascunho mais recente). */
function sectionsOf(content: unknown): Section[] {
  const items = (content as { data?: { content?: unknown } } | null)?.data?.content
  if (!Array.isArray(items)) return []
  return items.flatMap((item: { props?: { id?: unknown; menuLabel?: unknown } }) => {
    const label = typeof item?.props?.menuLabel === 'string' ? item.props.menuLabel.trim() : ''
    return label && typeof item.props?.id === 'string' ? [{ id: item.props.id, label }] : []
  })
}

/**
 * Escolha da seção num link do tipo "Uma seção de uma página": lista as seções da página escolhida
 * no campo ao lado que têm "Nome no menu" (só essas viram âncora no site).
 */
export const SectionSelectField: TextFieldClientComponent = ({ field, path }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({ path })
  const pagePath = path.replace(/section$/, 'page')
  const pageValue = useFormFields(([fields]) => fields[pagePath]?.value) as
    number | { id: number } | null | undefined
  const pageId = typeof pageValue === 'object' ? pageValue?.id : pageValue
  const {
    config: {
      routes: { api },
    },
  } = useConfig()
  const [sections, setSections] = useState<Section[] | null>(null)
  const inputId = `field-${path.replace(/\./g, '__')}`

  useEffect(() => {
    if (!pageId) return
    let active = true
    fetch(`${api}/pages/${pageId}?draft=true&depth=0`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((page) => active && setSections(sectionsOf(page?.content)))
      .catch(() => active && setSections([]))
    return () => {
      active = false
    }
  }, [api, pageId])

  const shown = pageId ? sections : []

  return (
    <div className="field-type text" style={{ marginBottom: 'var(--base)' }}>
      <FieldLabel htmlFor={inputId} label={field.label} path={path} required />
      <FieldError message={errorMessage} path={path} showError={showError} />
      <select
        disabled={!pageId || !shown?.length}
        id={inputId}
        onChange={(event) => setValue(event.target.value)}
        style={{ width: '100%', minHeight: 40, padding: '0 10px' }}
        value={value ?? ''}
      >
        <option value="">
          {!pageId
            ? 'Escolha a página primeiro'
            : shown === null
              ? 'Carregando…'
              : shown.length
                ? 'Escolha a seção'
                : 'Esta página não tem seções com nome no menu'}
        </option>
        {shown?.map((section) => (
          <option key={section.id} value={section.id}>
            {section.label}
          </option>
        ))}
      </select>
      <p className="field-description">
        No editor da página, dê um &quot;Nome no menu&quot; à seção para ela aparecer aqui.
      </p>
    </div>
  )
}
