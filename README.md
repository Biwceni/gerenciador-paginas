# Gerenciador de Páginas

CMS para um cliente leigo montar e manter o próprio site: várias páginas, editor visual simples, cabeçalho e rodapé globais.

Feito com Payload CMS + Puck, Next.js na Vercel e Supabase (Postgres + Storage). Antes de mexer no código, leia [CLAUDE.md](CLAUDE.md) e a pasta [docs/](docs/).

## Rodar no computador

Precisa de **Node 24** (veja `.nvmrc`) e de um banco Postgres (o projeto Supabase de dev serve).

```bash
npm install
cp .env.example .env   # preencha os valores
npm run dev
```

Abra http://localhost:3000/admin e crie o primeiro usuário.

- Sem as variáveis `S3_*`, as fotos ficam na pasta local `media/`.
- Sem `RESEND_API_KEY`, o e-mail de recuperação de senha aparece só no terminal.
- Em desenvolvimento o Payload ajusta o banco sozinho (*push*). Em produção, o banco muda só por migrações.

## Comandos

| Comando | Para quê |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run ci` | Roda as migrações e depois o build (usado na Vercel) |
| `npm run payload -- migrate:create <nome>` | Cria uma migração depois de mudar coleções ou globals |
| `npm run generate:types` | Atualiza `src/payload-types.ts` |
| `npm run generate:importmap` | Atualiza o mapa de componentes do painel |
| `npm run lint` / `npm run typecheck` | Checagens |
| `npm run test:int` / `npm run test:e2e` | Testes (precisam de banco) |

## Configurar os serviços

### Supabase (um projeto para dev, outro para produção)

1. **Banco:** em *Connect*, copie a string do **Transaction pooler** (porta 6543) para `DATABASE_URL`.
2. **Storage:** crie um bucket **público** (ex.: `fotos`).
3. **S3:** em *Project Settings > Storage > S3 Connection*, gere uma chave de acesso e preencha `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY`. `S3_BUCKET` é o nome do bucket.
4. `S3_PUBLIC_URL` = `https://<projeto>.supabase.co/storage/v1/object/public/<bucket>`.

As fotos vão do navegador direto para o Storage (o limite da Vercel é ~4,5 MB por envio) e o site lê pelo endereço público do bucket.

### Resend

Crie uma chave em resend.com e preencha `RESEND_API_KEY`. Até verificar um domínio próprio, use `EMAIL_FROM_ADDRESS=onboarding@resend.dev` (só envia para o e-mail da conta Resend).

### Vercel

1. Importe o repositório. *Build Command*: `npm run ci`.
2. Em *Environment Variables*, cadastre as variáveis do `.env.example`: Supabase **dev** para *Preview* e *Development*, Supabase **produção** para *Production*. Um `PAYLOAD_SECRET` diferente para cada ambiente.
3. `NEXT_PUBLIC_SERVER_URL` pode ficar vazio: o código usa o domínio da Vercel.
