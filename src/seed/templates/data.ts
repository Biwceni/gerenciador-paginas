import type { Template } from '../../payload-types'
import { CONTENT_VERSION, type PageComponent } from '../../puck/schema'
import { PRIVACY_TEMPLATE_KEY, PRIVACY_TITLE } from '../../lib/privacy'
import type { Segment, SiteType } from '../../lib/templates'
import { L_S, pageBuilder, toPage, toSection, whatsapp } from './sections'

// Os modelos da estreia, do protótipo navegável (`PACKS`, `KPACKS` e `TPLS`): 7 tipos de site, o
// "Site da empresa" com 5 ramos, 2 modelos (variações de cores, fontes e banner) cada um, e os 4
// modelos de página da "Nova página". `npm run modelos` grava tudo na coleção Modelos.

export type TemplateSeed = Omit<Template, 'id' | 'updatedAt' | 'createdAt'>

type Builder = ReturnType<typeof pageBuilder>
type Colors = NonNullable<Template['site']>['colors']

type Variant = {
  key: string
  name: string
  description: string
  colors: Colors
  fonts: { headings: string; body: string }
  hero?: { style: 'image' | 'light' | 'soft' | 'brand'; align: 'left' | 'center' }
}

type Pack = {
  key: string
  siteType: SiteType
  segment?: Segment
  site: { name: string; tagline: string; address: string; hours: string }
  /** Fotos do Pexels: [número da foto, texto alternativo]. A posição na lista é a usada nas seções. */
  photos: [number, string][]
  pages: { title: string; slug: string; build: (b: Builder) => PageComponent[] }[]
  /** Menu com links para seções da primeira página (sites de uma página só). Sem ele, as páginas. */
  menu?: [label: string, sectionId: string][]
  /** Página de campanha: sem menu e sem botão no topo. */
  campaign?: boolean
  button?: { label: string; section?: string }
  forms?: TemplateSeed['forms']
  variants: Variant[]
}

