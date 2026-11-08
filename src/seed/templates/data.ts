import { type BrandComboKey, brandCombos } from '../../lib/brand'
import { FONT_PAIRS, type Business } from '../../lib/fontPairs'
import { PRIVACY_TEMPLATE_KEY, PRIVACY_TITLE } from '../../lib/privacy'
import { BUSINESSES, type BusinessType, type SiteType, templateKey } from '../../lib/templates'
import { type Personality } from '../../lib/theme'
import type { Template } from '../../payload-types'
import { CONTENT_VERSION, type PageComponent } from '../../puck/schema'
import { pageBuilder, toPage, toSection, whatsapp } from './sections'

// Os modelos (redesign v3, entrega 6): o "Site da empresa" com 8 ramos e os outros 6 tipos de site,
// 2 modelos cada um, e os modelos de página da "Nova página". Cada ramo tem as páginas e a ordem de
// seções que fazem sentido para ele, com textos de exemplo de quem tem um pequeno negócio desse
// ramo: `{nome}` e `{cidade}` viram o nome e a cidade respondidos no Começar. Sem fotos de banco:
// o lugar de cada foto fica vazio. Os dois modelos de cada ramo são a sugestão de personalidade,
// letras (`FONT_PAIRS`) e combinação de cores (`brandCombos`, da "Sua marca") para ele.
// `npm run modelos` grava tudo na coleção Modelos.

export type TemplateSeed = Omit<Template, 'id' | 'updatedAt' | 'createdAt'>

type Builder = ReturnType<typeof pageBuilder>
type HeroLook = { style: 'image' | 'side' | 'light' | 'soft' | 'brand'; align: 'left' | 'center' }

/** Um dos dois modelos de um ramo: a personalidade, as cores e as letras sugeridas. */
type Look = {
  personality: Personality
  combo: BrandComboKey
  /** Posição do par de letras em `FONT_PAIRS` do ramo. */
  fonts: number
  name: string
  description: string
  /** Como fica o banner da página inicial neste modelo. */
  hero?: HeroLook
}

type Pack = {
  /** O ramo (no "Site da empresa") ou o tipo de site: começo do identificador do modelo. */
  prefix: Business
  siteType: SiteType
  business?: BusinessType
  /** A cor principal e a escura do ramo, de onde saem as combinações (como a cor de um logo). */
  palette: { accent: string; dark: string }
  site: { name: string; tagline: string; address: string; hours: string }
  pages: { title: string; slug: string; build: (b: Builder) => PageComponent[] }[]
  /** Menu com links para seções da primeira página (sites de uma página só). Sem ele, as páginas. */
  menu?: [label: string, sectionId: string][]
  /** Página de campanha: sem menu e sem botão no topo. */
  campaign?: boolean
  button?: { label: string; section?: string }
  forms?: TemplateSeed['forms']
  /** Frase do rodapé. */
  footer?: string
  looks: [Look, Look]
}

const ADDRESS = 'Rua das Flores, 120 · Centro · {cidade}'

/** Campos dos formulários dos modelos. */
const NAME = { type: 'text', name: 'nome', label: 'Nome', required: true } as const
const WHATSAPP = { type: 'text', name: 'whatsapp', label: 'WhatsApp', required: true } as const
const EMAIL = { type: 'email', name: 'email', label: 'E-mail', required: false } as const
const ask = (name: string, label: string, required = false) =>
  ({ type: 'text', name, label, required }) as const
const longAsk = (name: string, label: string, required = false) =>
  ({ type: 'textarea', name, label, required }) as const

