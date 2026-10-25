import type { TextField } from 'payload'

import { HEX_COLOR_PATTERN } from '../lib/colors'

/** Cor livre, escolhida num seletor de cores (o código da cor fica guardado, sem aparecer). */
export function colorField(name: string, label: string, defaultValue: string): TextField {
  return {
    name,
    type: 'text',
    label,
    required: true,
    defaultValue,
    admin: {
      components: {
        Field: '/components/admin/ColorField#ColorField',
      },
    },
    validate: (value: null | string | undefined) =>
      value && HEX_COLOR_PATTERN.test(value) ? true : 'Escolha uma cor.',
  }
}
