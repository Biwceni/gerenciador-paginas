# Stack e versões

Versões lidas no registro do npm em 24/10/2026. Next.js 16.4.x + React 19.2.x + Node 24 atende o Payload 3.92 de hoje e também os mínimos do Payload 4, então a base não precisa mudar na migração.

| Peça | Versão atual (24/10/2026) | O que exige | Usar no projeto |
| --- | --- | --- | --- |
| `payload` | 3.92.0 | Node ^22.23.4 ou ≥24.22.1 | 3.92.x, travada |
| `@payloadcms/next` / `@payloadcms/ui` | 3.92.0 | Next ≥16.3.3 <17; React ^19.0.1, ^19.1.2 ou ^19.2.1 | 3.92.x |
| `@payloadcms/db-postgres` | 3.92.0 | Drizzle 0.45, pg 8.20 (Supabase Postgres) | 3.92.x |
| `@payloadcms/storage-s3` | 3.92.0 | Endpoint S3 do Supabase Storage | 3.92.x |
| Plugins oficiais: SEO, form-builder, redirects | 3.92.0 | Mesma versão do `payload` | Quando a fase pedir |
| `@puckeditor/core` | 0.23.0 (0.24 em canary) | React 18 ou 19 | 0.23.x, travada |
| `next` | 16.4.3 | React ^19 | 16.4.x |
| `react` | 19.3.1 | — | 19.2.x (o Payload ainda não lista 19.3) |
| `payload` 4 (beta) | 4.0.0-beta.4 | Node ≥24.22.1, Next ≥16.4.0, TypeScript ≥6.0.3 | Não usar agora |

## Infraestrutura

- **Vercel:** deploy com prévia por branch. Hobby serve para desenvolver; **Pro antes de ir ao ar** (uso comercial).
- **Supabase:** dois projetos, **dev e produção** (a POC usava o mesmo banco para tudo). O plano gratuito pausa após inatividade, então produção em plano pago.
- **Storage:** Supabase Storage pelo adaptador S3 do Payload. Upload direto do navegador para o Storage, porque a função da Vercel limita o corpo a ~4,5 MB.
- **E-mail:** Resend (recuperação de senha e avisos de formulário). Ainda não configurado.

## Preparar para o Payload 4

O guia de migração lista cerca de 100 mudanças. A mais perigosa: a API local passa a checar acesso por padrão.

- Passar `overrideAccess` sempre de forma explícita nas chamadas da API local.
- Ligar versões, rascunhos e autoria nas coleções desde já.
- Usar TypeScript recente e evitar APIs marcadas como obsoletas.
- Migrar quando o 4 estiver estável, com o codemod oficial.

Guia: https://raw.githubusercontent.com/payloadcms/payload/beta/docs/migration-guide/v4.mdx

## Puck

- Usar só `@puckeditor/core`. O pacote antigo `@measured/puck` parou na 0.20.2.
- Puck ainda é 0.x e versões menores mudam comportamento (a 0.23 mudou o arrastar e soltar): travar a versão exata e guardar o JSON validado por Zod com número de versão.
- `@delmaredigital/payload-puck` 0.9.6 existe e é compatível, mas é mantido por uma pessoa, está em 0.x e teve um alerta de segurança corrigido em 08/10/2026. Usar só como referência de código.

## Fontes livres

`next/font` só carrega fontes conhecidas no build. Como o usuário escolhe qualquer Google Font em tempo real, a proposta é **copiar o arquivo da fonte para o nosso Storage ao salvar** (melhor para LGPD e velocidade) e limitar a 1 ou 2 fontes por site.
