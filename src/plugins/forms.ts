import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import type { FieldConfig } from '@payloadcms/plugin-form-builder/types'
import type { Block, Field } from 'payload'

import { anyone, authenticated } from '../access/authenticated'
import { spreadsheetEndpoint } from '../endpoints/messagesSpreadsheet'
import {
  checkFormSubmission,
  notifyNewMessage,
  prepareForm,
  protectFormDelete,
} from '../hooks/formSubmissions'
import { revalidateOnChange, revalidateOnDelete } from '../hooks/revalidate'
import { validateFieldName } from '../lib/forms'

// Partes do formulário do plugin que só a tela nossa (Formulários) usa: `emails` guarda o e-mail do
// aviso e `confirmationMessage`, a frase depois do envio. Na tela padrão, ficam escondidas, junto
// com o redirecionamento, que não usamos.
const HIDDEN_FORM_FIELDS = ['emails', 'redirect', 'confirmationType', 'confirmationMessage']

// Nomes em português para os campos que o plugin cria nas mensagens.
const SUBMISSION_LABELS: Record<string, string> = {
  form: 'Formulário',
  submissionData: 'Dados enviados',
}

// Campos de dentro de "Dados enviados" (sem nome, o Payload mostrava "Field", "Value" e, em cada
// linha, "Submission Datum").
const SUBMISSION_DATA_LABELS: Record<string, string> = {
  field: 'Campo',
  value: 'Valor',
}

// Depois de guardada, a mensagem só muda no campo `read`.
const locked = { update: () => false }

const translateSubmissionField = (field: Field): Field => {
  if (!('name' in field) || !SUBMISSION_LABELS[field.name]) return field
  const label = SUBMISSION_LABELS[field.name]
  if (field.type !== 'array') return { ...field, label, access: locked } as Field
  return {
    ...field,
    label,
    access: locked,
    labels: { singular: 'Campo enviado', plural: label },
    fields: field.fields.map((inner) =>
      'name' in inner && SUBMISSION_DATA_LABELS[inner.name]
        ? ({ ...inner, label: SUBMISSION_DATA_LABELS[inner.name] } as Field)
        : inner,
    ),
  }
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

/** Tipo "WhatsApp ou telefone" (v2): como o texto curto, com o número conferido no envio. */
const phoneBlock: Block = {
  slug: 'phone',
  labels: { singular: 'WhatsApp ou telefone', plural: 'WhatsApp ou telefone' },
  fields: [
    { name: 'name', type: 'text', label: 'Nome do campo', required: true },
    { name: 'label', type: 'text', label: 'Pergunta' },
    { name: 'width', type: 'number', label: 'Largura' },
    { name: 'required', type: 'checkbox', label: 'Obrigatório' },
  ],
}

/**
 * Formulários do site (plugin oficial). Formulários: o leigo monta os campos. Mensagens: cada envio
 * do site, guardado no painel e avisado por e-mail. Decisão de 26/10/2026: lista e e-mail, com a
 * caixa de "Concordo" obrigatória.
 */
export const formsPlugin = formBuilderPlugin({
  // O aviso é o `notifyNewMessage`. Sem isto, o plugin mandaria um segundo e-mail, vazio, para quem
  // está em `emails`.
  beforeEmail: () => [],
  fields: {
    text: true,
    email: true,
    phone: phoneBlock as unknown as FieldConfig,
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
      beforeValidate: [prepareForm],
      beforeDelete: [protectFormDelete],
      // O site é estático e desenha os campos e a frase do formulário.
      afterChange: [revalidateOnChange],
      afterDelete: [revalidateOnDelete],
    },
  },
  formSubmissionOverrides: {
    labels: { singular: 'Mensagem', plural: 'Mensagens' },
    access: {
      // Qualquer visitante envia; as regras do envio ficam em `checkFormSubmission`.
      create: anyone,
      read: authenticated,
      // Só para marcar como lida ou não lida: todos os outros campos estão fechados (`locked`).
      update: authenticated,
      delete: authenticated,
    },
    admin: {
      group: 'Site',
      defaultColumns: ['form', 'page', 'createdAt'],
      description:
        'Mensagens enviadas pelos formulários do site. Cada uma também chega por e-mail.',
    },
    endpoints: [spreadsheetEndpoint],
    fields: ({ defaultFields }) => [
      ...defaultFields.map(translateSubmissionField),
      {
        name: 'consent',
        type: 'checkbox',
        label: 'Concordou com o uso dos dados',
        defaultValue: false,
        access: locked,
        admin: { readOnly: true },
      },
      {
        // A frase que a pessoa aceitou, guardada junto (LGPD).
        name: 'consentText',
        type: 'text',
        label: 'Frase aceita',
        access: locked,
        admin: { readOnly: true },
      },
      {
        name: 'page',
        type: 'relationship',
        relationTo: 'pages',
        label: 'Enviada pela página',
        access: locked,
        admin: { readOnly: true },
      },
      {
        // Quem envia pelo site não escolhe: toda mensagem nasce não lida.
        name: 'read',
        type: 'checkbox',
        label: 'Lida',
        defaultValue: false,
        index: true,
        access: { create: () => false, update: authenticated },
      },
    ],
    hooks: {
      beforeChange: [checkFormSubmission],
      afterChange: [notifyNewMessage],
    },
  },
})
