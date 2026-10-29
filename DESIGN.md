# DESIGN.md — Vínculo (área logada: administrador, recrutador e empresa cliente)

Versão 4. Direção: **"calmo, claro e com vida"**. Fundo cinza-claro, cartões brancos bem arredondados, um único cartão preto como destaque, um acento coral e muito espaço. Referência visual: o estudo de caso de dashboard enviado pelo cliente (vídeo "Menu – Leadora"). Adaptamos a linguagem (estrutura, forma, cor, tipografia); não copiamos marca, logo, textos nem ilustrações. A marca Vínculo (nome e anéis) é mantida.

Escopo: tudo que usa o menu lateral (`body.inapp`). Site público, login e área do candidato mantêm o visual atual até decisão contrária.

Base de comparação: **não foi feita comparação com sites reais via UXKIN** (ferramenta não conectada). A direção parte do vídeo do cliente, do tema atual do projeto e das regras de contraste/acessibilidade.

## Cor (papéis)
| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `--bg` | #EBEBEA | #0E0E10 | fundo da página |
| `--card` | #FFFFFF | #17171A | cartões, menu, tabelas, modais |
| `--card2` | #F5F5F4 | #1F1F23 | campos, hover, áreas rebaixadas |
| `--ink` | #0D0D0F | #F2F2F3 | texto e cartão de destaque |
| `--mut` | #62626A | #A3A3AB | texto secundário (≥ 5:1) |
| `--line` | #E2E2E0 | #2A2A2E | divisórias discretas |
| `--pri` | #0D0D0F | #F2F2F3 | ação principal: botão, item ativo do menu |
| `--pri-ink` | #FFFFFF | #0D0D0F | texto sobre `--pri` |
| `--pri-soft` | #F0F0EE | #232327 | fundos de seleção e chips |
| `--coral` | #EE6A4C | #FF7A55 | acento: gráficos, progresso, destaques, ícones de atenção |
| `--link` | #B33C17 | #FF9477 | links e texto em acento (≥ 5:1) |
| `--grad` | #F9A07C → #EC5B33 | igual | cartão de destaque coral, item ativo do menu, barras de progresso |
| `--green` | #1FA463 | #5CC985 | sucesso e variação positiva |
| `--red` | #C23A26 | #F27D69 | erro e ações destrutivas |
| `--sun` | #F4B73F | #F4C95D | alerta/atenção |
| `--lilac` | #8E7BD6 | #B6A6F2 | 2ª série de gráficos |

Regras: preto é a cor de ação; coral só acompanha (nunca vira botão principal); no máximo um cartão preto e um cartão em gradiente coral por tela; texto branco sobre coral só em tamanho grande (≥ 24 px).

## Tipografia
- **Outfit** em tudo (títulos, números, menu, tabelas e formulários), pesos 400/500/600/700, como no vídeo. Antes eram Bricolage Grotesque e Figtree.
- Escala: 12 · 13 · 15 (corpo) · 17 · 23 · 32–40 (saudação/título) · 34 (números KPI). Linhas 1,15 (títulos) e 1,55 (corpo).

## Espaço
Escala de 4 px (4, 8, 12, 16, 20, 24, 32, 48). Cartões com 20–24 px de respiro interno; 16 px entre cartões; página com até 1240 px.

## Forma e profundidade
- Raios: cartões 24 · KPIs 20 · campos 14 · botões e chips em pílula (99).
- Cartões sem borda forte: sombra suave `0 1px 2px rgba(15,15,20,.04), 0 12px 32px -16px rgba(15,15,20,.14)`. No escuro, borda fina no lugar da sombra.
- Menu lateral "flutuante": painel branco arredondado com margem de 12 px.

## Componentes
- **Botão principal**: pílula preta, texto branco; hover um tom mais claro. **Secundário**: pílula branca com borda fina. **Silencioso**: sem borda.
- **Item ativo do menu**: pílula preta com ícone e texto brancos. Subitem ativo: fundo cinza-claro e texto em negrito.
- **KPI**: cartão branco, rótulo pequeno, número grande em Outfit. O primeiro KPI da tela pode ser o cartão preto de destaque.
- **Chips/badges**: pílulas pequenas com ponto de cor, como as etiquetas flutuantes do vídeo.
- **Campos**: fundo branco, raio 14, foco com anel suave preto (claro) ou branco (escuro).
- **Gráficos**: barras e linhas em coral; segunda série em lilás; verde para variação positiva.
- **Tabelas**: dentro de cartão branco, linhas separadas por divisória clara, sem grade.

## Translucidez (premium)
- Fundo da página com "aurora": três manchas suaves (coral, lilás e azul) sobre o cinza-claro (ou sobre o quase-preto no escuro), fixas ao rolar.
- Cartões, tabelas, menu e botões redondos usam vidro: `--glass` (branco 66% no claro, branco 5,5% no escuro), borda de 1 px clara e sombra suave com brilho na borda de cima. Desfoque (`blur`) só no modal e na barra superior, onde há conteúdo passando por trás; o resto não precisa e fica mais leve.
- Cartão de destaque: grafite-índigo em degradê (no lugar do preto chapado) e cartão coral em degradê com sombra colorida.
- Campos de formulário continuam quase opacos (80%) para leitura.

## Menu lateral
- Itens agrupados por tarefa: Recrutamento, Análise, Comunicação e Administração. Cada ícone fica num quadradinho colorido (coral, azul, lilás, verde, amarelo); o item ativo ganha a cor do seu próprio ícone, em degradê translúcido com contorno fino e brilho suave (nada de preto). Ao entrar na página, a pílula desliza e o ícone dá um "pop" curto (0,35 s); só toca ao trocar de página, não ao filtrar, e some com "reduzir movimento".
- **Recolher/expandir:** botão redondo na borda do menu. Recolhido, vira uma coluna de ícones (96 px) e a área central ganha a largura (até 1560 px). A escolha fica salva no navegador. No celular continua a gaveta.
- Cartão "Para triar agora" no rodapé do menu, visível em telas altas.

## Tela Principal
Saudação grande, cartão preto (com mini-barras), cartão coral em gradiente, próximas entrevistas, lista "Precisa de atenção" com botões de ação, "Vagas em andamento" com barra de contratações e "Atividade recente".

## Ícones e imagens
Mesmo conjunto de ícones de traço (1.8 px) já usado. Fotos só nas páginas públicas.

## Evitar
Gradientes roxo/azul, vidro fosco em tudo, cartões idênticos repetidos sem hierarquia, mais de um acento, texto cinza abaixo de 4.5:1.

## Aparência (v5)
Seletor Claro / Escuro / Auto restaurado no rodapé do menu lateral; no menu reduzido aparece um botão único de alternância. O botão da barra superior continua disponível.

## Página inicial (v6)
Hero imersivo em tela cheia (foto + véu escuro), título leve (Inter Tight 300, -0.05em), cabeçalho em vidro translúcido, 4 cartões de vidro, seções em caixas de 40px de raio, passos numerados com barra de progresso, FAQ em acordeão e rodapé em caixa. Escopo: apenas a rota "#/" (classe body.lp). Painéis e demais páginas públicas não mudam.
