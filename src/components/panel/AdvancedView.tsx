import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { ADVANCED_SCREENS, PANEL_PATHS, panelHref } from '@/lib/panel'

import { PanelTemplate, requireUser } from './PanelTemplate'

/**
 * Tela "Avançado" (`/admin/avancado`), só para administrador: link para as telas padrão do Payload
 * que não têm tela nossa. Segue o `vAdvanced` do protótipo.
 */
export function AdvancedView(props: AdminViewServerProps) {
  const { user, adminRoute } = requireUser(props, PANEL_PATHS.advanced)
  if (user.role !== 'admin') redirect(panelHref(adminRoute, 'dashboard'))

  return (
    <PanelTemplate {...props}>
      <div className="gp-page">
        <header className="gp-pagehead">
          <div>
            <h1>Avançado</h1>
            <p>Área técnica. As telas do dia a dia ficam no menu, de um jeito mais simples.</p>
          </div>
        </header>
        <p className="gp-warnbox">
          Mudanças aqui valem na hora e algumas não têm desfazer. Na dúvida, use as outras telas do
          painel.
        </p>
        <div className="gp-grid2">
          {ADVANCED_SCREENS.map(({ slug, text, title }) => (
            <section className="gp-card" key={slug}>
              <h2>{title}</h2>
              <p className="gp-small gp-muted">{text}</p>
              <div>
                <Link
                  className="gp-btn gp-btn--sm"
                  href={`${adminRoute}/collections/${slug}`}
                  prefetch={false}
                >
                  Abrir tela técnica
                </Link>
              </div>
            </section>
          ))}
        </div>
      </div>
    </PanelTemplate>
  )
}
