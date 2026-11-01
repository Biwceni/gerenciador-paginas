// Política de privacidade montada com os dados das Configurações, na hora de mostrar: mudou o e-mail
// lá, a política muda sozinha. Nada é copiado para dentro da página.
//
// ATENÇÃO: este texto é um modelo genérico, em português simples. Ele precisa ser revisado por um
// advogado antes de ir ao ar para um cliente real.

/** Identificador do modelo de página na coleção Modelos. */
export const PRIVACY_TEMPLATE_KEY = 'pagina-privacidade'

/** Título da seção e nome sugerido para a página. */
export const PRIVACY_TITLE = 'Política de privacidade'

export type PrivacyDetail = { label: string; value: string; href?: string }

export type PrivacyBlock = {
  heading?: string
  text: string
  /** Como falar com o responsável. Campo vazio nas Configurações não entra. */
  details?: PrivacyDetail[]
}

type PrivacySite = {
  name?: string | null
  contact?: { email?: string | null; address?: string | null } | null
}

export function privacyBlocks(site: PrivacySite): PrivacyBlock[] {
  const name = site.name?.trim()
  const email = site.contact?.email?.trim()
  const address = site.contact?.address?.trim()

  const details: PrivacyDetail[] = [
    ...(email ? [{ label: 'E-mail', value: email, href: `mailto:${email}` }] : []),
    ...(address ? [{ label: 'Endereço', value: address }] : []),
  ]

  return [
    {
      text: name
        ? `Esta página explica como ${name} cuida dos dados de quem visita o site e preenche os formulários.`
        : 'Esta página explica como cuidamos dos dados de quem visita o site e preenche os formulários.',
    },
    {
      heading: 'Que dados guardamos',
      text: 'Só o que você escreve nos formulários do site, como nome, WhatsApp, e-mail e a mensagem. Não vendemos nem passamos esses dados para ninguém.',
    },
    {
      heading: 'Para que usamos',
      text: 'Para responder ao seu contato, mandar o orçamento ou confirmar a inscrição que você pediu.',
    },
    {
      heading: 'Como pedir para apagar',
      text: details.length
        ? 'Fale com a gente pedindo para apagar seus dados. Fazemos em até 15 dias.'
        : 'Fale com a gente pelos contatos deste site pedindo para apagar seus dados. Fazemos em até 15 dias.',
      details,
    },
  ]
}
