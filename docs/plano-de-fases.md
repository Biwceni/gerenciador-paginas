# Plano de fases

Veredito de 24/10/2026: **dá para começar.** Seis fases em sequência, cada uma termina com algo que se pode abrir e usar. Durações são estimativa para uma pessoa em tempo integral, sem base em medição. Total da estreia: 9 a 12 semanas.

## Fase 0, fundação (cerca de 1 semana)

Repositório, Next 16.4 + Payload 3.92 + Node 24, Supabase dev e produção, fotos no Supabase Storage via S3, deploy na Vercel com prévia por branch, login com recuperação de senha por e-mail (Resend), painel em pt-BR com a marca do produto, `.env.example` sem segredos.

**Pronto quando:** dá para entrar no painel, trocar a senha pelo e-mail e subir uma foto que aparece no site.

## Fase 1, dados e site público (1 a 2 semanas)

Coleções **Páginas** (JSON do Puck validado, endereço, SEO, rascunho e versões) e **Fotos** (texto alternativo). Globals **Site** (nome, cores, fontes, página inicial, contato e WhatsApp), **Cabeçalho** e **Rodapé**. Site público com cache que se renova ao publicar, sitemap, robots e metadados automáticos. Ainda sem editor visual: páginas de teste criadas por código.

**Pronto quando:** os problemas da POC (início 404, links quebrados, foto com erro, sem SEO) não existem mais.

## Fase 2, editor visual do leigo (3 a 4 semanas)

Tela própria com o Puck: 12 a 15 seções prontas, edição de texto no lugar, opções simples, escolha de foto da biblioteca, escolha de página para links, computador e celular, desfazer, versões e um único botão Publicar com as checagens.

**Antes de começar:** teste do protótipo com um leigo real e ficha de cada seção (campos, variações, limites de texto).

## Fase 3, painel do leigo (2 semanas)

Meu site, lista de páginas, biblioteca de fotos com troca em todo o site, editor de menu e rodapé com publicação própria, configurações com cores e fontes livres, seção de formulário (plugin oficial).

**Pronto quando:** um leigo cumpre o roteiro de teste sem ajuda.

## Fase 4, início guiado e modelos (1 a 2 semanas)

Coleção Modelos com os 7 tipos (Lorem Ipsum), rotina que copia páginas, menu, rodapé, cores e fontes; telas tipo → modelo → nome, frase e WhatsApp.

## Fase 5, ir ao ar (cerca de 1 semana)

Vercel Pro, domínio e e-mail do cliente, backup do banco, revisão de segurança e acessibilidade, teste final com leigo.

## Depois da estreia

Na ordem: migrar para o Payload 4 quando estável; blog e portfólio; catálogo com pedido por WhatsApp; por último, Produtos com venda.

## Lacunas a fechar

| Lacuna | Por que importa | Fechar antes de |
| --- | --- | --- |
| ~~Repositório no GitHub~~ | Criado em 25/10/2026 | — |
| Vercel e dois projetos Supabase (dev e produção) | A POC usava o mesmo banco para tudo | Fase 0 (Vercel Pro só antes de ir ao ar) |
| Serviço de e-mail (Resend) | Recuperação de senha e avisos de formulário | Fase 0 |
| Teste do protótipo com um leigo real | O roteiro de 9 tarefas está pronto, mas ninguém de fora usou | Fase 2 |
| Ficha de cada seção | Campos, variações e limites de texto | Fase 2 |
| Destino dos formulários e aviso LGPD | E-mail, lista no painel ou os dois | Fase 3 |
| Quem monta o site | Define se o início guiado é essencial | Fase 4 |
| Domínio do cliente e DNS | Publicar de verdade e aparecer no Google | Fase 5 |

## Riscos técnicos

O maior risco é de produto: o editor precisa ser bem mais simples que o Puck padrão, e isso é trabalho nosso.

| Risco | Como reduzir |
| --- | --- |
| Payload 4 sai pouco depois do início | Código pronto para o 4 (ver [stack-e-versoes.md](stack-e-versoes.md)); migrar com o codemod |
| Puck ainda é 0.x | Versão exata travada; JSON validado por Zod e versionado |
| Peças que o Puck não tem (fotos, links, modelos, estilos globais, menu/rodapé, formulários) | Estão no plano como fases próprias; são a maior parte do esforço |
| Fontes livres do Google | Copiar a fonte para o Storage ao salvar; 1 ou 2 fontes por site |
| Cores livres quebram a leitura | Cor do texto automática e aviso de contraste |
| Limites da Vercel e do Supabase | Upload direto para o Storage; Supabase pago em produção |
| Teste com leigo revela problemas tarde | Testar antes da fase 2 e de novo ao fim da fase 3 |
