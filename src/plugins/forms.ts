import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import type { Field } from 'payload'

import { anyone, authenticated } from '../access/authenticated'
import { checkFormSubmission, notifyNewMessage, protectFormDelete } from '../hooks/formSubmissions'
import { validateFieldName } from '../lib/forms'

// Partes do formulário do plugin que o leigo não usa: e-mails com modelo (o aviso de mensagem nova
// é nosso, para o e-mail das Configurações), redirecionamento e mensagem de confirmação em texto
// rico (a frase de "enviado" fica na seção da página).
const HIDDEN_FORM_FIELDS = ['emails', 'redirect', 'confirmationType', 'confirmationMessage']

// Nomes em português para os campos que o plugin cria nas mensagens.
const SUBMISSION_LABELS: Record<string, string> = {
  form: 'Formulário',
  submissionData: 'Dados enviados',
}

/** Valida o campo "nome" de um bloco, que o plugin põe dentro de linhas (`row`). */
const validateNameField = (field: Field): Field => {
  if ('name' in field && field.name === 'name') {
    return { ...field, validate: validateFieldName } as Field
  }
  if (field.type === 'row') return { ...field, fields: field.fields.map(validateNameField) }
  return field
}

/** O "nome" de cada campo do formulário não pode usar o prefixo reservado (`validateFieldName`). */
const checkFieldNames = (field: Field): Field =>
  field.type === 'blocks' && field.name === 'fields'
    ? {
        ...field,
        blocks: field.blocks.map((block) => ({
          ...block,
          fields: block.fields.map(validateNameField),
        })),
      }
    : field

const hideTechnical = (fields: Field[]): Field[] =>
  fields.map((field) =>
    'name' in field && HIDDEN_FORM_FIELDS.includes(field.name)
      ? ({ ...field, required: false, admin: { ...field.admin, hidden: true } } as Field)
      : checkFieldNames(field),
  )

/**
 * Formulários do site (plugin oficial). Formulários: o leigo monta os campos. Mensagens: cada envio
 * do site, guardado no painel e avisado por e-mail. Decisão de 26/10/2026: lista e e-mail, com a
 * caixa de "Concordo" obrigatória.
 */
export const formsPlugin = formBuilderPlugin({
  fields: {
    text: true,
    email: true,
    textarea: true,
    select: true,
    checkbox: true,
    country: false,
    state: false,
    number: false,
    message: false,
    date: false,
    radio: false,
    payment: false,
    upload: false,
  },
  formOverrides: {
    labels: { singular: 'Formulário', plural: 'Formulários' },
    access: {
      // O site desenha o formulário para qualquer visitante.
      read: anyone,
      create: authenticated,
      update: authenticated,
      delete: authenticated,
    },
    admin: {
      group: 'Site',
      description: 'Campos dos formulários que aparecem na seção "Formulário" das páginas.',
    },
    fields: ({ defaultFields }) => hideTechnical(defaultFields),
    hooks: {
      beforeDelete: [protectFormDelete],
    },
  },
  formSubmissionOverrides: {
    labels: { singular: 'Mensagem', plural: 'Mensagens' },
    access: {
      // Qualquer visitante envia; as regras do envio ficam em `checkFormSubmission`.
      create: anyone,
      read: authenticated,
      update: () => false,
      delete: authenticated,
    },
    admin: {
      group: 'Site',
      defaultColumns: ['form', 'page', 'createdAt'],
      description:
        'Mensagens enviadas pelos formulários do site. Cada uma também chega por e-mail.',
    },
    fields: ({ defaultFields }) => [
      ...defaultFields.map((field) =>
        'name' in field && SUBMISSION_LABELS[field.name]
          ? ({ ...field, label: SUBMISSION_LABELS[field.name] } as Field)
          : field,
      ),
      {
        name: 'consent',
        type: 'checkbox',
        label: 'Concordou com o uso dos dados',
        defaultValue: false,
        admin: { readOnly: true },
      },
      {
        // A frase que a pessoa aceitou, guardada junto (LGPD).
        name: 'consentText',
        type: 'text',
        label: 'Frase aceita',
        admin: { readOnly: true },
      },
      {
        name: 'page',
        type: 'relationship',
        relationTo: 'pages',
        label: 'Enviada pela página',
        admin: { readOnly: true },
      },
    ],
    hooks: {
      beforeChange: [checkFormSubmission],
      afterChange: [notifyNewMessage],
    },
  },
})
