# Gerenciador de Páginas

CMS para um cliente leigo montar e manter o próprio site: várias páginas, editor visual simples, cabeçalho e rodapé globais.

Feito com Payload CMS + Puck, Next.js na Vercel e Supabase (Postgres + Storage).

## Rodar no computador

Precisa de **Node 24** (veja `.nvmrc`) e de um banco Postgres (o projeto Supabase de dev serve).

```bash
npm install
cp .env.example .env   # preencha os valores
npm run dev
```

Abra http://localhost:3000/admin e crie o primeiro usuário. Ele vira **administrador**; os próximos nascem como **editor** (cuidam do site, mas só mexem na própria conta).

- Sem **nenhuma** variável `S3_*`, as fotos ficam na pasta local `media/`. Com só algumas preenchidas, ou na Vercel sem todas, o app recusa subir e diz quais faltam.
- Sem `RESEND_API_KEY`, o e-mail de recuperação de senha aparece só no terminal.
- O banco muda **só por migrações**, também em desenvolvimento (`push: false`). Depois de mudar coleções ou globals: `npm run payload -- migrate:create <nome>` e `npm run payload -- migrate`. Rode `migrate` também na primeira vez, antes do `npm run dev`.

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
| `npm run test:int` / `npm run test:e2e` | Testes (usam o banco de `TEST_DATABASE_URL`, nunca o `DATABASE_URL`) |

## Configurar os serviços

### Supabase (um projeto para dev, outro para produção)

1. **Banco:** em *Connect*, copie a string do **Transaction pooler** (porta 6543) para `DATABASE_URL`.
2. **Storage:** crie um bucket **público** (ex.: `fotos`). Em *Edit bucket*, ligue **Restrict file upload size** com **10 MB** e, em **Allowed MIME types**, coloque `image/jpeg, image/png, image/webp, image/avif, image/gif`. Esse limite vale mesmo se a chave S3 ou um link de envio vazar.
3. **S3:** em *Project Settings > Storage > S3 Connection*, gere uma chave de acesso e preencha `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY`. `S3_BUCKET` é o nome do bucket.
4. `S3_PUBLIC_URL` = `https://<projeto>.supabase.co/storage/v1/object/public/<bucket>`.

As fotos vão do navegador direto para o Storage (o limite da Vercel é ~4,5 MB por envio) e o site lê pelo endereço público do bucket.

### Resend

Crie uma chave em resend.com com permissão **Sending access** (só envio) e preencha `RESEND_API_KEY`. Até verificar um domínio próprio, use `EMAIL_FROM_ADDRESS=onboarding@resend.dev` (só envia para o e-mail da conta Resend).

### Vercel

1. Importe o repositório. *Build Command*: `npm run ci`.
2. Em *Environment Variables*, cadastre as variáveis do `.env.example`: Supabase **dev** para *Preview* e *Development*, Supabase **produção** para *Production*. Um `PAYLOAD_SECRET` diferente para cada ambiente.
3. `NEXT_PUBLIC_SERVER_URL` pode ficar vazio: o código usa o domínio da Vercel.
