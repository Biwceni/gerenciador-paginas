import React from 'react'

/**
 * Aviso no alto de todas as páginas (extra do A2): uma linha na cor do site, acima do topo. Rola
 * junto com a página (só o topo fica preso). As páginas são estáticas: quando o dia escolhido passa
 * antes de a página ser gerada de novo, um script curto, lido junto com o aviso, o esconde antes de
 * aparecer (`hidden`; o React não mexe nesse atributo ao assumir a página).
 */
export function SiteNoticeView({ text, end }: { text: string; end?: number | null }) {
  return (
    <>
      <div className="site-notice" role="note" suppressHydrationWarning>
        <p className="container">{text}</p>
      </div>
      {end != null && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(s){var n=s&&s.previousElementSibling;if(n&&Date.now()>${end})n.hidden=true})(document.currentScript)`,
          }}
        />
      )}
    </>
  )
}
