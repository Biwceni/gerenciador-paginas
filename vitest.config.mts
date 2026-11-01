import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    projects: [
      {
        // Funções puras: não usam banco e rodam em qualquer computador.
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.unit.spec.{ts,tsx}'],
        },
      },
      {
        // Usam o banco de TEST_DATABASE_URL.
        extends: true,
        test: {
          name: 'int',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          include: ['tests/int/**/*.int.spec.ts'],
        },
      },
    ],
  },
})
