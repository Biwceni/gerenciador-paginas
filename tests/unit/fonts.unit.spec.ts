import { describe, expect, it } from 'vitest'

import { buildFontFaceCSS, parseGoogleCSS } from '@/lib/fonts'
import { instagramLink, validateInstagram } from '@/lib/links'

// Trecho no formato que o Google Fonts devolve.
const googleCSS = `/* cyrillic */
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/lora/v37/cyr.woff2) format('woff2');
  unicode-range: U+0400-045F;
}
/* latin */
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/lora/v37/lat.woff2) format('woff2');
  unicode-range: U+0000-00FF, U+0131;
}
/* latin-ext */
@font-face {
  font-family: 'Lora';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(https://evil.example/x.woff2) format('woff2');
  unicode-range: U+0100-02BA;
}`

describe('fontes', () => {
  it('fica só com as letras do português e com arquivos do Google', () => {
    const faces = parseGoogleCSS(googleCSS, 'Lora')
    expect(faces).toEqual([
      {
        family: 'Lora',
        style: 'normal',
        weight: '700',
        unicodeRange: 'U+0000-00FF, U+0131',
        src: 'https://fonts.gstatic.com/s/lora/v37/lat.woff2',
      },
    ])
  })

  it('monta o CSS com o endereço do nosso Storage', () => {
    const css = buildFontFaceCSS([
      {
        family: 'Lora',
        style: 'normal',
        weight: '400',
        unicodeRange: 'U+0000-00FF',
        src: 'https://s/f.woff2',
      },
    ])
    expect(css).toBe(
      '@font-face{font-family:"Lora";font-style:normal;font-weight:400;font-display:swap;src:url(https://s/f.woff2) format("woff2");unicode-range:U+0000-00FF}',
    )
  })

  it('descarta bloco com valor estranho', () => {
    const injected = googleCSS.replace('font-weight: 700', 'font-weight: 700} body{display:none')
    expect(parseGoogleCSS(injected, 'Lora')).toEqual([])
  })
})

describe('instagram', () => {
  it('aceita @perfil, perfil ou endereço', () => {
    expect(instagramLink('@cafegraomineiro')).toEqual({
      url: 'https://instagram.com/cafegraomineiro',
      label: '@cafegraomineiro',
    })
    expect(instagramLink('cafe.grao')?.url).toBe('https://instagram.com/cafe.grao')
    expect(instagramLink('https://www.instagram.com/cafe/')?.label).toBe('@cafe')
    expect(instagramLink('')).toBeNull()
    expect(validateInstagram('@cafe grao')).not.toBe(true)
    expect(validateInstagram('javascript:alert(1)')).not.toBe(true)
  })
})