const packs: Pack[] = [
  // Confeitaria: a faixa de aviso e a vitrine logo no começo, cardápio com preços, galeria e
  // encomendas com formulário.
  {
    prefix: 'confeitaria',
    siteType: 'institucional',
    business: 'confeitaria',
    palette: { accent: '#b8476e', dark: '#3a1d29' },
    site: {
      name: 'Doces da Lu',
      tagline: 'Bolos, doces e tortas feitos à mão, sob encomenda.',
      address: ADDRESS,
      hours: 'Ter a sáb, das 9h às 18h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.announcement({
            items: [
              'Encomendas da semana: peça até quinta-feira',
              'Entregamos em {cidade}',
              'Bolos de aniversário com o tema da festa',
            ],
          }),
          b.hero({
            title: 'Bolos e doces feitos à mão, com receita de família',
            highlight: 'receita de família',
            text: 'Encomende o bolo da sua festa, docinhos e tortas para qualquer ocasião, aqui em {cidade}.',
            button: 'Encomendar',
            style: 'side',
          }),
          b.products({
            title: 'Os mais pedidos',
            text: 'Preços de referência. Cada encomenda é feita para o seu dia.',
            items: [
              [
                'Bolo de cenoura com brigadeiro',
                'Massa fofinha e cobertura de brigadeiro de panela. Serve 12 pessoas.',
                'R$ 75',
              ],
              [
                'Caixa com 25 docinhos',
                'Brigadeiro, beijinho e cajuzinho, à sua escolha.',
                'R$ 45',
              ],
              [
                'Torta de limão',
                'Base crocante, creme de limão e merengue maçaricado.',
                'a partir de R$ 90',
              ],
            ],
          }),
          b.textImage({
            title: 'Quem faz os doces',
            text: '{nome} começou na cozinha de casa, com as receitas que a família sempre pedia nas festas. Hoje são bolos, docinhos e tortas feitos um a um, com ingredientes escolhidos toda semana.\n\nNada fica esperando na vitrine: cada encomenda é preparada para a data da sua festa.',
            style: 'soft',
            side: 'left',
          }),
          b.testimonials({
            title: 'Quem já provou',
            style: 'light',
            items: [
              [
                'O bolo do aniversário da minha filha foi o assunto da festa. Lindo e muito gostoso!',
                'Carla M.',
              ],
              [
                'Peço os docinhos todo mês para o escritório. Chegam sempre no horário e fresquinhos.',
                'Roberto S.',
              ],
              [
                'A torta de limão é a melhor que já comi. Já virou tradição aqui em casa.',
                'Patrícia L.',
              ],
            ],
          }),
          b.cta({
            title: 'Tem festa chegando?',
            text: 'Conte a data e quantas pessoas vão. A gente ajuda a escolher o tamanho certo.',
            button: 'Encomendar',
          }),
        ],
      },
      {
        title: 'Cardápio',
        slug: 'cardapio',
        build: (b) => [
          b.hero({
            title: 'Cardápio e preços',
            text: 'Valores de referência. Para festas grandes, chame no WhatsApp e a gente faz um orçamento.',
            style: 'soft',
            height: 'compact',
          }),
          b.priceList({
            title: 'Cardápio',
            groups: [
              [
                'Bolos',
                [
                  ['Bolo de cenoura com brigadeiro', 'Serve 12 pessoas', 'R$ 75'],
                  ['Bolo de chocolate com morango', 'Serve 15 pessoas', 'R$ 110'],
                  ['Bolo de coco gelado', 'Embalado no papel-alumínio, serve 12', 'R$ 65'],
                ],
              ],
              [
                'Docinhos (cento)',
                [
                  ['Brigadeiro tradicional', 'Com granulado belga', 'R$ 130'],
                  ['Beijinho', 'Com coco fresco', 'R$ 130'],
                  ['Docinhos finos', 'Camafeu, bombom de uva e trufas', 'R$ 190'],
                ],
              ],
              [
                'Tortas',
                [
                  ['Torta de limão', 'Serve 10 pessoas', 'R$ 90'],
                  ['Torta holandesa', 'Serve 12 pessoas', 'R$ 120'],
                ],
              ],
            ],
          }),
          b.cta({
            title: 'Escolheu o seu?',
            text: 'Mande o sabor e a data pelo WhatsApp que a gente confirma a encomenda.',
            button: 'Encomendar',
          }),
        ],
      },
      {
        title: 'Galeria',
        slug: 'galeria',
        build: (b) => [
          b.hero({
            title: 'Feitos com carinho',
            text: 'Alguns bolos e mesas de festa que já saíram da nossa cozinha.',
            style: 'soft',
            height: 'compact',
          }),
          b.gallery({ title: 'Nossos trabalhos', layout: 'masonry' }),
          b.cta({
            title: 'Quer um assim na sua festa?',
            text: 'Mande uma foto de inspiração e a gente cria o seu.',
            button: 'Encomendar',
          }),
        ],
      },
      {
        title: 'Encomendas',
        slug: 'encomendas',
        build: (b) => [
          b.hero({
            title: 'Faça sua encomenda',
            text: 'Peça com pelo menos 3 dias de antecedência. Para casamentos e festas grandes, 15 dias.',
            style: 'soft',
            height: 'compact',
          }),
          b.features({
            title: 'Como funciona',
            marker: 'number',
            items: [
              ['Conte o que você quer', 'Sabor, tamanho, data e se a festa tem tema.'],
              ['Receba o orçamento', 'Respondemos no mesmo dia, com o valor e as opções.'],
              ['Retire ou receba em casa', 'Combine a retirada ou a entrega em {cidade}.'],
            ],
          }),
          b.faq({
            style: 'soft',
            items: [
              [
                'Com quanto tempo de antecedência preciso pedir?',
                'Para bolos e docinhos, 3 dias. Para casamentos e festas grandes, o ideal é 15 dias.',
              ],
              [
                'Vocês entregam?',
                'Entregamos em {cidade}, com taxa conforme o bairro. Também dá para retirar.',
              ],
              [
                'Fazem bolo sem lactose?',
                'Algumas receitas, sim. Pergunte no WhatsApp quais sabores estão disponíveis.',
              ],
            ],
          }),
          b.form({
            title: 'Peça seu orçamento',
            text: 'Preencha e a gente responde pelo WhatsApp.',
            form: 1,
            style: 'light',
          }),
        ],
      },
    ],
    button: { label: 'Encomendar' },
    forms: [
      {
        title: 'Encomenda',
        submitButtonLabel: 'Pedir orçamento',
        fields: [
          NAME,
          WHATSAPP,
          ask('data', 'Data da festa'),
          longAsk('pedido', 'O que você gostaria de encomendar?', true),
        ],
      },
    ],
    footer: 'Bolos, doces e tortas sob encomenda em {cidade}.',
    looks: [
      {
        personality: 'vitrine',
        combo: 'claro',
        fonts: 0,
        name: 'Vitrine delicada',
        description: 'Fundo clarinho, títulos elegantes e o banner bem grande',
        hero: { style: 'image', align: 'left' },
      },
      {
        personality: 'aconchego',
        combo: 'forte',
        fonts: 1,
        name: 'Aconchego',
        description: 'Branco com a cor forte, formas redondas e foto em arco',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Restaurante: banner com foto, os jeitos de pedir, os pratos da semana com preço e o endereço
  // ainda na página inicial; cardápio completo e reservas.
  {
    prefix: 'restaurante',
    siteType: 'institucional',
    business: 'restaurante',
    palette: { accent: '#b4441c', dark: '#2a1810' },
    site: {
      name: 'Cantina da Praça',
      tagline: 'Comida caseira, prato do dia e lanches, para comer aqui ou pedir em casa.',
      address: ADDRESS,
      hours: 'Seg a sáb, das 11h às 22h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Comida caseira feita na hora, todo dia',
            highlight: 'feita na hora',
            text: 'Almoço de segunda a sábado e lanches até a noite, em {cidade}. Venha comer aqui ou peça pelo WhatsApp.',
            button: 'Pedir pelo WhatsApp',
            align: 'center',
          }),
          b.features({
            title: 'Do jeito que você preferir',
            items: [
              ['Comer aqui', 'Ambiente tranquilo, com mesa para a família toda.', 'cup'],
              ['Entrega', 'Levamos até você nos bairros perto de nós.', 'truck'],
              [
                'Marmita do dia',
                'Pronta a partir das 11h, com o prato do dia e sobremesa.',
                'clock',
              ],
            ],
          }),
          b.priceList({
            title: 'Pratos da semana',
            text: 'Acompanha arroz, feijão e salada.',
            leader: 'line',
            style: 'soft',
            groups: [
              [
                'Prato do dia',
                [
                  ['Segunda: frango assado', 'Com batata rústica', 'R$ 28'],
                  ['Quarta: feijoada', 'Com couve, farofa e laranja', 'R$ 34'],
                  ['Sexta: peixe frito', 'Com pirão', 'R$ 36'],
                ],
              ],
            ],
          }),
          b.textImage({
            title: 'Nossa cozinha',
            text: '{nome} nasceu da vontade de servir comida de verdade, como a de casa. O tempero é o mesmo desde o primeiro dia, e os ingredientes chegam frescos toda manhã.',
          }),
          b.contact({
            title: 'Onde estamos',
            text: 'Fique à vontade para chegar. Se preferir, peça pelo WhatsApp e receba em casa.',
            style: 'soft',
          }),
          b.cta({
            title: 'Bateu a fome?',
            text: 'Peça agora e receba quentinho.',
            button: 'Pedir pelo WhatsApp',
          }),
        ],
      },
      {
        title: 'Cardápio',
        slug: 'cardapio',
        build: (b) => [
          b.hero({
            title: 'Cardápio',
            text: 'Preços atualizados. Pergunte pelo prato do dia.',
            style: 'soft',
            height: 'compact',
          }),
          b.priceList({
            title: 'Pratos, lanches e bebidas',
            groups: [
              [
                'Pratos',
                [
                  ['Filé de frango grelhado', 'Arroz, feijão, salada e fritas', 'R$ 32'],
                  ['Bife acebolado', 'Arroz, feijão, salada e farofa', 'R$ 36'],
                  ['Omelete da casa', 'Queijo, tomate e ervas, com salada', 'R$ 26'],
                ],
              ],
              [
                'Lanches',
                [
                  ['X-salada', 'Pão, hambúrguer da casa, queijo e salada', 'R$ 24'],
                  ['Misto quente', 'Pão de forma, presunto e queijo', 'R$ 12'],
                  ['Porção de fritas', 'Serve 2 pessoas', 'R$ 22'],
                ],
              ],
              [
                'Bebidas',
                [
                  ['Suco natural', 'Laranja, limão ou maracujá', 'R$ 9'],
                  ['Refrigerante lata', '', 'R$ 7'],
                  ['Café coado', '', 'R$ 5'],
                ],
              ],
              [
                'Sobremesas',
                [
                  ['Pudim de leite', 'Fatia', 'R$ 10'],
                  ['Doce de leite com queijo', '', 'R$ 9'],
                ],
              ],
            ],
          }),
          b.cta({
            title: 'Vai pedir?',
            text: 'Chame no WhatsApp e diga o endereço. A gente avisa o tempo de entrega.',
            button: 'Pedir pelo WhatsApp',
          }),
        ],
      },
      {
        title: 'Reservas',
        slug: 'reservas',
        build: (b) => [
          b.hero({
            title: 'Reserve sua mesa',
            text: 'Para aniversários e grupos, reserve com antecedência e a gente prepara tudo.',
            style: 'soft',
            height: 'compact',
          }),
          b.features({
            title: 'Bom saber',
            items: [
              ['Grupos', 'Mesas para até 20 pessoas, com reserva.', 'heart'],
              ['Aniversário', 'Pode trazer o bolo: a gente guarda na geladeira.', 'cake'],
              ['Horário', 'Reservas para o almoço e para o jantar.', 'clock'],
            ],
          }),
          b.form({
            title: 'Pedir uma reserva',
            text: 'Confirmamos pelo WhatsApp em até 2 horas.',
            form: 1,
            success: 'Recebemos seu pedido. Confirmamos a reserva pelo WhatsApp.',
          }),
        ],
      },
    ],
    button: { label: 'Pedir pelo WhatsApp' },
    forms: [
      {
        title: 'Reserva',
        submitButtonLabel: 'Pedir reserva',
        fields: [
          NAME,
          WHATSAPP,
          ask('data', 'Dia e horário', true),
          ask('pessoas', 'Quantas pessoas?', true),
        ],
      },
    ],
    footer: 'Comida caseira em {cidade}, para comer aqui ou pedir em casa.',
    looks: [
      {
        personality: 'vitrine',
        combo: 'noite',
        fonts: 1,
        name: 'Noite',
        description: 'Fundo escuro, letras fortes e foto de ponta a ponta',
        hero: { style: 'image', align: 'center' },
      },
      {
        personality: 'classico',
        combo: 'claro',
        fonts: 0,
        name: 'Clássico',
        description: 'Fundo claro, títulos com serifa, direto ao ponto',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Salão e estética: serviços logo depois do banner, fotos dos trabalhos e depoimentos; preços e
  // agendamento em páginas próprias.
  {
    prefix: 'beleza',
    siteType: 'institucional',
    business: 'beleza',
    palette: { accent: '#9a4a72', dark: '#2b1722' },
    site: {
      name: 'Studio Bella',
      tagline: 'Cabelo, unhas e sobrancelha com hora marcada.',
      address: ADDRESS,
      hours: 'Ter a sáb, das 9h às 19h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Cabelo, unhas e sobrancelha com hora marcada',
            highlight: 'hora marcada',
            text: '{nome} é um espaço pensado para você relaxar, com atendimento sem pressa, em {cidade}.',
            button: 'Agendar horário',
            style: 'side',
          }),
          b.features({
            title: 'O que fazemos',
            items: [
              ['Cabelo', 'Corte, escova, coloração e tratamentos.', 'scissors'],
              ['Unhas', 'Manicure, pedicure e alongamento em gel.', 'star'],
              ['Sobrancelha e cílios', 'Design, henna e lash lifting.', 'heart'],
            ],
          }),
          b.gallery({ title: 'Nossos trabalhos', layout: 'masonry', style: 'soft' }),
          b.testimonials({
            title: 'O que as clientes dizem',
            style: 'light',
            items: [
              [
                'Saí de lá me sentindo outra pessoa. Atendimento cuidadoso do começo ao fim.',
                'Juliana R.',
              ],
              ['Minhas unhas duram três semanas perfeitas. Não troco por nada.', 'Fernanda C.'],
              [
                'Finalmente achei quem entendesse o corte que eu queria. Recomendo de olhos fechados.',
                'Marina T.',
              ],
            ],
          }),
          b.cta({
            title: 'Que tal um horário esta semana?',
            text: 'Escolha o serviço e o melhor dia. A gente confirma pelo WhatsApp.',
            button: 'Agendar horário',
          }),
        ],
      },
      {
        title: 'Serviços e preços',
        slug: 'servicos',
        build: (b) => [
          b.hero({
            title: 'Serviços e preços',
            text: 'Valores de referência. O preço final depende do comprimento e do tipo de cabelo.',
            style: 'soft',
            height: 'compact',
          }),
          b.priceList({
            title: 'Tabela de preços',
            groups: [
              [
                'Cabelo',
                [
                  ['Corte feminino', 'Com lavagem e finalização', 'R$ 90'],
                  ['Escova', '', 'a partir de R$ 60'],
                  ['Coloração', 'Raiz ou cabelo todo', 'a partir de R$ 150'],
                ],
              ],
              [
                'Unhas',
                [
                  ['Manicure', '', 'R$ 35'],
                  ['Pé e mão', '', 'R$ 65'],
                  ['Alongamento em gel', 'Manutenção a cada 21 dias', 'R$ 160'],
                ],
              ],
              [
                'Sobrancelha e cílios',
                [
                  ['Design de sobrancelha', '', 'R$ 40'],
                  ['Design com henna', '', 'R$ 55'],
                  ['Lash lifting', '', 'R$ 120'],
                ],
              ],
            ],
          }),
          b.faq({
            style: 'soft',
            items: [
              ['Preciso agendar?', 'Sim. Trabalhamos com hora marcada para ninguém esperar.'],
              ['Quais formas de pagamento?', 'Pix, dinheiro e cartão de débito ou crédito.'],
              [
                'E se eu me atrasar?',
                'Avise pelo WhatsApp. Com mais de 15 minutos de atraso, talvez seja preciso remarcar.',
              ],
            ],
          }),
          b.cta({
            title: 'Escolheu o serviço?',
            text: 'Chame no WhatsApp e veja os horários livres da semana.',
            button: 'Agendar horário',
          }),
        ],
      },
      {
        title: 'Agendar',
        slug: 'agendar',
        build: (b) => [
          b.hero({
            title: 'Agende seu horário',
            text: 'Diga o serviço e o melhor dia. Confirmamos pelo WhatsApp.',
            style: 'soft',
            height: 'compact',
          }),
          b.features({
            title: 'Como funciona',
            marker: 'number',
            items: [
              ['Escolha o serviço', 'Veja a tabela de preços ou pergunte se ficou em dúvida.'],
              ['Diga o melhor dia', 'Mande o dia e o período que você prefere.'],
              ['Receba a confirmação', 'A gente confirma o horário e manda o endereço.'],
            ],
          }),
          b.form({
            title: 'Pedir horário',
            text: 'Preencha e aguarde a confirmação pelo WhatsApp.',
            form: 1,
            success: 'Recebemos seu pedido. Confirmamos o horário pelo WhatsApp.',
          }),
        ],
      },
    ],
    button: { label: 'Agendar horário' },
    forms: [
      {
        title: 'Agendamento',
        submitButtonLabel: 'Pedir horário',
        fields: [
          NAME,
          WHATSAPP,
          ask('servico', 'Qual serviço?', true),
          ask('dia', 'Melhor dia e período'),
        ],
      },
    ],
    footer: 'Cabelo, unhas e sobrancelha com hora marcada em {cidade}.',
    looks: [
      {
        personality: 'editorial',
        combo: 'claro',
        fonts: 0,
        name: 'Revista',
        description: 'Fundo clarinho, títulos finos e grandes, cara de revista',
        hero: { style: 'side', align: 'left' },
      },
      {
        personality: 'aconchego',
        combo: 'forte',
        fonts: 2,
        name: 'Acolhedor',
        description: 'Branco com a cor forte, cantos redondos e foto em arco',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Saúde: as perguntas e o contato logo no alto (é o que o paciente procura), sem depoimentos
  // (os conselhos das profissões de saúde restringem); tratamentos e contato.
  {
    prefix: 'saude',
    siteType: 'institucional',
    business: 'saude',
    palette: { accent: '#23788a', dark: '#11303a' },
    site: {
      name: 'Clínica Viver Bem',
      tagline: 'Consultas com hora marcada e atendimento sem pressa.',
      address: ADDRESS,
      hours: 'Seg a sex, das 8h às 19h · sáb, das 8h às 12h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Cuidado de perto, com tempo para ouvir você',
            highlight: 'ouvir você',
            text: 'Consultas com hora marcada em {cidade}. Atendimento particular e por alguns convênios.',
            button: 'Agendar consulta',
            style: 'side',
          }),
          b.contact({
            title: 'Atendimento',
            text: 'Agende pelo WhatsApp ou ligue. Respondemos no horário de atendimento.',
            style: 'soft',
          }),
          b.faq({
            items: [
              [
                'Atendem convênio?',
                'Atendemos alguns convênios. Mande o nome do seu plano pelo WhatsApp que a gente confere.',
              ],
              [
                'Como é a primeira consulta?',
                'Conversamos sobre o seu histórico, fazemos a avaliação e explicamos o tratamento com calma.',
              ],
              [
                'Preciso levar algum exame?',
                'Se tiver exames recentes, traga. Se não tiver, a gente orienta o que for preciso.',
              ],
            ],
          }),
          b.features({
            title: 'Como cuidamos de você',
            style: 'soft',
            items: [
              ['Sem pressa', 'Consultas com tempo para explicar cada etapa.', 'clock'],
              ['Horários flexíveis', 'Atendimento no começo da noite e aos sábados.', 'calendar'],
              [
                'Acolhimento',
                'Um espaço tranquilo, pensado para quem tem receio de consulta.',
                'heart',
              ],
            ],
          }),
          b.cta({
            title: 'Marque sua consulta',
            text: 'Escolha o melhor horário pelo WhatsApp.',
            button: 'Agendar consulta',
          }),
        ],
      },
      {
        title: 'Tratamentos',
        slug: 'tratamentos',
        build: (b) => [
          b.hero({
            title: 'Tratamentos',
            text: 'Do primeiro atendimento ao acompanhamento, com orientação clara em cada etapa.',
            style: 'soft',
            height: 'compact',
          }),
          b.features({
            title: 'O que fazemos',
            items: [
              ['Avaliação completa', 'Entendemos o que você sente e o seu histórico.', 'check'],
              ['Tratamento', 'Plano feito para você, com prazos combinados.', 'shield'],
              [
                'Acompanhamento',
                'Retornos para ver a evolução e ajustar o que for preciso.',
                'calendar',
              ],
              ['Prevenção', 'Orientações para cuidar da saúde no dia a dia.', 'heart'],
            ],
          }),
          b.textImage({
            title: 'Quem atende',
            text: 'Formação na área da saúde, especialização e anos de prática com pacientes de todas as idades. Sempre estudando para trazer o que há de mais atual, com o cuidado de sempre.\n\nAqui você é atendido pela mesma pessoa do começo ao fim do tratamento.',
            side: 'left',
            style: 'soft',
          }),
          b.cta({
            title: 'Ficou com alguma dúvida?',
            text: 'Pergunte pelo WhatsApp antes de marcar. A gente explica.',
            button: 'Agendar consulta',
          }),
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        build: (b) => [
          b.hero({
            title: 'Fale com a clínica',
            text: '{nome} atende com hora marcada. Agende, tire dúvidas ou pergunte sobre convênios.',
            button: 'Agendar consulta',
            style: 'soft',
          }),
          b.contact({ title: 'Como chegar', text: 'Estacionamento na rua e acesso sem escadas.' }),
        ],
      },
    ],
    button: { label: 'Agendar consulta' },
    footer: 'Consultas com hora marcada em {cidade}.',
    looks: [
      {
        personality: 'classico',
        combo: 'forte',
        fonts: 0,
        name: 'Limpo',
        description: 'Branco e azul firme, letras simples e fáceis de ler',
        hero: { style: 'side', align: 'left' },
      },
      {
        personality: 'aconchego',
        combo: 'claro',
        fonts: 1,
        name: 'Acolhedor',
        description: 'Fundo clarinho, títulos com serifa e formas redondas',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Advocacia e contabilidade: banner sem foto, áreas de atuação, como funciona e o formulário de
  // primeiro contato na própria página inicial. Sem depoimentos (as regras da OAB restringem).
  {
    prefix: 'escritorio',
    siteType: 'institucional',
    business: 'escritorio',
    palette: { accent: '#24456e', dark: '#0f1a2a' },
    site: {
      name: 'Almeida & Souza',
      tagline: 'Orientação clara para pessoas e pequenas empresas.',
      address: ADDRESS,
      hours: 'Seg a sex, das 9h às 18h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Orientação clara para resolver o seu caso',
            highlight: 'clara',
            text: 'Atendimento em {cidade} e online, com linguagem simples e prazos combinados desde o início.',
            button: 'Falar com o escritório',
            style: 'soft',
          }),
          b.features({
            title: 'Áreas de atuação',
            items: [
              ['Para você', 'Contratos, família, imóveis e as questões do dia a dia.', 'shield'],
              [
                'Para a sua empresa',
                'Abertura, contratos, impostos e a rotina do negócio em dia.',
                'card',
              ],
              [
                'Atendimento online',
                'Reuniões por vídeo e documentos enviados pelo WhatsApp.',
                'phone',
              ],
            ],
          }),
          b.textImage({
            title: 'Sobre o escritório',
            text: '{nome} atende pessoas e pequenas empresas de {cidade}. Cada caso é acompanhado de perto, com retorno rápido e explicações sem complicação.\n\nVocê sabe desde o primeiro dia quais são os próximos passos e quanto vai custar.',
            style: 'soft',
          }),
          b.features({
            title: 'Como funciona',
            marker: 'number',
            items: [
              [
                'Primeiro contato',
                'Conte brevemente o que está acontecendo, pelo formulário ou pelo WhatsApp.',
              ],
              ['Reunião', 'Marcamos uma conversa para entender o caso e os documentos.'],
              ['Proposta', 'Você recebe o plano de trabalho e os valores por escrito.'],
            ],
          }),
          b.form({
            id: 'contato',
            title: 'Conte o seu caso',
            text: 'As informações ficam só com o escritório. Respondemos em até um dia útil.',
            form: 1,
          }),
        ],
      },
      {
        title: 'Áreas de atuação',
        slug: 'areas',
        build: (b) => [
          b.hero({
            title: 'Áreas de atuação',
            text: 'Atendemos pessoas e pequenas empresas, do primeiro contato à solução.',
            style: 'soft',
            height: 'compact',
          }),
          b.features({
            title: 'Em que podemos ajudar',
            items: [
              ['Contratos', 'Elaboração e revisão antes de você assinar.', 'check'],
              ['Família', 'Divórcio, pensão e inventário, com discrição.', 'heart'],
              ['Imóveis', 'Compra, venda, aluguel e regularização.', 'home'],
              ['Empresas', 'Abertura, alterações e encerramento.', 'card'],
              ['Impostos', 'Planejamento e declarações em dia.', 'calendar'],
              ['Consultoria', 'Orientação para decidir com segurança.', 'shield'],
            ],
          }),
          b.faq({
            style: 'soft',
            items: [
              [
                'A primeira conversa é cobrada?',
                'A primeira conversa serve para entender o caso. Os valores do trabalho vêm por escrito, antes de começar.',
              ],
              [
                'Atendem online?',
                'Sim. Reuniões por vídeo e documentos pelo WhatsApp ou e-mail, de qualquer cidade.',
              ],
              [
                'Quanto tempo leva?',
                'Depende do caso. Na proposta você recebe os prazos de cada etapa.',
              ],
            ],
          }),
          b.cta({
            title: 'Vamos conversar?',
            text: 'Conte o seu caso e marque uma conversa.',
            button: 'Falar com o escritório',
          }),
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        build: (b) => [
          b.hero({
            title: 'Contato',
            text: 'Atendimento com hora marcada, no escritório ou online.',
            button: 'Falar com o escritório',
            style: 'soft',
          }),
          b.contact({
            title: 'Onde estamos',
            text: 'Para reuniões presenciais, marque antes pelo WhatsApp.',
          }),
        ],
      },
    ],
    button: { label: 'Falar com o escritório' },
    footer: 'Atendimento a pessoas e pequenas empresas em {cidade} e online.',
    looks: [
      {
        personality: 'editorial',
        combo: 'forte',
        fonts: 0,
        name: 'Tradicional',
        description: 'Branco e azul-marinho, títulos com serifa, grade de revista',
        hero: { style: 'soft', align: 'left' },
      },
      {
        personality: 'classico',
        combo: 'claro',
        fonts: 1,
        name: 'Moderno',
        description: 'Fundo claro, letras firmes, visual discreto',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Loja: a vitrine logo depois do banner, a faixa com as vantagens de comprar e os depoimentos.
  {
    prefix: 'loja',
    siteType: 'institucional',
    business: 'loja',
    palette: { accent: '#c4553a', dark: '#2e1913' },
    site: {
      name: 'Casa Flor',
      tagline: 'Roupas, acessórios e presentes escolhidos a dedo.',
      address: ADDRESS,
      hours: 'Seg a sáb, das 9h às 19h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Peças escolhidas a dedo, para usar e para presentear',
            highlight: 'para presentear',
            text: 'Roupas, acessórios e presentes com entrega em {cidade}. Peça pelo WhatsApp.',
            button: 'Ver produtos',
            link: toPage(2),
          }),
          b.products({
            title: 'Novidades da semana',
            items: [
              ['Vestido de linho', 'Leve e fresquinho, do P ao GG.', 'R$ 189'],
              ['Bolsa de palha feita à mão', 'Alça de couro e forro de algodão.', 'R$ 129'],
              ['Kit presente', 'Vela aromática, sabonete e cartão escrito à mão.', 'R$ 79'],
            ],
          }),
          b.announcement({
            items: [
              'Entrega grátis em {cidade} acima de R$ 150',
              'Troca fácil em até 7 dias',
              'Pix ou cartão em até 3 vezes',
            ],
            mode: 'static',
          }),
          b.features({
            title: 'Comprar aqui é fácil',
            items: [
              ['Peça pelo WhatsApp', 'Escolha a peça e tire as dúvidas na conversa.', 'phone'],
              ['Receba em casa', 'Entregamos em {cidade} ou você retira na loja.', 'truck'],
              ['Embrulho de presente', 'Sem custo a mais, com cartão escrito à mão.', 'gift'],
            ],
          }),
          b.testimonials({
            title: 'Quem já comprou',
            items: [
              ['Chegou embrulhado com o maior carinho. Minha mãe amou o presente!', 'Aline P.'],
              [
                'O vestido veste muito bem e o atendimento pelo WhatsApp foi rapidinho.',
                'Bianca F.',
              ],
              ['Sempre acho um presente diferente aqui. Virei cliente.', 'Rafael N.'],
            ],
          }),
          b.cta({
            title: 'Gostou de alguma peça?',
            text: 'Mande uma mensagem com o nome da peça e o tamanho.',
            button: 'Comprar pelo WhatsApp',
          }),
        ],
      },
      {
        title: 'Produtos',
        slug: 'produtos',
        build: (b) => [
          b.hero({
            title: 'Produtos',
            text: 'Peças em estoque. Pergunte pelo WhatsApp se tem o seu tamanho ou outra cor.',
            style: 'soft',
            height: 'compact',
          }),
          b.products({
            title: 'Roupas',
            items: [
              ['Vestido de linho', 'Do P ao GG, em três cores.', 'R$ 189'],
              ['Camisa de algodão', 'Corte reto, vários tamanhos.', 'R$ 119'],
              ['Calça pantalona', 'Cintura alta e tecido leve.', 'R$ 159'],
            ],
          }),
          b.products({
            title: 'Acessórios e presentes',
            style: 'soft',
            items: [
              ['Bolsa de palha feita à mão', 'Alça de couro e forro de algodão.', 'R$ 129'],
              ['Kit presente', 'Vela aromática, sabonete e cartão.', 'R$ 79'],
              ['Lenço estampado', 'Para o cabelo, o pescoço ou a bolsa.', 'R$ 49'],
            ],
          }),
          b.faq({
            items: [
              ['Como faço o pedido?', 'Mande o nome da peça e o tamanho pelo WhatsApp.'],
              [
                'Vocês entregam?',
                'Entregamos em {cidade}. Para outras cidades, enviamos pelos Correios.',
              ],
              ['Posso trocar?', 'Sim, em até 7 dias, com a etiqueta na peça.'],
            ],
          }),
          b.cta({
            title: 'Não achou o que procura?',
            text: 'Pergunte pelo WhatsApp: nem tudo o que chega cabe no site.',
            button: 'Comprar pelo WhatsApp',
          }),
        ],
      },
      {
        title: 'Sobre nós',
        slug: 'sobre',
        build: (b) => [
          b.hero({
            title: 'Uma loja pequena, com atendimento de perto',
            text: 'Conheça quem escolhe cada peça.',
            style: 'side',
          }),
          b.textImage({
            title: 'Nossa história',
            text: '{nome} começou com uma arara de roupas na sala de casa e muitas amigas como clientes. Hoje a loja tem endereço em {cidade}, mas o jeito é o mesmo: poucas peças de cada modelo, escolhidas uma a uma.',
            side: 'left',
          }),
          b.gallery({ title: 'A loja', style: 'soft' }),
          b.cta({
            title: 'Venha conhecer',
            text: 'Ou peça pelo WhatsApp e receba em casa.',
            button: 'Comprar pelo WhatsApp',
          }),
        ],
      },
    ],
    button: { label: 'Comprar pelo WhatsApp' },
    footer: 'Roupas, acessórios e presentes com entrega em {cidade}.',
    looks: [
      {
        personality: 'vitrine',
        combo: 'claro',
        fonts: 0,
        name: 'Vitrine',
        description: 'Fundo clarinho, banner grande e títulos elegantes',
        hero: { style: 'image', align: 'left' },
      },
      {
        personality: 'editorial',
        combo: 'forte',
        fonts: 1,
        name: 'Moderno',
        description: 'Branco com a cor forte, letras modernas e grade de revista',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Serviços em casa: o passo a passo logo depois do banner (como pedir), preços "a partir de",
  // depoimentos e dúvidas; página de serviços e pedido de orçamento.
  {
    prefix: 'casa',
    siteType: 'institucional',
    business: 'casa',
    palette: { accent: '#c25e12', dark: '#1f2328' },
    site: {
      name: 'Faz Tudo Reparos',
      tagline: 'Pequenos reparos e reformas com orçamento sem compromisso.',
      address: ADDRESS,
      hours: 'Seg a sáb, das 7h às 18h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Pequenos reparos e reformas, sem dor de cabeça',
            highlight: 'sem dor de cabeça',
            text: 'Elétrica, hidráulica, pintura e montagem de móveis em {cidade}. Orçamento sem compromisso pelo WhatsApp.',
            button: 'Pedir orçamento',
          }),
          b.features({
            title: 'Como funciona',
            marker: 'number',
            items: [
              ['Mande uma foto', 'Pelo WhatsApp, mostre o que precisa ser feito.'],
              ['Receba o orçamento', 'Valor fechado antes de começar, sem surpresa.'],
              ['Serviço feito', 'Chegamos no horário combinado e deixamos tudo limpo.'],
            ],
          }),
          b.priceList({
            title: 'Serviços e preços',
            text: 'Valores de mão de obra. O material pode ser seu ou a gente compra.',
            style: 'soft',
            groups: [
              [
                'A partir de',
                [
                  ['Troca de tomada ou interruptor', '', 'R$ 60'],
                  ['Instalação de chuveiro', '', 'R$ 120'],
                  ['Pintura de cômodo', 'Até 12 m²', 'R$ 450'],
                  ['Montagem de guarda-roupa', '', 'R$ 180'],
                ],
              ],
            ],
          }),
          b.testimonials({
            title: 'Clientes atendidos',
            style: 'light',
            items: [
              ['Chegou no horário, resolveu o vazamento e ainda deixou tudo limpo.', 'Sérgio A.'],
              ['Pintou o apartamento inteiro em três dias. Preço justo e capricho.', 'Luciana M.'],
              ['Montou todos os móveis da mudança num dia só. Super recomendo.', 'Diego V.'],
            ],
          }),
          b.faq({
            style: 'soft',
            items: [
              [
                'O orçamento é cobrado?',
                'Não. Mande fotos pelo WhatsApp e passamos o valor sem compromisso.',
              ],
              [
                'Atendem em quais bairros?',
                'Em toda {cidade}. Para bairros mais longe, combinamos a taxa.',
              ],
              ['Dão garantia?', 'Sim. Os serviços têm garantia de 90 dias.'],
            ],
          }),
          b.cta({
            title: 'Tem algo para consertar?',
            text: 'Mande uma foto agora e receba o orçamento ainda hoje.',
            button: 'Pedir orçamento',
          }),
        ],
      },
      {
        title: 'Serviços',
        slug: 'servicos',
        build: (b) => [
          b.hero({
            title: 'Serviços',
            text: 'Do reparo rápido à reforma do cômodo inteiro.',
            style: 'soft',
            height: 'compact',
          }),
          b.features({
            title: 'O que fazemos',
            items: [
              ['Elétrica', 'Tomadas, chuveiros, lustres e disjuntores.', 'tool'],
              ['Hidráulica', 'Vazamentos, torneiras, descargas e caixas d’água.', 'home'],
              ['Pintura', 'Paredes, portas e grades, por dentro e por fora.', 'star'],
              ['Montagem', 'Móveis, prateleiras, cortinas e suportes de TV.', 'check'],
              ['Pequenas reformas', 'Pisos, azulejos e acabamentos.', 'shield'],
              ['Manutenção', 'Visitas programadas para condomínios e lojas.', 'calendar'],
            ],
          }),
          b.cta({
            title: 'Não achou o seu serviço?',
            text: 'Pergunte pelo WhatsApp: provavelmente a gente faz.',
            button: 'Pedir orçamento',
          }),
        ],
      },
      {
        title: 'Orçamento',
        slug: 'orcamento',
        build: (b) => [
          b.hero({
            title: 'Peça seu orçamento',
            text: 'Conte o que precisa e, se puder, mande fotos pelo WhatsApp depois.',
            style: 'soft',
            height: 'compact',
          }),
          b.form({
            title: 'Pedido de orçamento',
            text: '{nome} responde no mesmo dia, de segunda a sábado.',
            form: 1,
          }),
        ],
      },
    ],
    button: { label: 'Pedir orçamento' },
    forms: [
      {
        title: 'Pedido de orçamento',
        submitButtonLabel: 'Pedir orçamento',
        fields: [
          NAME,
          WHATSAPP,
          ask('bairro', 'Bairro'),
          longAsk('servico', 'O que precisa ser feito?', true),
        ],
      },
    ],
    footer: 'Reparos e pequenas reformas em {cidade}.',
    looks: [
      {
        personality: 'classico',
        combo: 'forte',
        fonts: 0,
        name: 'Confiança',
        description: 'Branco e laranja firme, letras retas e fáceis de ler',
        hero: { style: 'image', align: 'left' },
      },
      {
        personality: 'vitrine',
        combo: 'claro',
        fonts: 1,
        name: 'Forte',
        description: 'Fundo claro, letras altas e banner de ponta a ponta',
        hero: { style: 'image', align: 'left' },
      },
    ],
  },

  // Outro ramo: um site simples de 3 páginas para adaptar.
  {
    prefix: 'outro',
    siteType: 'institucional',
    business: 'outro',
    palette: { accent: '#2b5aa8', dark: '#18222d' },
    site: {
      name: 'Meu Negócio',
      tagline: 'Uma frase curta sobre o que você faz e para quem.',
      address: ADDRESS,
      hours: 'Seg a sex, das 9h às 18h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Atendimento próximo, do jeito que você precisa',
            highlight: 'do jeito que você precisa',
            text: '{nome} atende em {cidade} com hora marcada e resposta rápida pelo WhatsApp.',
            button: 'Fale com a gente',
            style: 'side',
          }),
          b.features({
            title: 'O que oferecemos',
            items: [
              ['Atendimento próximo', 'Você fala direto com quem faz o trabalho.', 'heart'],
              ['Qualidade', 'Cada detalhe conferido antes da entrega.', 'star'],
              ['Preço justo', 'Orçamento claro, sem taxa escondida.', 'check'],
            ],
          }),
          b.textImage({
            title: 'Sobre nós',
            text: '{nome} começou pequeno, atendendo amigos e vizinhos em {cidade}. O trabalho cresceu de boca em boca, e o cuidado com cada cliente continua o mesmo.',
            style: 'soft',
          }),
          b.faq({
            items: [
              ['Como faço um pedido?', 'Chame no WhatsApp e conte o que você precisa.'],
              ['Quais formas de pagamento?', 'Pix, dinheiro e cartão.'],
              [
                'Atendem em quais lugares?',
                'Em {cidade} e região. Pergunte se atendemos no seu bairro.',
              ],
            ],
          }),
          b.cta({
            title: 'Vamos conversar?',
            text: 'Mande uma mensagem e responderemos rapidinho.',
            button: 'Fale com a gente',
          }),
        ],
      },
      {
        title: 'Sobre nós',
        slug: 'sobre',
        build: (b) => [
          b.hero({
            title: 'Quem somos',
            text: 'A história e o jeito de trabalhar de quem está por trás de {nome}.',
            style: 'soft',
            height: 'compact',
          }),
          b.textImage({
            title: 'Nossa história',
            text: 'Tudo começou com uma ideia simples: fazer bem feito e tratar cada cliente pelo nome. Desde então, {nome} cresceu, mas continua com a mesma atenção aos detalhes.',
            side: 'left',
          }),
          b.gallery({ title: 'Nossos trabalhos', style: 'soft' }),
          b.cta({
            title: 'Gostou do nosso trabalho?',
            text: 'Fale com a gente pelo WhatsApp.',
            button: 'Fale com a gente',
          }),
        ],
      },
      {
        title: 'Contato',
        slug: 'contato',
        build: (b) => [
          b.hero({
            title: 'Contato',
            text: 'Escolha o jeito mais fácil para você falar com a gente.',
            button: 'Fale com a gente',
            style: 'soft',
          }),
          b.contact({ title: 'Onde estamos', text: 'Atendemos com hora marcada.' }),
        ],
      },
    ],
    button: { label: 'Fale com a gente' },
    footer: '{nome}, em {cidade}.',
    looks: [
      {
        personality: 'classico',
        combo: 'claro',
        fonts: 0,
        name: 'Simples',
        description: 'Fundo claro e títulos com serifa, fácil de adaptar',
        hero: { style: 'side', align: 'left' },
      },
      {
        personality: 'vitrine',
        combo: 'forte',
        fonts: 1,
        name: 'Moderno',
        description: 'Branco e azul, letras modernas e banner grande',
        hero: { style: 'image', align: 'left' },
      },
    ],
  },

  // Site de uma página só: o menu leva às seções.
  {
    prefix: 'onepage',
    siteType: 'onepage',
    palette: { accent: '#a4502b', dark: '#2d1d16' },
    site: {
      name: 'Studio Vértice',
      tagline: 'Projetos residenciais e reformas que cabem no seu orçamento.',
      address: ADDRESS,
      hours: 'Seg a sex, das 9h às 18h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Projetos de casa e reforma que cabem no seu orçamento',
            highlight: 'cabem no seu orçamento',
            text: 'Arquitetura e interiores em {cidade}, do primeiro desenho à obra pronta.',
            button: 'Ver projetos',
            link: toSection(1, 'projetos'),
            style: 'side',
          }),
          b.textImage({
            id: 'sobre',
            menu: 'Sobre',
            title: 'Sobre o studio',
            text: '{nome} desenha casas, apartamentos e pequenos comércios pensando em quem vai viver o espaço. Cada projeto começa com uma conversa sobre a sua rotina e o seu orçamento.',
          }),
          b.features({
            id: 'servicos',
            menu: 'Serviços',
            title: 'O que fazemos',
            style: 'soft',
            items: [
              ['Projeto completo', 'Do estudo inicial aos desenhos para a obra.', 'home'],
              ['Interiores', 'Marcenaria, iluminação e escolha de materiais.', 'star'],
              [
                'Acompanhamento de obra',
                'Visitas para garantir que sai como foi desenhado.',
                'pin',
              ],
            ],
          }),
          b.gallery({ id: 'projetos', menu: 'Projetos', title: 'Projetos', layout: 'masonry' }),
          b.testimonials({
            title: 'Quem já construiu com a gente',
            items: [
              [
                'O projeto aproveitou cada canto do apartamento. Ficou do jeito que sonhamos.',
                'Ana e Pedro',
              ],
              ['Organização do começo ao fim, e a obra saiu no prazo.', 'Cláudia R.'],
            ],
          }),
          b.contact({
            id: 'contato',
            menu: 'Contato',
            title: 'Vamos conversar sobre o seu projeto',
            text: 'Conte o que você imagina. A primeira conversa é sem compromisso.',
          }),
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
    footer: 'Arquitetura e interiores em {cidade}.',
    looks: [
      {
        personality: 'editorial',
        combo: 'claro',
        fonts: 0,
        name: 'Revista',
        description: 'Fundo areia, letras modernas e grade de revista',
        hero: { style: 'side', align: 'left' },
      },
      {
        personality: 'aconchego',
        combo: 'forte',
        fonts: 1,
        name: 'Terroso',
        description: 'Branco e terracota, títulos com serifa e foto em arco',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Landing page: uma oferta e um formulário.
  {
    prefix: 'landing',
    siteType: 'landing',
    campaign: true,
    palette: { accent: '#0f7a4f', dark: '#15241c' },
    site: {
      name: 'Finanças em Dia',
      tagline: 'Aula gratuita de finanças para quem trabalha por conta própria.',
      address: 'Online, ao vivo',
      hours: 'Aula gratuita, ao vivo',
    },
    pages: [
      {
        title: 'Aula gratuita',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Organize o dinheiro do seu negócio em uma noite',
            highlight: 'em uma noite',
            text: 'Aula gratuita e ao vivo para quem trabalha por conta própria. Vagas limitadas.',
            button: 'Quero minha vaga',
            link: toSection(1, 'inscricao'),
            style: 'side',
          }),
          b.features({
            title: 'O que você vai aprender',
            items: [
              [
                'Separar as contas',
                'O dinheiro da casa de um lado, o do negócio do outro.',
                'card',
              ],
              ['Calcular o preço', 'Quanto cobrar para sobrar no fim do mês.', 'check'],
              ['Planejar o mês', 'Uma planilha simples para não ser pego de surpresa.', 'calendar'],
            ],
          }),
          b.textImage({
            title: 'Quem vai ensinar',
            text: 'Mais de dez anos ajudando autônomos e pequenos negócios a sair do aperto. Nada de fórmula mágica: só o básico bem feito, com exemplos do dia a dia.',
            side: 'left',
            style: 'soft',
          }),
          b.testimonials({
            title: 'Quem já participou',
            style: 'light',
            items: [
              [
                'Saí da aula sabendo exatamente quanto cobrar. Mudou meu negócio.',
                'Renata, confeiteira',
              ],
              [
                'Simples e direto. Finalmente entendi para onde ia o meu dinheiro.',
                'Marcos, eletricista',
              ],
            ],
          }),
          b.faq({
            items: [
              ['É gratuito mesmo?', 'Sim. A aula é gratuita e ao vivo.'],
              ['Vai ter gravação?', 'Quem se inscrever recebe a gravação por 7 dias.'],
              ['Preciso entender de finanças?', 'Não. A aula é para quem está começando.'],
            ],
          }),
          b.form({
            id: 'inscricao',
            title: 'Garanta sua vaga',
            text: 'Você recebe o link da aula pelo WhatsApp.',
            form: 1,
            success: 'Inscrição feita! Você recebe o link da aula pelo WhatsApp.',
          }),
        ],
      },
    ],
    forms: [
      {
        title: 'Inscrição na aula',
        submitButtonLabel: 'Quero participar',
        fields: [NAME, WHATSAPP, EMAIL],
      },
    ],
    looks: [
      {
        personality: 'vitrine',
        combo: 'claro',
        fonts: 0,
        name: 'Energia',
        description: 'Fundo clarinho, verde vivo e letras grandes',
        hero: { style: 'image', align: 'left' },
      },
      {
        personality: 'classico',
        combo: 'noite',
        fonts: 2,
        name: 'Escuro',
        description: 'Fundo escuro, títulos elegantes',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Página de evento: a faixa com a data e o local no alto, a programação numerada e a inscrição.
  {
    prefix: 'evento',
    siteType: 'evento',
    palette: { accent: '#a3302c', dark: '#2a1716' },
    site: {
      name: 'Festival de Inverno',
      tagline: 'Dois dias de música, comida boa e feira de artesanato.',
      address: 'Praça Central · {cidade}',
      hours: 'Sábado e domingo, das 10h às 22h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.announcement({
            items: [
              'Sábado e domingo, das 10h às 22h',
              'Praça Central de {cidade}',
              'Entrada gratuita',
            ],
          }),
          b.hero({
            title: 'Dois dias de música, comida boa e artesanato',
            highlight: 'música',
            text: 'Shows, feira e atividades para as crianças, no centro de {cidade}. Inscreva-se para receber a programação completa.',
            button: 'Fazer inscrição',
            link: toSection(1, 'inscricao'),
          }),
          b.features({
            id: 'programacao',
            menu: 'Programação',
            title: 'Programação',
            marker: 'number',
            items: [
              ['Sábado, 10h: abertura da feira', 'Mais de 40 expositores de artesanato e comida.'],
              ['Sábado, 19h: show de abertura', 'Música ao vivo no palco principal.'],
              ['Domingo, 10h: oficinas para crianças', 'Pintura, música e contação de histórias.'],
              ['Domingo, 18h: show de encerramento', 'Para fechar o festival com a praça cheia.'],
            ],
          }),
          b.gallery({ title: 'Como foi no ano passado', style: 'soft' }),
          b.contact({
            id: 'local',
            menu: 'Local',
            title: 'Como chegar',
            text: 'Na praça central, com estacionamento nas ruas em volta.',
          }),
          b.faq({
            style: 'soft',
            items: [
              ['Precisa pagar?', 'Não. A entrada é gratuita para todas as atividades.'],
              ['Pode levar criança?', 'Claro! Tem programação especial para elas no domingo.'],
              ['E se chover?', 'Os shows acontecem na tenda coberta.'],
            ],
          }),
          b.form({
            id: 'inscricao',
            menu: 'Inscrição',
            title: 'Faça sua inscrição',
            text: 'Receba a programação completa e os avisos pelo WhatsApp.',
            form: 1,
            success: 'Inscrição feita! Você vai receber os avisos pelo WhatsApp.',
          }),
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
        fields: [NAME, WHATSAPP, ask('cidade', 'Cidade')],
      },
    ],
    footer: 'Festival na praça central de {cidade}.',
    looks: [
      {
        personality: 'vitrine',
        combo: 'noite',
        fonts: 0,
        name: 'Cartaz',
        description: 'Fundo escuro, letras de cartaz e foto de ponta a ponta',
        hero: { style: 'image', align: 'center' },
      },
      {
        personality: 'aconchego',
        combo: 'claro',
        fonts: 1,
        name: 'Festa',
        description: 'Fundo clarinho, títulos marcantes e formas redondas',
        hero: { style: 'side', align: 'left' },
      },
    ],
  },

  // Site pessoal ou currículo.
  {
    prefix: 'pessoal',
    siteType: 'pessoal',
    palette: { accent: '#c02a5c', dark: '#24121a' },
    site: {
      name: 'Mariana Couto',
      tagline: 'Designer gráfica. Crio marcas e materiais para pequenos negócios.',
      address: 'Atendo de {cidade} para todo o Brasil',
      hours: 'Seg a sex, das 10h às 19h',
    },
    pages: [
      {
        title: 'Início',
        slug: 'inicio',
        build: (b) => [
          b.hero({
            title: 'Marcas e materiais que fazem pequenos negócios parecerem grandes',
            highlight: 'parecerem grandes',
            text: 'Sou designer em {cidade} e atendo clientes de todo o Brasil.',
            button: 'Ver trabalhos',
            link: toSection(1, 'trabalhos'),
            style: 'side',
          }),
          b.textImage({
            id: 'sobre',
            menu: 'Sobre',
            title: 'Muito prazer',
            text: 'Trabalho com design há mais de oito anos, sempre com pequenos negócios. Gosto de entender a história de cada cliente antes de desenhar qualquer coisa.\n\nO resultado são marcas simples, que funcionam no Instagram, na fachada e no cartão de visita.',
          }),
          b.gallery({
            id: 'trabalhos',
            menu: 'Trabalhos',
            title: 'Trabalhos',
            layout: 'masonry',
            style: 'soft',
          }),
          b.features({
            id: 'servicos',
            menu: 'Serviços',
            title: 'Como posso ajudar',
            items: [
              ['Identidade visual', 'Logo, cores e letras para a sua marca.', 'star'],
              ['Redes sociais', 'Modelos de posts para você mesma editar.', 'phone'],
              ['Materiais impressos', 'Cartões, cardápios, etiquetas e embalagens.', 'bag'],
            ],
          }),
          b.testimonials({
            title: 'O que dizem os clientes',
            items: [
              [
                'A marca nova trouxe outra cara para a confeitaria. Os clientes elogiam até hoje.',
                'Luciana, Doces da Lu',
              ],
              [
                'Entendeu exatamente o que eu queria logo na primeira conversa.',
                'Felipe, Barbearia Central',
              ],
            ],
          }),
          b.contact({
            id: 'contato',
            menu: 'Contato',
            title: 'Vamos trabalhar juntos?',
            text: 'Me conte sobre o seu projeto. Respondo em até um dia útil.',
            style: 'soft',
          }),
        ],
      },
    ],
    menu: [
      ['Sobre', 'sobre'],
      ['Trabalhos', 'trabalhos'],
      ['Serviços', 'servicos'],
      ['Contato', 'contato'],
    ],
    button: { label: 'Fale comigo' },
    footer: 'Design para pequenos negócios, de {cidade} para todo o Brasil.',
    looks: [
      {
        personality: 'editorial',
        combo: 'forte',
        fonts: 0,
        name: 'Autoral',
        description: 'Branco com a cor forte, títulos marcantes e grade de revista',
        hero: { style: 'side', align: 'left' },
      },
      {
        personality: 'classico',
        combo: 'claro',
        fonts: 1,
        name: 'Minimalista',
        description: 'Fundo clarinho, letras modernas e muito espaço',
        hero: { style: 'soft', align: 'left' },
      },
    ],
  },

  // Página de links ("link na bio").
  {
    prefix: 'links',
    siteType: 'links',
    campaign: true,
    palette: { accent: '#7a4a2a', dark: '#2a1d14' },
    site: {
      name: 'Doces da Lu',
      tagline: 'Bolos e doces sob encomenda.',
      address: ADDRESS,
      hours: 'Ter a sáb, das 9h às 18h',
    },
    pages: [
      {
        title: 'Links',
        slug: 'inicio',
        build: (b) => [
          b.links({
            text: 'Bolos, doces e encomendas em {cidade}. Escolha por onde quer falar com a gente.',
            items: [
              { label: 'Falar no WhatsApp', link: whatsapp },
              { label: 'Siga no Instagram', link: { kind: 'url', url: 'https://instagram.com/' } },
              { label: 'Como chegar', link: { kind: 'url', url: 'https://maps.google.com/' } },
            ],
          }),
        ],
      },
    ],
    looks: [
      {
        personality: 'aconchego',
        combo: 'claro',
        fonts: 1,
        name: 'Doce',
        description: 'Fundo clarinho e botões redondos',
      },
      {
        personality: 'vitrine',
        combo: 'noite',
        fonts: 0,
        name: 'Noite',
        description: 'Fundo escuro e letras modernas',
      },
    ],
  },

  // Página "em breve".
  {
    prefix: 'embreve',
    siteType: 'embreve',
    campaign: true,
    palette: { accent: '#2f6b45', dark: '#1a2a1f' },
    site: {
      name: 'Empório Serra Fina',
      tagline: 'Queijos, doces e cafés de pequenos produtores.',
      address: ADDRESS,
      hours: 'Abertura em breve',
    },
    pages: [
      {
        title: 'Em breve',
        slug: 'inicio',
        build: (b) => [
          b.announcement({ items: ['Inauguração em breve', 'Em {cidade}'], mode: 'static' }),
          b.hero({
            title: 'Estamos chegando em {cidade}',
            highlight: '{cidade}',
            text: 'Queijos, doces e cafés de pequenos produtores. Deixe seu contato e seja o primeiro a saber da inauguração.',
            button: 'Quero ser avisado',
            link: toSection(1, 'aviso'),
            align: 'center',
          }),
          b.form({
            id: 'aviso',
            title: 'Avise-me na inauguração',
            text: 'Mandamos uma mensagem no dia da abertura, com um presente para os primeiros.',
            form: 1,
            success: 'Pronto! Você vai ser avisado no dia da inauguração.',
          }),
        ],
      },
    ],
    forms: [
      {
        title: 'Avise-me na inauguração',
        submitButtonLabel: 'Quero ser avisado',
        fields: [NAME, WHATSAPP],
      },
    ],
    looks: [
      {
        personality: 'vitrine',
        combo: 'claro',
        fonts: 2,
        name: 'Serra',
        description: 'Fundo clarinho, títulos elegantes e banner grande',
        hero: { style: 'image', align: 'center' },
      },
      {
        personality: 'aconchego',
        combo: 'forte',
        fonts: 0,
        name: 'Festa',
        description: 'Branco e verde, títulos marcantes',
        hero: { style: 'soft', align: 'center' },
      },
    ],
  },
]

