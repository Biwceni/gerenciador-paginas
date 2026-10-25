# Lições da POC (pock-cms-proj)

A POC é um único app Next.js 16 com Payload v3 (motor, auth, versões, mídia, API) e Puck como editor, em Supabase Postgres + Storage, na Vercel Hobby. O layout da página é guardado como JSON validado por Zod (`puckData`), com uma lista fechada de blocos, "design travado, conteúdo livre" e segurança aplicada no servidor.

## O que manter

- Payload + Puck no mesmo app Next.js, com o editor como tela própria dentro do admin e as permissões do Payload.
- JSON da página validado por esquema.
- Segurança no servidor (na POC, rascunhos não vazavam e `/api/users` respondia 403).
- Site público leve (4 a 11 KB por página, LCP ~0,3 s) e sem violações WCAG A/AA no axe.

## O que falhou e como corrigir aqui

| Problema na POC | Correção neste projeto |
| --- | --- |
| Nunca testada com um usuário leigo | Testar o protótipo com um leigo antes da fase 2 e de novo ao fim da fase 3 |
| Admin nativo do Payload é a "casa" do editor, com linguagem técnica | Painel próprio em pt-BR com nomes do dia a dia |
| Barra superior dupla e dois botões de publicar | Uma barra e um único botão Publicar |
| Edição em formulário lateral, não no lugar | Edição de texto direto na página |
| Raiz `/` dá 404 (depende de slug `home`) | Página inicial escolhida nas configurações do site |
| Sem cabeçalho, menu e rodapé | Globals Cabeçalho e Rodapé com publicação própria |
| Links para `/contato`, `/servicos`, `/sobre` quebrados | Seletor de página nos links internos; aviso de links para rascunhos ao publicar |
| Imagem `/api/media/file/...` com erro 500; fotos copiadas no JSON quebram ao trocar | Fotos como relação com a coleção de mídia no Supabase S3; troca vale para o site todo |
| Limite de 4 MB no envio | Upload direto do navegador para o Storage |
| Blocos atômicos (Heading, Spacer), sem texto rico | Seções prontas de negócio, texto rico onde fizer sentido |
| Blocos Title/Text colados na borda | Container com margens em todas as seções |
| Editor não vê versões | Versões visíveis e restauráveis no editor |
| Sem recuperação de senha testada | Recuperação por e-mail (Resend) já na fase 0 |
| Sem robots, sitemap, meta, OG; campos de SEO vazios | SEO automático, sitemap e robots gerados das páginas publicadas |
| Sem cache (`no-store`, sempre MISS) | Cache com revalidação ao publicar (ISR) |
| Login com a marca do Payload e `og:image` apontando para `localhost:3000` (`serverURL` não definido) | Admin com marca própria e `serverURL` configurado |
| Mesmo banco para dev e produção | Dois projetos Supabase |
| Conteúdo de teste sem sentido (alt "sdfsds") | Texto alternativo guiado |
