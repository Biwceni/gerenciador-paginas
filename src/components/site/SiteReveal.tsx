'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/** Quanto da seção precisa estar na tela para a animação dela tocar. */
const ROOT_MARGIN = '0px 0px -12% 0px'

/**
 * Animação das seções (achados 12.1 a 12.4). Cada seção toca a animação dela uma vez, sozinha e por
 * tempo, quando entra na tela, e fica inteira: não anda mais junto com a rolagem nem para no meio.
 * O mesmo em todo navegador com `IntersectionObserver`.
 *
 * Só esconde o que ainda está fora da tela, e só depois que este código rodou: sem JavaScript, com
 * o pedido de menos movimento ou nas prévias do editor, nada fica escondido. O banner continua
 * tocando ao abrir a página, pelo CSS.
 */
export function SiteReveal() {
  const pathname = usePathname()

  useEffect(() => {
    if (!document.body.hasAttribute('data-animate')) return
    if (typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const sections = [...document.querySelectorAll<HTMLElement>('main .anim:not(.hero)')].filter(
      (section) => !section.classList.contains('anim-in'),
    )
    const play = (section: HTMLElement) => {
      section.classList.remove('anim-wait')
      section.classList.add('anim-in')
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          play(entry.target as HTMLElement)
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: ROOT_MARGIN },
    )
    const fold = window.innerHeight * 0.88
    for (const section of sections) {
      // O que já está na tela toca agora; o resto espera, escondido, até chegar.
      if (section.getBoundingClientRect().top < fold) play(section)
      else {
        section.classList.add('anim-wait')
        observer.observe(section)
      }
    }
    return () => {
      observer.disconnect()
      // Saindo da página no meio: nada fica escondido para sempre.
      for (const section of sections) section.classList.remove('anim-wait')
    }
  }, [pathname])

  return null
}