/** Formulário "Fale conosco" da página Contato dos modelos (C3), como o pronto de Formulários. */
const CONTACT_FORM: NonNullable<TemplateSeed['forms']>[number] = {
  title: 'Fale conosco',
  submitButtonLabel: 'Enviar',
  fields: [NAME, WHATSAPP, EMAIL, longAsk('mensagem', 'Mensagem')],
}

type PageRules = {
  /** Texto do botão de destaque do topo, quando ele leva ao WhatsApp. */
  whatsappLabel: string | null
  /** Posição (a partir de 1) do "Fale conosco" nos formulários do modelo. */
  contactForm: number
  /** Página interna: termina chamando para a ação. */
  internal: boolean
}

/**
 * Regras comuns das páginas dos modelos (crítica de design de 03/11/2026):
 * - C6: todo botão que leva ao WhatsApp usa o texto do botão de destaque do topo;
 * - C3: a página interna com Contato e endereço tem o banner compacto e, logo depois, o "Fale
 *   conosco";
 * - C5: página interna sem formulário no fim termina com uma Chamada para ação.
 */
function finishPage(items: PageComponent[], b: Builder, rules: PageRules): PageComponent[] {
  const label = rules.whatsappLabel
  if (label) {
    for (const item of items) {
      if (item.type !== 'Hero' && item.type !== 'CallToAction') continue
      if (item.props.button?.link?.kind === 'whatsapp') item.props.button.label = label
    }
  }

  // Só na página Contato: nos sites de uma página só, o Contato fica na inicial, que não muda.
  const contact = rules.internal ? items.findIndex((item) => item.type === 'Contact') : -1
  if (contact >= 0) {
    for (const item of items) if (item.type === 'Hero') item.props.height = 'compact'
    if (!items.some((item) => item.type === 'Form')) {
      items.splice(
        contact + 1,
        0,
        b.form({
          title: 'Mande uma mensagem',
          text: 'Preencha e a gente responde pelo WhatsApp ou pelo e-mail.',
          form: rules.contactForm,
        }),
      )
    }
  }

  const last = items[items.length - 1]
  if (rules.internal && last && last.type !== 'Form' && last.type !== 'CallToAction') {
    items.push(
      b.cta({
        title: 'Fale com a gente',
        text: 'Chame no WhatsApp: respondemos rapidinho.',
        button: label ?? 'Fale com a gente',
      }),
    )
  }
  return items
}

