import React from 'react'

import type { Components } from '@/puck/config'

// Cores do painel (claro ou escuro). Pelo `style`, que aceita variáveis do CSS.
const ACCENT = 'var(--gp-accent)'
const LINE = 'var(--gp-line)'
const ON_ACCENT = 'var(--gp-accent-ink)'

type BarProps = { x: number; y: number; w: number; h: number; r?: number; f?: string; o?: number }

const Bar = ({ x, y, w, h, r = 2, f = LINE, o }: BarProps) => (
  <rect height={h} opacity={o} rx={r} style={{ fill: f }} width={w} x={x} y={y} />
)

/** Desenho de cada seção na lista "Adicionar seção" (os mesmos do protótipo). */
const DRAWINGS: Record<keyof Components, React.ReactNode> = {
  Hero: (
    <>
      <Bar f={ACCENT} h={36} o={0.8} r={3} w={56} x={2} y={2} />
      <Bar f={ON_ACCENT} h={4} w={26} x={8} y={12} />
      <Bar f={ON_ACCENT} h={3} o={0.8} r={1.5} w={18} x={8} y={20} />
      <Bar f={ON_ACCENT} h={5} r={2.5} w={12} x={8} y={27} />
    </>
  ),
  TextImage: (
    <>
      <Bar f={ACCENT} h={4} w={24} x={4} y={10} />
      <Bar h={3} r={1.5} w={22} x={4} y={18} />
      <Bar h={3} r={1.5} w={18} x={4} y={24} />
      <Bar f={ACCENT} h={28} o={0.45} r={3} w={23} x={33} y={6} />
    </>
  ),
  // Sem caixas: ícone em linha, título e texto de cada destaque.
  Features: (
    <>
      {[4, 23, 42].map((x) => (
        <React.Fragment key={x}>
          <circle cx={x + 4} cy={11} fill="none" r={3.5} style={{ stroke: ACCENT }} />
          <Bar f={ACCENT} h={3} r={1.5} w={12} x={x} y={19} />
          <Bar h={2.5} r={1.25} w={14} x={x} y={25} />
          <Bar h={2.5} r={1.25} w={10} x={x} y={30} />
        </React.Fragment>
      ))}
    </>
  ),
  // Aspas grandes, o texto e o nome embaixo, sem caixa.
  Testimonials: (
    <>
      {[4, 33].map((x) => (
        <React.Fragment key={x}>
          <text fontSize={18} fontWeight={700} style={{ fill: ACCENT }} x={x} y={17}>
            “
          </text>
          <Bar h={3} r={1.5} w={22} x={x} y={19} />
          <Bar h={3} r={1.5} w={18} x={x} y={25} />
          <Bar f={ACCENT} h={3} r={1.5} w={10} x={x} y={32} />
        </React.Fragment>
      ))}
    </>
  ),
  // Linhas com divisória e a seta à direita.
  Faq: (
    <>
      {[8, 19, 30].map((y) => (
        <React.Fragment key={y}>
          <Bar h={3} r={1.5} w={34} x={6} y={y} />
          <path d={`M48 ${y}l2.5 2.5 2.5-2.5`} fill="none" style={{ stroke: ACCENT }} />
          <Bar h={0.8} r={0} w={48} x={6} y={y + 6} />
        </React.Fragment>
      ))}
    </>
  ),
  Gallery: (
    <>
      <Bar f={ACCENT} h={24} o={0.45} r={3} w={16} x={3} y={8} />
      <Bar f={ACCENT} h={24} o={0.65} r={3} w={16} x={22} y={8} />
      <Bar f={ACCENT} h={24} o={0.45} r={3} w={16} x={41} y={8} />
    </>
  ),
  CallToAction: (
    <>
      <Bar f={ACCENT} h={24} r={3} w={56} x={2} y={8} />
      <Bar f={ON_ACCENT} h={4} w={24} x={18} y={13} />
      <Bar f={ON_ACCENT} h={5} r={2.5} w={14} x={23} y={22} />
    </>
  ),
  Contact: (
    <>
      <Bar f={ACCENT} h={3} r={1.5} w={20} x={4} y={9} />
      <Bar h={3} r={1.5} w={16} x={4} y={16} />
      <Bar h={3} r={1.5} w={18} x={4} y={22} />
      <Bar h={28} r={3} w={25} x={31} y={6} />
      <circle cx={43} cy={18} r={4} style={{ fill: ACCENT }} />
    </>
  ),
  LinkList: (
    <>
      <circle cx={30} cy={8} r={5} style={{ fill: ACCENT }} />
      <Bar f={ACCENT} h={6} o={0.7} r={3} w={36} x={12} y={16} />
      <Bar f={ACCENT} h={6} o={0.7} r={3} w={36} x={12} y={25} />
      <Bar f={ACCENT} h={5} o={0.7} r={2.5} w={36} x={12} y={34} />
    </>
  ),
  Columns: (
    <>
      <Bar h={28} r={3} w={26} x={3} y={6} />
      <Bar h={28} r={3} w={26} x={31} y={6} />
      <Bar f={ACCENT} h={4} w={16} x={7} y={11} />
      <Bar f={ACCENT} h={18} o={0.45} w={18} x={35} y={11} />
    </>
  ),
  RichText: (
    <>
      <Bar f={ACCENT} h={5} w={30} x={6} y={7} />
      <Bar h={3} r={1.5} w={48} x={6} y={16} />
      <Bar h={3} r={1.5} w={44} x={6} y={22} />
      <Bar h={3} r={1.5} w={36} x={6} y={28} />
    </>
  ),
  Video: (
    <>
      <Bar f="#3b2d24" h={30} r={4} w={48} x={6} y={5} />
      <Bar f="#e02424" h={10} r={3} w={14} x={23} y={14} />
      <path d="M28 16.5v5l4-2.5z" fill="#fff" />
    </>
  ),
  Form: (
    <>
      <Bar h={7} w={40} x={10} y={5} />
      <Bar h={7} w={40} x={10} y={15} />
      <Bar f={ACCENT} h={9} r={4} w={40} x={10} y={25} />
    </>
  ),
  Privacy: (
    <>
      <path d="M30 5l9 3.5v7c0 5-4 8.5-9 10-5-1.5-9-5-9-10v-7z" style={{ fill: ACCENT }} />
      <Bar h={3} r={1.5} w={44} x={8} y={30} />
    </>
  ),
  // Faixa fina na cor do site, com as frases e a estrelinha entre elas.
  Announcement: (
    <>
      <Bar f={ACCENT} h={12} r={2} w={56} x={2} y={14} />
      <Bar f={ON_ACCENT} h={3} r={1.5} w={16} x={6} y={18.5} />
      <Bar f={ON_ACCENT} h={3} r={1.5} w={16} x={28} y={18.5} />
      <Bar f={ON_ACCENT} h={3} r={1.5} w={10} x={48} y={18.5} />
    </>
  ),
  // Três fotos em pé, com nome e preço embaixo.
  Products: (
    <>
      {[4, 23, 42].map((x) => (
        <React.Fragment key={x}>
          <Bar f={ACCENT} h={18} o={0.45} r={2} w={14} x={x} y={4} />
          <Bar h={2.5} r={1.25} w={12} x={x} y={25} />
          <Bar f={ACCENT} h={2.5} r={1.25} w={7} x={x} y={30} />
        </React.Fragment>
      ))}
    </>
  ),
  // Nome, pontilhado e preço, em linhas.
  PriceList: (
    <>
      <Bar f={ACCENT} h={4} w={20} x={6} y={5} />
      {[14, 22, 30].map((y) => (
        <React.Fragment key={y}>
          <Bar h={3} r={1.5} w={16} x={6} y={y} />
          <path
            d={`M24 ${y + 2}H44`}
            fill="none"
            strokeDasharray="1 2"
            strokeLinecap="round"
            style={{ stroke: LINE }}
          />
          <Bar f={ACCENT} h={3} r={1.5} w={8} x={46} y={y} />
        </React.Fragment>
      ))}
    </>
  ),
  // Fotos quadradas em fila e o botão de seguir.
  InstagramStrip: (
    <>
      <Bar f={ACCENT} h={3} r={1.5} w={18} x={4} y={7} />
      <Bar f={ACCENT} h={6} r={3} w={16} x={40} y={5} />
      {[4, 17, 30, 43].map((x, i) => (
        <Bar f={ACCENT} h={12} key={x} o={0.35 + (i % 2) * 0.25} r={2} w={12} x={x} y={18} />
      ))}
    </>
  ),
  ColumnText: (
    <>
      <Bar f={ACCENT} h={5} w={30} x={8} y={9} />
      <Bar h={3} r={1.5} w={44} x={8} y={19} />
      <Bar h={3} r={1.5} w={38} x={8} y={25} />
    </>
  ),
  ColumnImage: <Bar f={ACCENT} h={30} o={0.45} r={3} w={40} x={10} y={5} />,
  ColumnButton: <Bar f={ACCENT} h={12} r={6} w={32} x={14} y={14} />,
}

