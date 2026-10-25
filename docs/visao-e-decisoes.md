# Visão e decisões

## Objetivo

Construir um gerenciador de páginas melhor que a POC `pock-cms-proj`, pensado desde o início para o **usuário final leigo**. Não é só um criador de landing pages: é um **CMS completo e autônomo**, no qual o cliente cria um site de várias páginas, edita cabeçalho e rodapé como configurações do site e, mais adiante, cadastra produtos.

Referências de experiência: WordPress + Elementor (montagem visual de páginas) e Magento (catálogo, para o futuro).

## Decisões

Todas tomadas pelo Fábio.

| Data | Tema | Decisão |
| --- | --- | --- |
| 2026-10-24 | Clientes | Um único cliente (single-tenant), que cria várias páginas |
| 2026-10-24 | Ponto de partida | Projeto novo do zero; a POC é só referência |
| 2026-10-24 | Escopo | CMS completo: várias páginas, cabeçalho e rodapé globais editados fora das páginas, produtos no futuro |
| 2026-10-24 | Pilha | Payload v3 + Puck, Next.js na Vercel, Supabase (Postgres + Storage) |
| 2026-10-24 | Hospedagem | Continua Vercel + Supabase (o Fábio já tem as contas) |
| 2026-10-24 | Visual | Cores e fontes livres, sem lista fechada (diferente do "design travado" da POC); presets só como atalho |
| 2026-10-24 | Início guiado | Primeira pergunta é o **tipo de site**; depois oferece modelos |
| 2026-10-24 | Tipos na estreia | Só os tipos que Payload + Puck atendem bem como modelos de página: 7 tipos (ver [tipos-de-site.md](tipos-de-site.md)) |
| 2026-10-24 | Conteúdo dos modelos | Lorem Ipsum como exemplo; nomes de página, menu e botões legíveis |
| 2026-10-24 | WhatsApp | Opcional no início, ajustável depois na edição |
| 2026-10-24 | Produtos | Fora do escopo por agora |
| 2026-10-24 | Editor | Editor Puck personalizado: seções prontas de negócio, poucas peças de layout, opções simples |
| 2026-10-24 | Painel | Painel próprio por cima do Payload; telas totalmente nossas só para editor, menu/rodapé e início guiado |
| 2026-10-25 | E-mail | Resend recomendado (ainda não configurado) |
| 2026-10-25 | Repositório | `Biwceni/gerenciador-paginas`, público |

## Perguntas em aberto

- **Quem monta o site:** o cliente sozinho (início guiado essencial) ou recebe pronto (início guiado pode ficar para depois)? Decidir antes da fase 4.
- **Formulários:** destino (e-mail, lista no painel ou os dois) e aviso de privacidade (LGPD). Antes da fase 3.
- **Domínio do cliente** e quem cuida do DNS. Antes da fase 5.
- **Vendas online reais?** Blog e portfólio são de fato desejados? Tráfego pago (página de campanha com pixels)?
- Vercel Pro para uso comercial (o plano Hobby não permite) antes de ir ao ar.
