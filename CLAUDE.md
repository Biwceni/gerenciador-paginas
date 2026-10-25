# Gerenciador de Páginas

CMS completo para **um único cliente leigo** montar e manter o próprio site sozinho: várias páginas, cabeçalho e rodapé globais e, no futuro, produtos. Referências de experiência: WordPress + Elementor e Magento. O projeto começa do zero; a POC `pock-cms-proj` serve só como referência.

Idioma do projeto: **português do Brasil** (código pode usar nomes em inglês; textos de interface, docs, commits e PRs em pt-BR).

## Estado atual

Repositório recém-criado, ainda **sem código da aplicação**. Próximo passo é a **fase 0 (fundação)**. Veja [docs/plano-de-fases.md](docs/plano-de-fases.md).

## Stack decidida

- **Payload CMS 3.92.x** (motor: auth, coleções, globals, versões, mídia, API) dentro do **Next.js 16.4.x**, **React 19.2.x**, **Node 24**.
- **Puck (`@puckeditor/core`) 0.23.x** como editor visual. Não usar o pacote antigo `@measured/puck`.
- **Supabase**: Postgres (`@payloadcms/db-postgres`) e Storage via S3 (`@payloadcms/storage-s3`). Dois projetos: dev e produção.
- **Vercel** para deploy, com prévia por branch.
- **Resend** para e-mail (recuperação de senha, avisos de formulário).

Versões travadas (sem `^`) para Payload e Puck. Detalhes em [docs/stack-e-versoes.md](docs/stack-e-versoes.md).

## Regras para escrever código

- **Escrever pensando no Payload 4** (em beta desde 09/10/2026): passar `overrideAccess` sempre de forma explícita na API local, ligar versões/rascunhos nas coleções desde o início, evitar APIs marcadas como obsoletas. Migrar ao 4 só quando estável, com o codemod oficial.
- O JSON do Puck é guardado **validado por esquema (Zod) e com número de versão**, para permitir migrar dados se o formato do Puck mudar.
- Segurança sempre no servidor (access control do Payload), nunca só na interface.
- Fotos são **relação** com a coleção de mídia, nunca URL copiada dentro do JSON da página.
- Página inicial é uma **configuração** (escolhida numa lista), não um slug mágico `home`.
- Links internos escolhem uma página existente (seletor), não URL digitada.
- Upload de arquivos direto do navegador para o Storage (a função da Vercel limita o corpo a ~4,5 MB).
- **Nenhum segredo no repositório.** Variáveis em `.env` local (ignorado pelo git) e nas configurações da Vercel; manter um `.env.example` só com os nomes.
- O `@delmaredigital/payload-puck` pode ser lido como referência, mas a integração Payload + Puck é nossa.

## Regras de produto (resumo)

- Interface para leigo: linguagem do dia a dia, sem px, hex, "slug", "collection" etc.
- Cores e fontes **livres** (qualquer cor, qualquer Google Font). Avisos de contraste orientam, mas **nunca bloqueiam**; a cor do texto de botões e rodapé é escolhida automaticamente.
- Editor: seções prontas de negócio + poucas peças de layout (colunas em presets), opções simples. Não expor controles de dev do Puck (Grid 1–12, Flex etc.).
- Um único botão **Publicar**, com checagens (texto alternativo, links para rascunhos, incluir no menu).
- Cabeçalho, rodapé e configurações do site são **globais**, editados fora das páginas e com publicação própria.
- Início guiado: tipo de site → modelo (2 por tipo, com prévia) → nome, frase e WhatsApp (opcional).
- Modelos usam **Lorem Ipsum** no conteúdo; nomes de página, menu e botões ficam legíveis.
- **Produtos estão fora do escopo por agora.**

Mais em [docs/visao-e-decisoes.md](docs/visao-e-decisoes.md).

## Mapa da documentação

| Arquivo | Conteúdo |
| --- | --- |
| [docs/visao-e-decisoes.md](docs/visao-e-decisoes.md) | Objetivo, escopo e todas as decisões de produto, com data |
| [docs/stack-e-versoes.md](docs/stack-e-versoes.md) | Versões, compatibilidade e preparação para o Payload 4 |
| [docs/licoes-da-poc.md](docs/licoes-da-poc.md) | O que a POC fez bem, o que falhou e como corrigir aqui |
| [docs/editor-e-painel.md](docs/editor-e-painel.md) | Como adaptar o Payload e o Puck para o leigo; telas do protótipo |
| [docs/tipos-de-site.md](docs/tipos-de-site.md) | Tipos de site suportados e o fluxo de início guiado |
| [docs/plano-de-fases.md](docs/plano-de-fases.md) | 6 fases, critérios de pronto, lacunas e riscos |
| [docs/referencias.md](docs/referencias.md) | Links das análises e do protótipo (privados do Fábio) |

Ao tomar uma decisão nova com o Fábio, registre-a em `docs/visao-e-decisoes.md` com a data.
