# Editor e painel para o leigo

O Payload organiza o site, os dados e as regras (como o WordPress por baixo do Elementor). A experiência de montar página vem do Puck. O admin do Payload v3 é React dentro do Next.js e pode ser trocado em partes; o limite é o custo de manter telas próprias a cada atualização.

## Adaptação do Payload em três níveis

**Nível 1, só configuração (fazer tudo desde o início)**

- Marca própria no login e no menu, título da aba, cores e fontes do admin.
- Tudo em pt-BR, com textos nossos ("Entrar" em vez de "Login").
- Menu por perfil: o leigo vê só Páginas, Cabeçalho e rodapé, Fotos e Configurações. Usuários, versões e API ficam escondidos e protegidos no servidor.
- Campos com rótulos simples, técnicos ocultos, padrões preenchidos.
- Globals: Cabeçalho, Rodapé e Configurações do site (nome, logo, cores, fontes, contatos, redes, WhatsApp, página inicial).
- Hooks: endereço gerado do título, SEO automático ("Página | Nome do site"), sitemap e robots, revalidação do cache ao publicar.

**Nível 2, componentes nossos dentro do admin (telas de uso diário)**

- Painel inicial "Meu site": prévia, Ver meu site, Criar página, o que não foi publicado.
- Menu lateral próprio com ícones e nomes do dia a dia.
- Lista de páginas em cartões com status humano ("No ar", "Rascunho", "Alterações não publicadas") e ações diretas.
- Um único botão Publicar.
- Campos: seletor de página para links, seletor de fotos com envio e recorte, prévia no Google e no WhatsApp, texto alternativo guiado.
- Avisos: confirmar antes de tirar do ar página que está no menu ou recebe links; impedir apagar foto em uso.

**Nível 3, telas inteiras nossas (só onde vale)**

- Editor visual de páginas em tela cheia (Puck), uma barra só, edição no texto.
- O mesmo editor para cabeçalho e rodapé, com blocos próprios (logo, menu, contatos, redes).
- Início guiado (ver [tipos-de-site.md](tipos-de-site.md)).

O administrador técnico continua com as telas padrão do Payload. Fixar versões e manter testes E2E das jornadas do leigo.

## O que o Puck dá e o que construímos

Nativo no Puck 0.23: arrastar e soltar, slots (aninhamento e colunas), edição de texto no lugar, campo de texto rico, abas de campos, campos externos, permissões, visualização por tamanho de tela, contorno arrastável, dicionário para UI em pt-BR, tema por CSS, overrides e barra de plugins.

**Construímos nós:** biblioteca e seletor de fotos, seletor de links internos, modelos, seções salvas, estilos globais, formulários, editor de cabeçalho e rodapé, estilos por tamanho de tela. Puck AI é pago (beta no Cloud) e não está no plano.

**Forma do editor:** 12 a 15 seções prontas de negócio + poucas peças de layout (colunas em presets fixos) + estilo por opções simples (sem px nem hex). Não copiar os controles de dev da demo (Grid 1–12, Flex).

## Protótipo navegável

Existe um protótipo clicável do fluxo completo (link em [referencias.md](referencias.md)), com cliente de exemplo "Café Grão Mineiro" e dados simulados. Telas:

- Entrar e esqueci a senha.
- Início guiado em 3 passos: tipo de site, modelo com prévia, nome/frase/WhatsApp.
- Meu site (o que não foi publicado).
- Páginas: selo de página inicial, status, duplicar, tirar do ar, apagar; nova página a partir de modelos.
- Editor estilo Puck: seções curadas, clique para editar texto, opções simples por seção, computador e celular, desfazer, versões, painel da página e do Google.
- Fotos: texto alternativo, onde é usada, trocar em todo o site.
- Menu e rodapé como globais com publicação própria (menu pode apontar para seções da página).
- Configurações: identidade, cores livres (principal, fundo, fundo suave, texto, rodapé), qualquer Google Font pelo nome, avisos de contraste que não bloqueiam, página inicial, contato, SEO, usuários.
- Publicar com checagens: texto alternativo, links para rascunhos, incluir no menu.
- Visão do visitante.
- Seções de formulário e de links; opção "página de campanha" (esconde cabeçalho e rodapé).
- Aba "Roteiro de teste" com 9 tarefas para um leigo e aba "Para a equipe" que liga cada tela a Payload, Puck e Supabase.

Fora do protótipo: arrastar e soltar, colunas livres, envio real de formulários, perfis e permissões, publicação agendada, loja e pagamento.
