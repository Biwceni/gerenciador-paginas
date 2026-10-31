import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testUser = {
  email: 'teste@exemplo.com.br',
  password: 'senha-de-teste',
  role: 'admin' as const,
}

// `keepOneAdmin` confere depois de todo delete, mesmo o que não apaga nada, e recusa se não sobrar
// administrador. Esta conta fica no banco de testes para o usuário de teste poder ser apagado.
const guardAdmin = {
  email: 'guarda@exemplo.com.br',
  password: 'senha-de-teste',
  role: 'admin' as const,
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  const { totalDocs } = await payload.count({
    collection: 'users',
    where: { email: { equals: guardAdmin.email } },
    overrideAccess: true,
  })
  if (!totalDocs) {
    await payload.create({ collection: 'users', data: guardAdmin, overrideAccess: true })
  }

  // Delete existing test user if any
  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
    overrideAccess: true,
  })

  // Create fresh test user
  await payload.create({
    collection: 'users',
    data: testUser,
    overrideAccess: true,
  })
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: testUser.email,
      },
    },
    overrideAccess: true,
  })
}