/** Os formulários do modelo, com o "Fale conosco" no fim quando alguma página precisa dele. */
function modelForms(forms: TemplateSeed['forms'], needsContact: boolean) {
  const list = [...(forms ?? [])]
  return needsContact ? [...list, CONTACT_FORM] : list
}

const content = (items: PageComponent[]) => ({
  version: CONTENT_VERSION,
  data: { root: { props: {} }, content: items },
})

/** Formulários citados pelas páginas (posição a partir de 1). */
function citedForms(pack: Pack): number[] {
  return pack.pages.flatMap((page) =>
    page
      .build(pageBuilder())
      .flatMap((item) => (item.type === 'Form' && item.props.form ? [item.props.form.formId] : [])),
  )
}

/** As cores sugeridas de um modelo: a combinação da "Sua marca" a partir das cores do ramo. */
export function lookColors(pack: Pick<Pack, 'palette'>, combo: BrandComboKey) {
  return brandCombos(pack.palette).find((item) => item.key === combo)!.colors
}

function siteTemplates(pack: Pack, packIndex: number): TemplateSeed[] {
  const whatsappLabel = pack.button && !pack.button.section ? pack.button.label : null
  const ownForms = pack.forms?.length ?? 0
  // O "Fale conosco" entra quando uma página interna tem Contato (C3) ou quando uma página cita um
  // formulário além dos do ramo (o de primeiro contato do escritório, por exemplo).
  const needsContact =
    !pack.campaign &&
    (pack.pages
      .slice(1)
      .some((page) => page.build(pageBuilder()).some((item) => item.type === 'Contact')) ||
      citedForms(pack).some((position) => position > ownForms))
  const forms = modelForms(pack.forms, needsContact)
  const business = pack.business ? BUSINESSES.find((item) => item.value === pack.business) : null

  return pack.looks.map((look, lookIndex) => {
    const pages = pack.pages.map((page, index) => {
      const b = pageBuilder()
      const items = finishPage(page.build(b), b, {
        whatsappLabel,
        contactForm: forms.length,
        internal: index > 0 && !pack.campaign,
      })
      // O banner da primeira página muda com o modelo, como no protótipo (`applyHero`).
      const hero = items.find((item) => item.type === 'Hero')
      if (index === 0 && look.hero && hero?.type === 'Hero') Object.assign(hero.props, look.hero)
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
    const fonts = FONT_PAIRS[pack.prefix][look.fonts]

    return {
      key: templateKey(pack.prefix, look.personality),
      name: look.name,
      description: look.description,
      kind: 'site',
      siteType: pack.siteType,
      segment: business?.segment ?? null,
      order: packIndex * 10 + lookIndex,
      pages,
      photos: [],
      forms,
      site: {
        name: pack.site.name,
        tagline: pack.site.tagline,
        colors: lookColors(pack, look.combo),
        fonts: { headings: fonts.headings, body: fonts.body },
        address: pack.site.address,
        hours: pack.site.hours,
      },
      header: { items, button },
      footer: {
        text: pack.campaign ? null : (pack.footer ?? '{nome}, em {cidade}.'),
        showMenu: true,
        showContact: true,
        showSocial: true,
      },
    }
  })
}

// Modelos da "Nova página". Sem `{cidade}`: a cidade só é perguntada no Começar; `{nome}` vira o nome
// do site das Configurações.
const pageModels: {
  key: string
  name: string
  description: string
  slug: string
  build: Pack['pages'][number]['build']
  forms?: TemplateSeed['forms']
}[] = [
  {
    key: 'pagina-vitrine',
    name: 'Vitrine de produtos',
    description: 'Fotos, nomes, preços e o botão de pedir',
    slug: 'produtos',
    build: (b) => [
      b.hero({
        title: 'Nossos produtos',
        text: 'Escolha o seu e peça pelo WhatsApp. A gente responde rapidinho.',
        style: 'soft',
        height: 'compact',
      }),
      b.products({
        title: 'Mais pedidos',
        items: [
          ['Produto mais vendido', 'Conte em uma frase o que ele tem de especial.', 'R$ 89'],
          ['Novidade da semana', 'Diga o tamanho, o sabor ou a cor que tem.', 'R$ 59'],
          ['Kit presente', 'O que vem dentro e para quem é um bom presente.', 'a partir de R$ 120'],
        ],
      }),
      b.faq({
        style: 'soft',
        items: [
          ['Como faço o pedido?', 'Toque em “Pedir pelo WhatsApp” no produto que você quer.'],
          ['Vocês entregam?', 'Entregamos na cidade, com taxa conforme o bairro.'],
        ],
      }),
      b.cta({
        title: 'Ficou com alguma dúvida?',
        text: 'Chame no WhatsApp e a gente ajuda a escolher.',
        button: 'Chamar no WhatsApp',
      }),
    ],
  },
  {
    key: 'pagina-cardapio',
    name: 'Cardápio com preços',
    description: 'Itens e valores em lista, sem precisar de foto',
    slug: 'cardapio',
    build: (b) => [
      b.hero({
        title: 'Cardápio',
        text: 'Preços atualizados. Pergunte pelas novidades da semana.',
        style: 'soft',
        height: 'compact',
      }),
      b.priceList({
        title: 'Cardápio',
        groups: [
          [
            'Mais pedidos',
            [
              ['Item mais vendido', 'Uma frase que dá vontade de pedir', 'R$ 35'],
              ['Opção da casa', 'Do que é feito e para quantas pessoas', 'R$ 42'],
              ['Opção leve', 'Para quem quer algo mais simples', 'R$ 28'],
            ],
          ],
          [
            'Para acompanhar',
            [
              ['Bebida', 'Sabores disponíveis', 'R$ 8'],
              ['Sobremesa', 'Pergunte a do dia', 'R$ 12'],
            ],
          ],
        ],
      }),
      b.cta({
        title: 'Vai pedir?',
        text: 'Chame no WhatsApp e diga o que vai querer.',
        button: 'Pedir pelo WhatsApp',
      }),
    ],
  },
  {
    key: 'pagina-galeria',
    name: 'Galeria de fotos',
    description: 'Seus trabalhos em fotos, que abrem em tela cheia',
    slug: 'galeria',
    build: (b) => [
      b.hero({
        title: 'Nossos trabalhos',
        text: 'Alguns trabalhos que já fizemos. Toque numa foto para ver maior.',
        style: 'soft',
        height: 'compact',
      }),
      b.gallery({ title: 'Galeria', layout: 'masonry' }),
      b.cta({
        title: 'Quer um assim?',
        text: 'Mande uma mensagem com a foto que você gostou.',
        button: 'Chamar no WhatsApp',
      }),
    ],
  },
  {
    key: 'pagina-encomendas',
    name: 'Encomendas e orçamento',
    description: 'Como funciona e um formulário de pedido',
    slug: 'encomendas',
    build: (b) => [
      b.hero({
        title: 'Faça seu pedido',
        text: 'Conte o que precisa e responderemos com o valor e o prazo.',
        style: 'soft',
        height: 'compact',
      }),
      b.features({
        title: 'Como funciona',
        marker: 'number',
        items: [
          ['Conte o que você quer', 'Quanto mais detalhes, mais certo o orçamento.'],
          ['Receba o valor', 'Respondemos com o preço e o prazo de entrega.'],
          ['Combine a entrega', 'Retire com a gente ou receba no seu endereço.'],
        ],
      }),
      b.form({ title: 'Pedir orçamento', text: 'Respondemos pelo WhatsApp.', form: 1 }),
    ],
    forms: [
      {
        title: 'Pedido de orçamento',
        submitButtonLabel: 'Pedir orçamento',
        fields: [NAME, WHATSAPP, longAsk('pedido', 'O que você precisa?', true)],
      },
    ],
  },
  {
    key: 'pagina-promocao',
    name: 'Promoção',
    description: 'Faixa de aviso, a oferta e o botão de WhatsApp',
    slug: 'promocao',
    build: (b) => [
      b.announcement({ items: ['Promoção por tempo limitado', 'Só enquanto durar o estoque'] }),
      b.hero({
        title: 'Oferta especial desta semana',
        highlight: 'desta semana',
        text: 'Diga aqui o que está em promoção, o desconto e até quando vale.',
        button: 'Quero aproveitar',
        style: 'side',
      }),
      b.products({
        title: 'Em promoção',
        layout: 'two',
        items: [
          ['Produto em oferta', 'De R$ 120 por R$ 89, só esta semana.', 'R$ 89'],
          ['Combo especial', 'Dois produtos juntos, com desconto.', 'R$ 149'],
        ],
      }),
      b.cta({
        title: 'Corra, é por pouco tempo',
        text: 'Garanta o seu pelo WhatsApp.',
        button: 'Quero aproveitar',
      }),
    ],
  },
  {
    key: 'pagina-sobre',
    name: 'Sobre a empresa',
    description: 'História, o que vocês fazem e o que os clientes dizem',
    slug: 'sobre',
    build: (b) => [
      b.hero({
        title: 'Quem somos',
        text: 'A história e o jeito de trabalhar de quem está por trás de {nome}.',
        style: 'side',
      }),
      b.textImage({
        title: 'Nossa história',
        text: 'Conte como tudo começou: quem teve a ideia, quando abriu as portas e o que mudou desde então. {nome} existe para...\n\nOs clientes gostam de saber quem está do outro lado.',
        side: 'left',
      }),
      b.features({
        title: 'No que acreditamos',
        style: 'soft',
        items: [
          ['Atendimento de perto', 'Você fala direto com quem faz.', 'heart'],
          ['Capricho', 'Cada detalhe conferido antes da entrega.', 'star'],
          ['Palavra cumprida', 'Prazo combinado é prazo entregue.', 'check'],
        ],
      }),
      b.testimonials({
        title: 'O que dizem os clientes',
        items: [
          ['Atendimento excelente do começo ao fim. Recomendo!', 'Cliente satisfeito'],
          ['Fizeram exatamente o que eu pedi, no prazo combinado.', 'Cliente fiel'],
        ],
      }),
      b.cta({
        title: 'Vamos conversar?',
        text: 'Fale com a gente pelo WhatsApp.',
        button: 'Fale com a gente',
      }),
    ],
  },
  {
    key: 'pagina-perguntas',
    name: 'Perguntas frequentes',
    description: 'As dúvidas que mais chegam, já respondidas',
    slug: 'perguntas',
    build: (b) => [
      b.hero({
        title: 'Perguntas frequentes',
        text: 'Separamos as dúvidas que mais chegam pelo WhatsApp.',
        button: 'Ainda tenho dúvida',
        style: 'soft',
        height: 'compact',
      }),
      b.faq({
        items: [
          ['Como faço um pedido?', 'Chame no WhatsApp e conte o que você precisa.'],
          ['Quais formas de pagamento?', 'Pix, dinheiro e cartão de débito ou crédito.'],
          ['Qual é o prazo?', 'Depende do pedido. Avisamos o prazo antes de confirmar.'],
          ['Vocês entregam?', 'Entregamos na cidade, com taxa conforme o bairro.'],
          ['Posso trocar ou cancelar?', 'Sim, conforme combinado no pedido. Fale com a gente.'],
        ],
      }),
      b.cta({
        title: 'Não achou a resposta?',
        text: 'Pergunte pelo WhatsApp.',
        button: 'Chamar no WhatsApp',
      }),
    ],
  },
  {
    key: 'pagina-contato',
    name: 'Contato',
    description: 'Telefone, endereço e horário, sempre atualizados',
    slug: 'contato',
    build: (b) => [
      b.hero({
        title: 'Fale com a gente',
        text: 'Escolha o jeito mais fácil para você.',
        button: 'Chamar no WhatsApp',
        style: 'soft',
        height: 'compact',
      }),
      b.contact({ title: 'Onde estamos', text: 'Atendemos com hora marcada.' }),
      b.form({
        title: 'Mande uma mensagem',
        text: 'Preencha e a gente responde pelo WhatsApp ou pelo e-mail.',
        form: 1,
      }),
    ],
    forms: [CONTACT_FORM],
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
    photos: [],
    forms: model.forms ?? [],
  })),
]