const pexels = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`

const colors = (
  primary: string,
  surface: string,
  background: string,
  text: string,
  footer: string,
) => ({
  primary,
  surface,
  background,
  text,
  footer,
})

const ADDRESS = 'Rua Lorem Ipsum, 100 · Centro · Cidade/UF'

const packs: Pack[] = [
  {
    key: 'cafe',
    siteType: 'institucional',
    segment: 'cafe',
    site: {
      name: 'Café Grão Mineiro',
      tagline: 'Café especial torrado toda semana, direto da Serra da Mantiqueira.',
      address: ADDRESS,
      hours: 'Seg a sáb, das 7h às 19h',
    },
    photos: [
      [773958, 'Grãos de café torrados'],
      [2396220, 'Xícara de cappuccino sobre a mesa de madeira'],
      [15032857, 'Fachada de uma cafeteria com janelas grandes'],
      [907142, 'Fatia de bolo no prato ao lado de uma xícara de café'],
      [30717831, 'Colheita de café num cafezal na encosta'],
      [12096080, 'Duas xícaras de café com desenho no leite'],
    ],
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 5, button: 'Conheça nossos cafés', link: toPage(3) }),
          b.features(),
          b.textImage({ image: 3, style: 'soft' }),
          b.testimonials({ style: 'light' }),
          b.cta({ button: 'Pedir pelo WhatsApp' }),
        ],
      },
      {
        title: 'Sobre nós',
        slug: 'sobre',
        build: (b) => [
          b.hero({ image: 6, button: 'Fale com a gente' }),
          b.textImage({ image: 5, side: 'left' }),
          b.gallery({ images: [1, 2, 4] }),
          b.cta({ button: 'Ver endereço', link: toPage(4) }),
        ],
      },
      {
        title: 'Nossos cafés',
        slug: 'nossos-cafes',
        build: (b) => [
          b.hero({ image: 1, button: 'Pedir pelo WhatsApp', style: 'brand', align: 'center' }),
          b.features(),
          b.faq({ style: 'soft' }),
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        build: (b) => [
          b.hero({ image: 3, button: 'Chamar no WhatsApp', style: 'soft' }),
          b.contact(),
        ],
      },
    ],
    button: { label: 'Pedir pelo WhatsApp' },
    variants: [
      {
        key: 'aconchegante',
        name: 'Aconchegante',
        description: 'Marrom café, títulos com serifa',
        colors: colors('#6b3f24', '#f5ebe0', '#fffdf9', '#2a211b', '#2a211b'),
        fonts: { headings: 'Lora', body: 'Figtree' },
        hero: { style: 'image', align: 'left' },
      },
      {
        key: 'moderno',
        name: 'Moderno',
        description: 'Claro e direto, laranja queimado',
        colors: colors('#b8562a', '#f3efe9', '#ffffff', '#1d1d1d', '#1d1d1d'),
        fonts: { headings: 'DM Sans', body: 'DM Sans' },
        hero: { style: 'brand', align: 'center' },
      },
    ],
  },
  {
    key: 'saude',
    siteType: 'institucional',
    segment: 'saude',
    site: {
      name: 'Clínica Sorriso Leve',
      tagline: 'Odontologia para toda a família, com atendimento sem pressa.',
      address: ADDRESS,
      hours: 'Seg a sex, 8h às 18h · sáb, 8h às 12h',
    },
    photos: [
      [6809634, 'Consultório odontológico claro com a cadeira azul'],
      [6627574, 'Paciente sorrindo e olhando o resultado no espelho'],
      [6129494, 'Equipe da clínica sorrindo'],
      [7108318, 'Recepção da clínica com pacientes sendo atendidos'],
    ],
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 1, button: 'Agendar avaliação' }),
          b.features(),
          b.textImage({ image: 4, style: 'soft' }),
          b.testimonials({ style: 'light' }),
          b.cta({ button: 'Agendar pelo WhatsApp' }),
        ],
      },
      {
        title: 'Tratamentos',
        slug: 'tratamentos',
        build: (b) => [
          b.hero({ image: 2, button: 'Agendar avaliação', style: 'brand', align: 'center' }),
          b.features(),
          b.faq({ style: 'soft' }),
        ],
      },
      {
        title: 'Quem somos',
        slug: 'quem-somos',
        build: (b) => [
          b.hero({ image: 3, button: 'Fale com a gente' }),
          b.textImage({ image: 3, side: 'left' }),
          b.gallery({ images: [1, 4, 2] }),
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        build: (b) => [
          b.hero({ image: 1, button: 'Chamar no WhatsApp', style: 'soft' }),
          b.contact(),
        ],
      },
    ],
    button: { label: 'Agendar consulta' },
    variants: [
      {
        key: 'leve',
        name: 'Leve',
        description: 'Verde-água, letras arredondadas',
        colors: colors('#2a7f8f', '#e6f3f4', '#fbfefe', '#16313a', '#16313a'),
        fonts: { headings: 'Nunito', body: 'Nunito' },
        hero: { style: 'image', align: 'left' },
      },
      {
        key: 'classico',
        name: 'Clássico',
        description: 'Azul sóbrio, títulos com serifa',
        colors: colors('#1f4e79', '#e8eef5', '#ffffff', '#18222d', '#142235'),
        fonts: { headings: 'Merriweather', body: 'Lato' },
        hero: { style: 'soft', align: 'left' },
      },
    ],
  },
  {
    key: 'servicos',
    siteType: 'institucional',
    segment: 'servicos',
    site: {
      name: 'Reforma Certa',
      tagline: 'Pequenas reformas e manutenção residencial com orçamento no mesmo dia.',
      address: ADDRESS,
      hours: 'Seg a sáb, das 7h às 18h',
    },
    photos: [
      [5194861, 'Chaves de boca, alicates e um martelo'],
      [1669754, 'Rolo de pintura passando tinta na parede'],
      [36153946, 'Profissionais pintando as paredes de uma casa'],
      [5493665, 'Profissional trabalhando na parede de uma casa'],
    ],
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 2, button: 'Pedir orçamento' }),
          b.features(),
          b.textImage({ image: 1, style: 'soft' }),
          b.testimonials({ style: 'light' }),
          b.cta({ button: 'Pedir orçamento' }),
        ],
      },
      {
        title: 'Serviços',
        slug: 'servicos',
        build: (b) => [
          b.hero({ image: 1, button: 'Pedir orçamento', style: 'brand', align: 'center' }),
          b.features(),
          b.faq({ style: 'soft' }),
        ],
      },
      {
        title: 'Como trabalhamos',
        slug: 'como-trabalhamos',
        build: (b) => [
          b.hero({ image: 4, button: 'Fale com a gente' }),
          b.textImage({ image: 4, side: 'left' }),
          b.gallery({ images: [2, 3, 1] }),
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        build: (b) => [
          b.hero({ image: 2, button: 'Chamar no WhatsApp', style: 'soft' }),
          b.contact(),
        ],
      },
    ],
    button: { label: 'Pedir orçamento' },
    variants: [
      {
        key: 'confianca',
        name: 'Confiança',
        description: 'Laranja forte, letras firmes',
        colors: colors('#c75f12', '#fdf0e6', '#ffffff', '#1f2328', '#1f2328'),
        fonts: { headings: 'Montserrat', body: 'Open Sans' },
        hero: { style: 'image', align: 'left' },
      },
      {
        key: 'sobrio',
        name: 'Sóbrio',
        description: 'Verde escuro, visual discreto',
        colors: colors('#2f5d3a', '#e8f0e4', '#fbfdf9', '#1e2a21', '#1e2a21'),
        fonts: { headings: 'Archivo', body: 'Archivo' },
        hero: { style: 'brand', align: 'left' },
      },
    ],
  },
  {
    key: 'loja',
    siteType: 'institucional',
    segment: 'loja',
    site: {
      name: 'Ateliê Fio de Lã',
      tagline: 'Peças de tricô e crochê feitas à mão, sob encomenda.',
      address: ADDRESS,
      hours: 'Ter a sáb, das 10h às 18h',
    },
    photos: [
      [7612424, 'Novelos de lã coloridos'],
      [10373508, 'Manta de tricô azul sobre o sofá'],
      [749353, 'Sacolas de presente de papel'],
      [19479498, 'Novelos de lã e agulhas de tricô'],
    ],
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 2, button: 'Ver produtos', link: toPage(2) }),
          b.gallery({ images: [2, 1, 3] }),
          b.features({ style: 'soft' }),
          b.testimonials({ style: 'light' }),
          b.cta({ button: 'Encomendar pelo WhatsApp' }),
        ],
      },
      {
        title: 'Produtos',
        slug: 'produtos',
        build: (b) => [
          b.hero({ image: 1, button: 'Encomendar', style: 'brand', align: 'center' }),
          b.gallery({ images: [1, 2, 3] }),
          b.faq({ style: 'soft' }),
        ],
      },
      {
        title: 'Nossa história',
        slug: 'nossa-historia',
        build: (b) => [
          b.hero({ image: 4, button: 'Fale com a gente' }),
          b.textImage({ image: 4, side: 'left' }),
          b.gallery({ images: [1, 2, 3] }),
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        build: (b) => [
          b.hero({ image: 1, button: 'Chamar no WhatsApp', style: 'soft' }),
          b.contact(),
        ],
      },
    ],
    button: { label: 'Encomendar' },
    variants: [
      {
        key: 'delicado',
        name: 'Delicado',
        description: 'Rosa, títulos elegantes',
        colors: colors('#c2185b', '#fde7ef', '#fffafc', '#2b1420', '#3a1328'),
        fonts: { headings: 'Playfair Display', body: 'Lato' },
        hero: { style: 'image', align: 'left' },
      },
      {
        key: 'alegre',
        name: 'Alegre',
        description: 'Coral vivo, letras desenhadas',
        colors: colors('#d94a63', '#fff0e8', '#fffdfb', '#3a2230', '#3a2230'),
        fonts: { headings: 'Pacifico', body: 'Quicksand' },
        hero: { style: 'brand', align: 'center' },
      },
    ],
  },
  {
    key: 'outro',
    siteType: 'institucional',
    segment: 'outro',
    site: {
      name: 'Meu Negócio',
      tagline: 'Uma frase curta sobre o que você faz e para quem.',
      address: ADDRESS,
      hours: 'Seg a sex, das 9h às 18h',
    },
    photos: [
      [3184285, 'Equipe conversando numa mesa de reunião'],
      [2826787, 'Ambiente claro com estante e plantas'],
      [17260157, 'Caixas de papelão para produtos'],
      [7413939, 'Pessoas conversando numa reunião de trabalho'],
    ],
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 1, button: 'Fale com a gente' }),
          b.features(),
          b.textImage({ image: 2, style: 'soft' }),
          b.cta({ button: 'Chamar no WhatsApp' }),
        ],
      },
      {
        title: 'Sobre nós',
        slug: 'sobre',
        build: (b) => [
          b.hero({ image: 3, button: 'Fale com a gente', style: 'soft' }),
          b.textImage({ image: 2, side: 'left' }),
          b.gallery({ images: [1, 3, 4] }),
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        build: (b) => [
          b.hero({ image: 1, button: 'Chamar no WhatsApp', style: 'soft' }),
          b.contact(),
        ],
      },
    ],
    button: { label: 'Fale com a gente' },
    variants: [
      {
        key: 'simples',
        name: 'Simples',
        description: 'Neutro, fácil de adaptar',
        colors: colors('#2b2f33', '#eeeeec', '#ffffff', '#1d1f21', '#1d1f21'),
        fonts: { headings: 'Inter', body: 'Inter' },
        hero: { style: 'soft', align: 'left' },
      },
      {
        key: 'colorido',
        name: 'Colorido',
        description: 'Azul vivo, letras modernas',
        colors: colors('#1f5fbf', '#e6eef9', '#fbfcfe', '#18222d', '#142235'),
        fonts: { headings: 'Poppins', body: 'Poppins' },
        hero: { style: 'brand', align: 'center' },
      },
    ],
  },
  {
    key: 'onepage',
    siteType: 'onepage',
    site: {
      name: 'Studio Vértice Arquitetura',
      tagline: 'Projetos residenciais e reformas que cabem no seu orçamento.',
      address: ADDRESS,
      hours: 'Seg a sex, das 9h às 18h',
    },
    photos: [
      [30484316, 'Casa moderna com fachada de madeira'],
      [29696169, 'Sala clara com sofá branco e plantas'],
      [6567803, 'Arquiteta com plantas de projeto nas mãos'],
      [4642437, 'Obra de reforma de uma casa'],
    ],
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 1, button: 'Ver projetos', link: toSection(1, 'projetos') }),
          b.textImage({ id: 'sobre', menu: 'Sobre', image: 3 }),
          b.features({ id: 'servicos', menu: 'Serviços', style: 'soft' }),
          b.gallery({ id: 'projetos', menu: 'Projetos', images: [1, 2, 4] }),
          b.testimonials(),
          b.contact({ id: 'contato', menu: 'Contato' }),
        ],
      },
    ],
    menu: [
      ['Sobre', 'sobre'],
      ['Serviços', 'servicos'],
      ['Projetos', 'projetos'],
      ['Contato', 'contato'],
    ],
    button: { label: 'Pedir orçamento' },
    variants: [
      {
        key: 'claro',
        name: 'Claro',
        description: 'Branco e grafite, letras finas',
        colors: colors('#3b3f45', '#f1f1ef', '#ffffff', '#1d1f21', '#1d1f21'),
        fonts: { headings: 'Josefin Sans', body: 'Work Sans' },
        hero: { style: 'image', align: 'left' },
      },
      {
        key: 'terroso',
        name: 'Terroso',
        description: 'Terracota e areia, títulos elegantes',
        colors: colors('#a4502b', '#f4ebe2', '#fffaf5', '#2d1d16', '#2d1d16'),
        fonts: { headings: 'Cormorant Garamond', body: 'Lato' },
        hero: { style: 'soft', align: 'left' },
      },
    ],
  },
  {
    key: 'landing',
    siteType: 'landing',
    campaign: true,
    site: {
      name: 'Finanças em Dia',
      tagline: 'Mentoria de finanças para autônomos e pequenos negócios.',
      address: 'Online, ao vivo',
      hours: 'Aula gratuita em 12 de novembro, às 20h',
    },
    photos: [
      [6267032, 'Professora dando aula online pelo computador'],
      [8278980, 'Mulher sorrindo no escritório'],
      [7413939, 'Pessoas conversando numa reunião de trabalho'],
    ],
    pages: [
      {
        title: 'Aula gratuita',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 1, button: 'Quero minha vaga', link: toSection(1, 'inscricao') }),
          b.features(),
          b.textImage({ image: 2, side: 'left', style: 'soft' }),
          b.testimonials({ style: 'light' }),
          b.form({ id: 'inscricao', form: 1 }),
        ],
      },
    ],
    forms: [
      {
        title: 'Inscrição na aula',
        submitButtonLabel: 'Quero participar',
        fields: [
          { type: 'text', name: 'nome', label: 'Nome', required: true },
          { type: 'text', name: 'whatsapp', label: 'WhatsApp', required: true },
          { type: 'email', name: 'email', label: 'E-mail', required: false },
        ],
      },
    ],
    variants: [
      {
        key: 'energia',
        name: 'Energia',
        description: 'Verde vivo, letras fortes',
        colors: colors('#0f7a4f', '#e5f4ec', '#ffffff', '#15241c', '#15241c'),
        fonts: { headings: 'Montserrat', body: 'Open Sans' },
        hero: { style: 'image', align: 'left' },
      },
      {
        key: 'escuro',
        name: 'Escuro',
        description: 'Fundo escuro com dourado',
        colors: colors('#e3a22d', '#2a2622', '#1a1816', '#f3ede4', '#0f0e0d'),
        fonts: { headings: 'Poppins', body: 'Poppins' },
        hero: { style: 'brand', align: 'center' },
      },
    ],
  },
  {
    key: 'evento',
    siteType: 'evento',
    site: {
      name: 'Encontro Café do Sul de Minas',
      tagline: 'Dois dias de palestras, degustação e negócios para quem vive de café.',
      address: ADDRESS,
      hours: '14 e 15 de novembro',
    },
    photos: [
      [30717831, 'Colheita de café num cafezal na encosta'],
      [34505585, 'Mesa de degustação de café com xícaras e colheres'],
      [1374151, 'Tigela de grãos de café torrados'],
      [1709003, 'Público assistindo a uma palestra num auditório'],
    ],
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 1, button: 'Fazer inscrição', link: toSection(1, 'inscricao') }),
          b.features({ id: 'programacao', menu: 'Programação' }),
          b.gallery({ images: [2, 3, 4], style: 'soft' }),
          b.contact({ id: 'local', menu: 'Local' }),
          b.form({ id: 'inscricao', menu: 'Inscrição', form: 1 }),
        ],
      },
    ],
    menu: [
      ['Programação', 'programacao'],
      ['Local', 'local'],
      ['Inscrição', 'inscricao'],
    ],
    button: { label: 'Inscreva-se', section: 'inscricao' },
    forms: [
      {
        title: 'Inscrição no evento',
        submitButtonLabel: 'Confirmar inscrição',
        fields: [
          { type: 'text', name: 'nome', label: 'Nome', required: true },
          { type: 'text', name: 'whatsapp', label: 'WhatsApp', required: true },
          { type: 'text', name: 'cidade', label: 'Cidade', required: false },
        ],
      },
    ],
    variants: [
      {
        key: 'campo',
        name: 'Campo',
        description: 'Verde, títulos com serifa',
        colors: colors('#2f5d3a', '#eef3e3', '#fdfdf8', '#1e2a21', '#1e2a21'),
        fonts: { headings: 'Merriweather', body: 'Lato' },
        hero: { style: 'image', align: 'left' },
      },
      {
        key: 'festa',
        name: 'Festa',
        description: 'Vermelho café, letras grandes',
        colors: colors('#9b2c2c', '#f7e8e3', '#fffaf7', '#2a1a17', '#2a1a17'),
        fonts: { headings: 'Bebas Neue', body: 'Open Sans' },
        hero: { style: 'brand', align: 'center' },
      },
    ],
  },
  {
    key: 'pessoal',
    siteType: 'pessoal',
    site: {
      name: 'Mariana Couto',
      tagline: 'Designer gráfica. Crio marcas e materiais para pequenos negócios.',
      address: 'Atendo todo o Brasil',
      hours: 'Seg a sex, das 10h às 19h',
    },
    photos: [
      [34381970, 'Retrato de uma mulher sorrindo'],
      [4466176, 'Cartões de visita em branco sobre a mesa'],
      [8947692, 'Caderno em branco, caneta e cartão de visita'],
      [17260157, 'Caixas de papelão para produtos'],
    ],
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({ image: 1, button: 'Ver trabalhos', link: toSection(1, 'trabalhos') }),
          b.textImage({ id: 'sobre', menu: 'Sobre', image: 1 }),
          b.gallery({ id: 'trabalhos', menu: 'Trabalhos', images: [2, 3, 4], style: 'soft' }),
          b.features({ id: 'experiencia', menu: 'Experiência' }),
          b.contact({ id: 'contato', menu: 'Contato', style: 'soft' }),
        ],
      },
    ],
    menu: [
      ['Sobre', 'sobre'],
      ['Trabalhos', 'trabalhos'],
      ['Experiência', 'experiencia'],
      ['Contato', 'contato'],
    ],
    button: { label: 'Fale comigo' },
    variants: [
      {
        key: 'minimal',
        name: 'Minimalista',
        description: 'Preto e branco, muito espaço',
        colors: colors('#111111', '#f2f2f2', '#ffffff', '#111111', '#111111'),
        fonts: { headings: 'Space Grotesk', body: 'Inter' },
        hero: { style: 'soft', align: 'left' },
      },
      {
        key: 'criativo',
        name: 'Criativo',
        description: 'Rosa vibrante, títulos marcantes',
        colors: colors('#d6336c', '#fdeef3', '#fffbfc', '#2b1420', '#2b1420'),
        fonts: { headings: 'Fraunces', body: 'Work Sans' },
        hero: { style: 'image', align: 'left' },
      },
    ],
  },
  {
    key: 'links',
    siteType: 'links',
    campaign: true,
    site: {
      name: 'Café Grão Mineiro',
      tagline: 'Café especial da Mantiqueira, torrado toda semana.',
      address: ADDRESS,
      hours: 'Seg a sáb, das 7h às 19h',
    },
    photos: [],
    pages: [
      {
        title: 'Links',
        slug: 'inicio',
        build: (b) => [
          b.links({
            items: [
              { label: 'Falar no WhatsApp', link: whatsapp },
              { label: 'Siga no Instagram', link: { kind: 'url', url: 'https://instagram.com/' } },
              { label: 'Como chegar', link: { kind: 'url', url: 'https://maps.google.com/' } },
            ],
          }),
        ],
      },
    ],
    variants: [
      {
        key: 'cafe',
        name: 'Café',
        description: 'Marrom e creme',
        colors: colors('#6b3f24', '#f5ebe0', '#fffdf9', '#2a211b', '#2a211b'),
        fonts: { headings: 'Lora', body: 'Figtree' },
      },
      {
        key: 'noite',
        name: 'Noite',
        description: 'Escuro com dourado',
        colors: colors('#e3a22d', '#2a2622', '#1a1816', '#f3ede4', '#0f0e0d'),
        fonts: { headings: 'Poppins', body: 'Poppins' },
      },
    ],
  },
  {
    key: 'embreve',
    siteType: 'embreve',
    campaign: true,
    site: {
      name: 'Empório Serra Fina',
      tagline: 'Queijos, doces e cafés de pequenos produtores mineiros.',
      address: ADDRESS,
      hours: 'Abertura em dezembro',
    },
    photos: [
      [3735216, 'Interior de um empório com prateleiras de madeira'],
      [5490824, 'Prateleiras com potes de vidro e produtos'],
    ],
    pages: [
      {
        title: 'Em breve',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            image: 1,
            button: 'Quero ser avisado',
            link: toSection(1, 'aviso'),
            align: 'center',
          }),
          b.form({ id: 'aviso', form: 1 }),
        ],
      },
    ],
    forms: [
      {
        title: 'Avise-me na inauguração',
        submitButtonLabel: 'Quero ser avisado',
        fields: [
          { type: 'text', name: 'nome', label: 'Nome', required: true },
          { type: 'text', name: 'whatsapp', label: 'WhatsApp', required: true },
        ],
      },
    ],
    variants: [
      {
        key: 'serra',
        name: 'Serra',
        description: 'Verde e creme',
        colors: colors('#2f5d3a', '#e8f0e4', '#fbfdf9', '#1e2a21', '#1e2a21'),
        fonts: { headings: 'Fraunces', body: 'Figtree' },
        hero: { style: 'image', align: 'center' },
      },
      {
        key: 'doce',
        name: 'Doce',
        description: 'Rosa claro e marrom',
        colors: colors('#8a4b2a', '#fbe9ef', '#fffafc', '#3a2230', '#3a2230'),
        fonts: { headings: 'Pacifico', body: 'Quicksand' },
        hero: { style: 'soft', align: 'center' },
      },
    ],
  },
]

const content = (items: PageComponent[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content: items },
})

function siteTemplates(pack: Pack, packIndex: number): TemplateSeed[] {
  return pack.variants.map((variant, variantIndex) => {
    const pages = pack.pages.map((page, index) => {
      const items = page.build(pageBuilder())
      // O banner da primeira página muda com a variação, como no protótipo (`applyHero`).
      const hero = items.find((item) => item.type === 'Hero')
      if (index === 0 && variant.hero && hero?.type === 'Hero')
        Object.assign(hero.props, variant.hero)
      return {
        title: page.title,
        slug: page.slug,
        campaign: Boolean(pack.campaign),
        content: content(items),
      }
    })
    const items = pack.campaign
      ? []
      : pack.menu
        ? pack.menu.map(([label, section]) => ({
            label,
            link: { kind: 'section' as const, page: 1, section },
          }))
        : pack.pages.map((page, index) => ({
            label: page.title,
            link: { kind: 'page' as const, page: index + 1 },
          }))
    const button = pack.button
      ? {
          label: pack.button.label,
          link: pack.button.section
            ? { kind: 'section' as const, page: 1, section: pack.button.section }
            : { kind: 'whatsapp' as const },
        }
      : { label: null, link: { kind: 'whatsapp' as const } }

    return {
      key: `${pack.key}-${variant.key}`,
      name: variant.name,
      description: variant.description,
      kind: 'site',
      siteType: pack.siteType,
      segment: pack.segment ?? null,
      order: packIndex * 10 + variantIndex,
      pages,
      photos: pack.photos.map(([id, alt]) => ({ url: pexels(id), alt })),
      forms: pack.forms ?? [],
      site: {
        name: pack.site.name,
        tagline: pack.site.tagline,
        colors: variant.colors,
        fonts: variant.fonts,
        address: pack.site.address,
        hours: pack.site.hours,
      },
      header: { items, button },
      footer: {
        text: pack.campaign ? null : L_S,
        showMenu: true,
        showContact: true,
        showSocial: true,
      },
    }
  })
}

// Modelos da "Nova página" (`TPLS` do protótipo), com as fotos do ramo "Outro tipo".
const pagePhotos = packs.find((pack) => pack.key === 'outro')!.photos

const pageModels: {
  key: string
  name: string
  description: string
  slug: string
  build: Pack['pages'][number]['build']
}[] = [
  {
    key: 'pagina-promocao',
    name: 'Promoção ou produto',
    description: 'Para divulgar uma oferta com destaques e botão de WhatsApp',
    slug: 'promocao',
    build: (b) => [
      b.hero({ image: 1, button: 'Quero aproveitar' }),
      b.features(),
      b.gallery({ images: [2, 3, 4], style: 'soft' }),
      b.testimonials({ style: 'light' }),
      b.cta({ button: 'Pedir agora' }),
    ],
  },
  {
    key: 'pagina-sobre',
    name: 'Sobre a empresa',
    description: 'História, foto e galeria',
    slug: 'sobre',
    build: (b) => [
      b.hero({ image: 1, button: 'Fale com a gente' }),
      b.textImage({ image: 2, side: 'left' }),
      b.gallery({ images: [1, 3, 4], style: 'soft' }),
      b.cta({ button: 'Fale com a gente' }),
    ],
  },
  {
    key: 'pagina-perguntas',
    name: 'Perguntas frequentes',
    description: 'Dúvidas comuns com respostas',
    slug: 'perguntas',
    build: (b) => [
      b.hero({ image: 2, button: 'Ainda tenho dúvida', style: 'soft' }),
      b.faq(),
      b.cta({ button: 'Chamar no WhatsApp' }),
    ],
  },
  {
    key: 'pagina-contato',
    name: 'Contato',
    description: 'Telefone, endereço e horário, sempre atualizados',
    slug: 'contato',
    build: (b) => [b.hero({ image: 1, button: 'Chamar no WhatsApp', style: 'soft' }), b.contact()],
  },
  {
    key: PRIVACY_TEMPLATE_KEY,
    name: PRIVACY_TITLE,
    description: 'Já preenchida com os dados do seu site (LGPD)',
    slug: 'politica-de-privacidade',
    build: (b) => [b.privacy()],
  },
]

export const templateSeeds: TemplateSeed[] = [
  ...packs.flatMap(siteTemplates),
  ...pageModels.map((model, index): TemplateSeed => ({
    key: model.key,
    name: model.name,
    description: model.description,
    kind: 'page',
    siteType: null,
    segment: null,
    order: 1000 + index,
    pages: [
      {
        title: model.name,
        slug: model.slug,
        campaign: false,
        content: content(model.build(pageBuilder())),
      },
    ],
    photos: pagePhotos.map(([id, alt]) => ({ url: pexels(id), alt })),
    forms: [],
  })),
]
