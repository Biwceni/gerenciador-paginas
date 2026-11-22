// Dados da empresa no rodapé (D3): razão social, CNPJ e responsável técnico.

export type CompanyData = {
  legalName?: string | null
  cnpj?: string | null
  responsible?: string | null
}

const digits = (value: string) => value.replace(/\D/g, '')

/** CNPJ com os dígitos verificadores certos (14 números, não todos iguais). */
export function isValidCNPJ(value: string): boolean {
  const cnpj = digits(value)
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false
  const check = (length: number) => {
    const weights =
      length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13])
}

/** 00.000.000/0000-00 a partir dos números; o que não tem 14 números volta como veio. */
export function formatCNPJ(value: string): string {
  const cnpj = digits(value)
  if (cnpj.length !== 14) return value.trim()
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

/** Validação do campo: vazio pode; preenchido precisa ser um CNPJ de verdade. */
export function validateCNPJ(value: null | string | undefined): string | true {
  if (!value?.trim()) return true
  return isValidCNPJ(value) ? true : 'Confira o CNPJ: os números não batem. São 14 números.'
}

/** As partes da linha do rodapé, na ordem: razão social, CNPJ e responsável técnico. */
export function companyLine(company: CompanyData | null | undefined): string[] {
  const legalName = company?.legalName?.trim()
  const cnpj = company?.cnpj?.trim()
  const responsible = company?.responsible?.trim()
  return [
    legalName,
    cnpj && isValidCNPJ(cnpj) ? `CNPJ ${formatCNPJ(cnpj)}` : null,
    responsible ? `Responsável técnico: ${responsible}` : null,
  ].filter((part): part is string => Boolean(part))
}
