import React from 'react'

import type { Components } from '@/puck/config'

const ACCENT = '#0f6b55'
const LINE = '#c9cfc6'

type BarProps = { x: number; y: number; w: number; h: number; r?: number; f?: string; o?: number }

const Bar = ({ x, y, w, h, r = 2, f = LINE, o }: BarProps) => (
  <rect fill={f} height={h} opacity={o} rx={r} width={w} x={x} y={y} />
)

/** Desenho de cada seção na lista "Adicionar seção" (os mesmos do protótipo). */
const DRAWINGS: Record<keyof Components, React.ReactNode> = {
  Hero: (
    <>
      <Bar f={ACCENT} h={36} o={0.8} r={3} w={56} x={2} y={2} />
      <Bar f="#fff" h={4} w={26} x={8} y={12} />
      <Bar f="#fff" h={3} o={0.8} r={1.5} w={18} x={8} y={20} />
      <Bar f="#fff" h={5} r={2.5} w={12} x={8} y={27} />
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
  Features: (
    <>
      <Bar h={24} r={3} w={16} x={3} y={8} />
      <Bar h={24} r={3} w={16} x={22} y={8} />
      <Bar h={24} r={3} w={16} x={41} y={8} />
      <circle cx={11} cy={15} fill={ACCENT} r={3} />
      <circle cx={30} cy={15} fill={ACCENT} r={3} />
      <circle cx={49} cy={15} fill={ACCENT} r={3} />
    </>
  ),
  Testimonials: (
    <>
      <Bar h={24} r={3} w={25} x={3} y={8} />
      <Bar h={24} r={3} w={25} x={32} y={8} />
      <text fill={ACCENT} fontSize={14} x={7} y={22}>
        “
      </text>
      <text fill={ACCENT} fontSize={14} x={36} y={22}>
        “
      </text>
    </>
  ),
  Faq: (
    <>
      <Bar h={7} w={48} x={6} y={7} />
      <Bar h={7} w={48} x={6} y={17} />
      <Bar h={7} w={48} x={6} y={27} />
      <path d="M49 9l2 2 2-2" fill="none" stroke={ACCENT} />
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
      <Bar f="#fff" h={4} w={24} x={18} y={13} />
      <Bar f="#fff" h={5} r={2.5} w={14} x={23} y={22} />
    </>
  ),
  Contact: (
    <>
      <Bar f={ACCENT} h={3} r={1.5} w={20} x={4} y={9} />
      <Bar h={3} r={1.5} w={16} x={4} y={16} />
      <Bar h={3} r={1.5} w={18} x={4} y={22} />
      <Bar h={28} r={3} w={25} x={31} y={6} />
      <circle cx={43} cy={18} fill={ACCENT} r={4} />
    </>
  ),
  LinkList: (
    <>
      <circle cx={30} cy={8} fill={ACCENT} r={5} />
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
  ColumnText: 'Título e parágrafo, dentro de uma coluna',
  ColumnImage: 'Uma foto, dentro de uma coluna',
  ColumnButton: 'Um botão, dentro de uma coluna',
}

export function SectionThumb({ type }: { type: keyof Components }) {
  return (
    <svg
      aria-hidden="true"
      className="ed-palitem__thumb"
      height="40"
      viewBox="0 0 60 40"
      width="60"
    >
      {DRAWINGS[type]}
    </svg>
  )
}