/** Uma frase curta do que cada seção é. */
export const SECTION_DESCRIPTIONS: Record<keyof Components, string> = {
  Hero: 'Título grande, frase e botão sobre uma foto',
  TextImage: 'Um parágrafo ao lado de uma imagem',
  Features: 'Três vantagens lado a lado',
  Testimonials: 'O que os clientes dizem',
  Faq: 'Perguntas que abrem a resposta',
  Gallery: 'Várias fotos em grade',
  CallToAction: 'Faixa colorida com um botão',
  Contact: 'Telefone, e-mail e mapa do site',
  LinkList: 'Botões grandes, como no “link na bio”',
  Columns: 'Duas ou três colunas com texto, foto ou botão',
  RichText: 'Um título e parágrafos, sem foto',
  Video: 'Um vídeo do YouTube na página',
  Form: 'Um dos seus formulários, para o visitante preencher',
  Privacy: 'Como você cuida dos dados, com o contato das Configurações',
  Announcement: 'Frase curta: promoção, temporada, horário',
  Products: 'Foto, nome, preço e botão de pedir',
  PriceList: 'Itens e valores, sem precisar de foto',
  InstagramStrip: 'Fotos escolhidas e botão de seguir',
  ColumnText: 'Título e parágrafo, dentro de uma coluna',
  ColumnImage: 'Uma foto, dentro de uma coluna',
  ColumnButton: 'Um botão, dentro de uma coluna',
}

export function SectionThumb({
  className = 'ed-palitem__thumb',
  type,
}: {
  className?: string
  type: keyof Components
}) {
  return (
    <svg aria-hidden="true" className={className} height="40" viewBox="0 0 60 40" width="60">
      {DRAWINGS[type]}
    </svg>
  )
}
