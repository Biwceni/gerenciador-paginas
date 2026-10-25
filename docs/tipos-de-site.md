# Tipos de site e início guiado

## Decisão

A primeira pergunta do início guiado é o **tipo de site** (não o ramo do negócio). Na estreia entram só os tipos que Payload + Puck atendem bem como modelos de página.

## Os 7 tipos da estreia

1. **Site da empresa** (institucional, várias páginas). Depois pergunta o ramo para escolher o conteúdo de exemplo.
2. **Uma página só** (one-page, menu com âncoras para as seções).
3. **Landing page** (campanha; opção de esconder cabeçalho e rodapé).
4. **Evento**.
5. **Site pessoal** (currículo, profissional autônomo).
6. **Página de links** (link na bio).
7. **Em breve** (coming soon).

Aparecem como "em breve" na tela: blog, portfólio, cardápio digital e catálogo.

## Fluxo do início guiado

1. Tipo de site.
2. Escolher 1 de 2 modelos daquele tipo, com prévia ao vivo.
3. Nome do site, frase de apresentação e WhatsApp (opcional, ajustável depois).

Ao concluir, cria páginas, menu, rodapé, cores e fontes a partir do modelo. Conteúdo dos modelos em Lorem Ipsum; nomes de página, menu e botões legíveis.

No sistema real: coleção **Modelos** no Payload (JSON do Puck + valores dos globals), copiada por uma rotina do Payload. Nem o Payload nem o Puck trazem essa tela pronta.

## O que vem depois da estreia

| Tipo | Situação |
| --- | --- |
| Blog, portfólio | Fase seguinte: coleção no Payload + seção vitrine no Puck |
| Loja | Catálogo + pedido por WhatsApp primeiro; checkout completo (carrinho, Pix, frete, estoque) depois ou à parte |
| Cardápio digital, central de ajuda, vagas | Encaixam no padrão coleção + vitrine |
| Catálogo B2B com orçamento, imóveis/veículos, agendamento (só link), doações de ONG (link externo) | Parcial |
| Portal de notícias, web app, cursos online, marketplace com vários vendedores | Não suportado |

Peças comuns a vários tipos: construtor de formulários (plugin oficial), âncoras de seção para o menu, padrão coleção + vitrine, opção "página de campanha" (sem cabeçalho e rodapé, com pixels de anúncio). Transversais para o futuro: vários idiomas (localização do Payload), popups, seções salvas.
