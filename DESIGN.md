---
name: AGS GEO
description: Painel de levantamento com drone. A fazenda vista do satélite, riscada conforme se voa.
colors:
  ground: "#0a0c0e"
  surface: "#14171a"
  surface-raised: "#1c2024"
  ink: "#f2f4f5"
  ink-muted: "#a3abb2"
  ink-faint: "#868f97"
  signal: "#4cc3ff"
  signal-ink: "#04141f"
  hairline: "rgba(255, 255, 255, 0.08)"
  hairline-input: "rgba(255, 255, 255, 0.14)"
  track: "rgba(255, 255, 255, 0.1)"
  positive: "#4fd18b"
  warning: "#f2b544"
  danger: "#ff6b63"
  light-ground: "#f2f4f6"
  light-surface: "#ffffff"
  light-surface-raised: "#eceff2"
  light-ink: "#0b1218"
  light-ink-muted: "#4f5a64"
  light-ink-faint: "#66717b"
  light-signal: "#0a7fbf"
  light-hairline: "rgba(11, 18, 24, 0.1)"
  light-hairline-input: "rgba(11, 18, 24, 0.16)"
  light-positive: "#1d7a4f"
  light-warning: "#9a6200"
  light-danger: "#c4242a"
  progress-start: "#ff5a4e"
  progress-advancing: "#ff9a3c"
  progress-half: "#ffd23f"
  progress-almost: "#a8e05f"
  progress-closed: "#34d17a"
  unflown-outline: "#ffffff"
  map-glass: "rgba(20, 23, 26, 0.85)"
  map-glass-ink: "#c9d0d6"
typography:
  display:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  title:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  section:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
  body-strong:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
  tab-label:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  segment: "10px"
  control: "17.5px"
  field: "14px"
  card: "18px"
  stat: "21px"
  panel: "22px"
  sheet: "24px"
  pill: "9999px"
spacing:
  gutter: "16px"
  list-gap: "10px"
  card-x: "14px"
  card-y: "12px"
  row-x: "16px"
  row-y: "14px"
  field-gap: "16px"
  section: "32px"
  touch-min: "48px"
  touch-compact: "40px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.field}"
    padding: "0 20px"
    height: "48px"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 20px"
    height: "48px"
  button-ghost:
    textColor: "{colors.signal}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "40px"
  button-danger:
    textColor: "{colors.danger}"
    rounded: "{rounded.field}"
    padding: "0 20px"
    height: "48px"
  button-icon:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    size: "40px"
  button-map:
    backgroundColor: "{colors.map-glass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    size: "40px"
  button-launch:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.stat}"
    size: "52px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
    height: "48px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  stat-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.stat}"
    padding: "12px 14px"
  list-row:
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    padding: "14px 16px"
  segmented:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.field}"
    padding: "4px"
  segmented-active:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.segment}"
    height: "36px"
  sheet:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.sheet}"
    padding: "12px 20px 24px"
    width: "480px"
  tab-bar:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink-faint}"
    typography: "{typography.tab-label}"
    height: "64px"
  progress-bar:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.pill}"
    height: "4px"
  map-legend:
    backgroundColor: "{colors.map-glass}"
    textColor: "{colors.map-glass-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
---

# Design System: AGS GEO

## Overview

**Creative North Star: "A fazenda vista do satélite"**

O app é a própria fazenda vista de cima. Cada matrícula é o polígono do KML sobre a imagem real de satélite, riscada a 45° da esquerda (oeste) para a direita (leste) na proporção exata do que já foi voado. Todo o resto do sistema existe para deixar esse desenho e os números (hectares, reais) legíveis de relance: um chão quase preto e neutro, superfícies separadas por tom e por um filete fino, um único sinal azul-ciano para a ação, e as cores do andamento reservadas ao que foi voado.

A densidade é de ferramenta de trabalho no celular: uma coluna de 480px no máximo, margem lateral de 16px, alvos de toque de 48px, listas em cartões agrupados. É escuro e cinematográfico por padrão (linha de app de drone e GNSS), com um tema claro de mesma estrutura para usar no sol. Recusas confirmadas pelo dono: o "centro de operações" preto com verde neon e textura de curvas de nível do app antigo, e o app branco genérico de agro com cartões e barrinhas verdes.

O movimento é curto e físico: tudo que se aperta encolhe para 97% em 160ms; folhas sobem de baixo com a curva de gaveta; o risco do mapa avança até o novo ponto em 900ms quando se lança uma área. Nada se mexe só para enfeitar.

**Key Characteristics:**
- Chão quase preto neutro (sem tingir de verde ou azul), superfícies por tom, filete branco de 8%.
- Um sinal azul-ciano, só em ação, seleção, foco e progresso neutro.
- Cinco faixas fixas de cor do andamento (vermelho, laranja, amarelo, verde-claro, verde), nunca degradê.
- Risco a 45° como marca do voado, em mapa, miniaturas e barras.
- Hanken Grotesk com algarismos tabulares em todo número.
- Plano por padrão; sombra só no que flutua (folha, painel sobre o mapa, botão Lançar).

## Colors

Neutros quase sem matiz, um sinal frio, e uma escala de andamento quente-para-verde que só aparece onde há voo. Os tokens vivem como variáveis CSS em `app/globals.css` (`:root` claro, `.dark` escuro, que é o padrão); componentes usam sempre os papéis (`bg-card`, `text-primary`...), nunca hex.

### Primary
- **Azul-ciano de sinal** (`signal`, claro `light-signal`): o botão cheio da tela (um por tela), o botão Lançar, links de ação ("+ Novo projeto"), campo com foco, cursor de texto, contorno de foco, barra de progresso quando não há cor de andamento, número em destaque no StatCard. O texto sobre ele é `signal-ink` (quase preto azulado) no escuro e branco no claro.

### Secondary (cores de estado)
- **Verde positivo** (`positive`): saldo e valores positivos.
- **Âmbar de aviso** (`warning`): avisos não bloqueantes (ex.: polígonos repetidos na importação de KML), sempre em caixa `warning/10` com borda `warning/30`.
- **Vermelho de perigo** (`danger`): excluir, saldo negativo, erro de login. Botão de perigo é tonal (fundo 10%, borda 35%), não cheio, exceto na confirmação final de exclusão.

### Tertiary (escala do andamento)
- **Começo** (`progress-start`, até 25%), **Avançando** (`progress-advancing`, até 50%), **Metade** (`progress-half`, até 75%), **Quase** (`progress-almost`, abaixo de 100%), **Fechada** (`progress-closed`, 100%). Fonte única: `CORES_ANDAMENTO` em `lib/geo.ts`; use `corDoAndamento(pct)`.
- **Contorno não voado** (`unflown-outline`): matrícula com 0% é só um contorno branco (80% de opacidade no mapa), sem preenchimento colorido.

### Neutral
- **Chão** (`ground` / `light-ground`): fundo da página, cabeçalho fixo e barra de abas (a 95%).
- **Superfície** (`surface` / `light-surface`): cartões, listas agrupadas, abas segmentadas.
- **Superfície elevada** (`surface-raised` / `light-surface-raised`): folhas (popover), campos, botões secundários e de ícone, linha tocada (hover), aba ativa.
- **Tinta** (`ink`), **tinta média** (`ink-muted`: rótulos, subtítulos), **tinta fraca** (`ink-faint`: contagens, unidades, placeholder, ícone de seta, aba inativa).
- **Filete** (`hairline`), **filete de campo** (`hairline-input`), **trilho** (`track`, fundo da barra de progresso).
- **Vidro do mapa** (`map-glass`, `map-glass-ink`): controles e legenda sobre a imagem de satélite. São fixos escuros nos dois temas, porque a imagem é escura nos dois.

### Named Rules
**The One Signal Rule.** O azul-ciano é a única cor de ação. Uma tela tem no máximo um botão cheio nele; o resto é secundário (tom), fantasma (texto no sinal) ou ícone.

**The Earned Colour Rule.** As cinco cores do andamento só aparecem ligadas a um percentual voado real (risco, contorno, barra, legenda, ponto de seleção). Nunca como decoração, categoria ou status de outra coisa. Faixas fixas, nunca interpoladas: a mesma cor quer dizer sempre a mesma coisa.

**The Neutral Ground Rule.** O chão e as superfícies não levam matiz (nada de verde-escuro ou azul-marinho de fundo). A cor vem do satélite e do andamento.

## Typography

**Display Font:** Hanken Grotesk (via `next/font`, pesos 400–800, com `system-ui`)
**Body Font:** Hanken Grotesk
**Label/Mono Font:** a mesma; números usam algarismos tabulares da própria fonte (utilitário `num`), sem monoespaçada.

**Character:** Uma grotesca só, firme e legível no sol, com o peso fazendo a hierarquia. O número é sempre a coisa maior da área onde aparece; a unidade vem ao lado, menor e em tinta média.

### Hierarchy
- **Display** (800, 56px, 1.02, -0.035em): o "Falta voar" da tela inicial. Um por tela, no máximo. Unidade "ha" a 22px/600 em tinta média.
- **Headline** (800, 30px, -0.02em): o número principal de uma tela interna (ex.: "Falta voar" do projeto), unidade a 15px/600.
- **Title** (700, 19px, -0.01em): título da TopBar e da folha; também valores de StatCard e colunas de números secundários.
- **Section** (700, 15px): SectionTitle ("Projetos", "Relatórios"), com contagem em 14px tinta fraca.
- **Body strong** (600–700, 15–16px): título de linha de lista e de cartão (nome do cliente a 16px/700).
- **Body** (400, 14px): frases de apoio, linha de resumo sob o número.
- **Meta** (400, 13px): subtítulos, fazenda, datas, rótulos acima de números.
- **Label** (600, 12–13px): rótulo de campo (13px/600 tinta média), legenda do mapa, rótulo do StatCard (12px).
- **Tab label** (600, 11px): rótulos da barra de abas.

### Named Rules
**The Tabular Number Rule.** Todo número que se compara ou se soma (ha, R$, %, datas em lista) leva `num`. Campos de número também.

**The Sentence Case Rule.** Rótulos em caixa normal, em português do Brasil. Sem caixa alta espaçada, sem "eyebrow" acima de títulos.

## Layout

- **Coluna única** de até 480px, centralizada; no computador (≥1024px) vira um "aparelho" com cantos de 24px e anel de filete sobre fundo `#050607`.
- **Margem lateral** de 16px em toda tela (`px-4`). Listas com 10px entre cartões; seções separadas por 32px.
- **Safe areas** sempre respeitadas: topo com `env(safe-area-inset-top) + 16px`, base com `env(safe-area-inset-bottom)`. A barra de abas tem 64px + safe area, exposta como `--tabbar`, e o conteúdo reserva esse espaço.
- **Telas de primeiro nível** (Campo, Dinheiro, Comissão, Propostas) têm a barra de abas; telas internas têm TopBar com voltar e não têm abas.
- **Projeto com mapa:** o mapa ocupa a largura toda e 58dvh (mín. 360px); o conteúdo sobe por cima como folha (`-24px`, cantos superiores de 24px, alça de 36×4px). Tela cheia: mapa `fixed inset-0`.
- **Faixa de números do projeto:** grade 1.35fr / 1fr / 1fr dividida por filetes verticais: o número principal à esquerda, os secundários depois.
- **Campos de formulário** com 16px entre si, rótulo 6px acima, dica 6px abaixo. Campos com 16px de fonte (o iPhone não dá zoom).

## Elevation & Depth

Plano por padrão. Profundidade vem do tom (chão → superfície → elevada) e do filete. Sombra só existe no que flutua sobre outra coisa: a folha que sobe, os painéis sobre o mapa e o botão Lançar que sai da barra de abas.

### Shadow Vocabulary
- **Folha** (`box-shadow: 0 -16px 40px rgba(0,0,0,0.5)`): ModalSheet, junto com véu `black/60` atrás.
- **Painel sobre o mapa** (`box-shadow: 0 8px 24px rgba(0,0,0,0.45)`): cartão da matrícula selecionada.
- **Botão Lançar** (`box-shadow: 0 8px 20px rgba(0,0,0,0.45)`): o quadrado de 52px que sobe 14px acima da barra.
- **Vidro do mapa** (sem sombra; `backdrop-filter: blur(12px)` sobre `map-glass`, filete `white/10`): botões e legenda do mapa.
- **Película do topo do mapa** (`linear-gradient(180deg, rgba(10,12,14,0.7), transparent)`, 112px): só para dar leitura ao nome do cliente sobre a imagem.

### Named Rules
**The Only What Floats Rule.** Cartão, linha e campo nunca têm sombra. Se não está flutuando sobre o mapa ou sobre a tela, é tom e filete.

## Shapes

Cantos generosos e consistentes, crescendo com o tamanho da peça: aba segmentada interna 10px, botão e campo 14px, botão de ícone 17.5px (quase um círculo num quadrado de 40px), cartão e lista agrupada 18px, StatCard e botão Lançar 21px, painel/cartão com imagem 22px, folha 24px. A escala nasce de `--radius` (14px): `xl` = ×1.25, `2xl` = ×1.5. Pílulas (totalmente redondas) para ações de texto compactas ("+ Novo projeto", "Lançar" no mapa), legenda do mapa, avatar da conta e botão de fechar da folha. Bordas de 1px no filete; estado vazio usa filete tracejado (`ink` a 15%). O único padrão gráfico é o risco a 45°: no mapa, ladrilho de 20px com traço de 2.6px; em SVG, padrão de 5px com faixa de 1.6–1.8px; em CSS, `bg-risco` (`repeating-linear-gradient(135deg, currentColor 0 1.6px, transparent 1.6px 6px)`).

## Components

### Buttons
Táteis e diretos: tudo que se aperta usa `pressable` (escala 0.97, 160ms, `cubic-bezier(0.23, 1, 0.32, 1)`).
- **Shape:** cantos de 14px; altura mínima 48px (fantasma 40px). Texto 15px/700.
- **Primary:** fundo no sinal, texto `signal-ink`, 20px de lado. Um por tela.
- **Secondary:** fundo `surface-raised`, filete, tinta; hover leva o filete a `ink/20`.
- **Ghost:** texto no sinal, sem fundo; hover `surface-raised`.
- **Danger:** tonal (`danger/10`, borda `danger/35`, texto `danger`).
- **Icon:** quadrado de 40px, cantos 17.5px, `surface-raised` com filete (voltar, editar).
- **Focus:** anel de 2px no sinal a 70%, afastado 2px do chão. Desabilitado: 45% de opacidade.

### Chips (ações compactas)
- **Style:** pílula de texto no sinal, 14px/700, com ícone `+` (ex.: "+ Novo projeto" ao lado do SectionTitle). Variante tonal `signal/12` com texto no sinal para ação de linha (ex.: abrir proposta).

### Cards / Containers
- **Corner Style:** 18px (cartão, lista agrupada); 22px quando leva imagem de satélite.
- **Background:** `surface` sobre o chão.
- **Shadow Strategy:** nenhuma (ver Elevation).
- **Border:** filete de 1px; cartão tocável ganha `pressable` e filete `ink/15` no hover.
- **Internal Padding:** StatCard 12×14px; linhas de lista 14×16px separadas por filete (`divide-y`).
- **Linha de projeto:** grade 88px + resto: miniatura de satélite à esquerda (SatThumb, sem KML mostra "sem KML" em `surface-raised`), nome + número à direita, fazenda + unidade abaixo, barra de progresso de 4px na cor do andamento. Projeto fechado esmaece nome e número para tinta média.

### Inputs / Fields
- **Style:** `surface-raised`, filete de campo, cantos 14px, 48px de altura, 12×14px de padding, texto 16px, placeholder em tinta fraca. Select com seta própria; textarea mínimo 88px.
- **Focus:** borda no sinal + anel `signal/25` de 2px.
- **Error / Aviso:** caixa de alerta acima do formulário (`danger/10` ou `warning/10`, borda 30%, cantos 14px, 13–14px/600).

### Navigation
- **Barra de abas:** fixa embaixo, 5 colunas (Campo, Dinheiro, **Lançar** ao centro, Comissão, Propostas), chão a 95% com filete superior. Ícone 22px (traço 1.8, ativo 2.1) + rótulo 11px/600; ativo em tinta, inativo em tinta fraca. Lançar é o quadrado de 52px no sinal, cantos 21px, sombra, subindo 14px.
- **TopBar:** fixa, chão a 95%, voltar (botão de ícone) + título 19px/700 + subtítulo 13px + ações à direita.
- **Abas do projeto:** controle segmentado de 4 partes em `surface` com 4px de respiro; ativa em `surface-raised` e tinta, inativas em tinta fraca, 36px de altura, 13px/600.
- **Fluxo Lançar:** sequência de folhas (projeto → o que lançar → matrícula → formulário), cada passo uma lista agrupada ou dois cartões de escolha. Novas etapas de fluxo devem seguir esse padrão: uma pergunta por folha, título em forma de pergunta.

### Folha (ModalSheet)
Sobe de baixo (300ms, `cubic-bezier(0.32, 0.72, 0, 1)`), no computador fica centralizada. Fundo `surface-raised`, cantos superiores 24px, máx. 92dvh e 480px, alça 36×4px, título 19px/700, botão fechar redondo de 36px. Fecha no X, no Esc ou tocando fora.

### Mapa do projeto (assinatura)
- **Imagem:** MapLibre com satélite em ladrilhos (`lib/satelite.ts`: MapTiler quando há `NEXT_PUBLIC_MAPTILER_KEY`, senão Esri World Imagery), brilho máx. 0.86, saturação -0.1. Sem rotação.
- **Matrícula:** preenchimento leve na cor do andamento (5%, selecionada 16%), parte voada riscada a 45° recortada do oeste para o leste por busca binária até a área exata (`parteVoada`), linha tracejada onde o voo parou, contorno de 2px (selecionada 3.2px) na cor do andamento ou branco se 0%.
- **Controles:** botões de vidro de 40px no topo (voltar, editar, importar KML, tela cheia) com o nome do cliente sobre a película; escala métrica e crédito compacto no canto inferior direito.
- **Legenda:** pílula de vidro só com as faixas presentes no mapa (quadradinho de 10px + nome: começo, avançando, metade, quase, fechada); com poucas faixas, dica "toque numa área".
- **Seleção:** painel flutuante de 16px de canto com ponto de cor, nome, "voado / meta ha · %" e pílula Lançar no sinal.
- **Tela cheia:** rótulos "Nome · %" em pílula escura (8px de canto, filete na cor da faixa a 60%, 11px/700), os maiores primeiro, escondendo os que colidem.
- **Animação:** ao lançar, o risco avança de onde estava até o novo % em 900ms (ease-out cúbico). Com `prefers-reduced-motion`, salta direto.
- **Sem KML:** cartão de 22px com faixa de imagem de satélite (`/satelite-cerrado.webp`), título, explicação e botão "Importar KML".

### Miniaturas
- **SatThumb:** ladrilhos de satélite (brilho 0.82, saturação 0.9) com os contornos riscados por cima; quadrada.
- **GeoThumb:** só o contorno vetorial riscado, sem imagem (listas de matrículas, importação de KML); 0% em contorno `currentColor` a 55%.

### Barra de progresso e estado vazio
- **ProgressBar:** trilho de 4px redondo em `track`; preenchimento na cor do andamento, no sinal sem cor, ou `ink/45` quando fechado; largura anima 500ms.
- **EmptyState:** filete tracejado, cantos 18px, ícone a 40%, frase de até ~20rem dizendo o que fazer a seguir.

### Exceções conhecidas (fora deste sistema)
- **Documentos em PDF** (relatório do cliente, de gastos, de investimentos, de comissão e o documento da proposta): papel claro A4 (gerado por `lib/pdf.ts`, com cabeçalho corrido, rodapé numerado e cortes que não partem linhas de tabela). Usam a tinta e os cinzas do tema claro, Hanken Grotesk com algarismos tabulares, o sinal `#0a7fbf` só no número principal e nas linhas de destaque, e as cores do andamento nas barras e no mapa das matrículas. As peças comuns ficam em `components/painel/report-shell.tsx`.
- **Abertura com o globo** (`globe-splash`, `splash-screen`, animações `ags-*`): será redesenhada depois; não usar como referência.

## Do's and Don'ts

### Do:
- **Do** montar telas novas com os componentes de `components/painel` (TopBar, Card, StatCard, SectionTitle, EmptyState, ProgressBar, botões, campos, ModalSheet) e os papéis de cor, nunca hex.
- **Do** deixar o número como o maior elemento do bloco, com `num` e unidade menor em tinta média.
- **Do** usar `corDoAndamento(pct)` para qualquer coisa que mostre o voado, e contorno branco para 0%.
- **Do** manter alvos de toque de 48px (ícones 40px) e `pressable` em tudo que se aperta.
- **Do** pôr etapas novas de fluxo em folhas que sobem, uma pergunta por folha.
- **Do** conferir cada tela nos dois temas; os controles sobre o mapa continuam escuros no tema claro.

### Don't:
- **Don't** usar o azul-ciano em mais de um botão cheio por tela, nem como cor decorativa.
- **Don't** usar as cores do andamento para categorias, status de pagamento ou enfeite, nem interpolar entre elas.
- **Don't** pôr sombra em cartão, linha ou campo; sombra é só do que flutua.
- **Don't** tingir o chão de verde ou azul, nem usar verde neon, textura de curvas de nível ou degradês decorativos.
- **Don't** usar caixa alta espaçada, eyebrows acima de títulos ou fonte monoespaçada para números.
- **Don't** usar campo com fonte menor que 16px (o iPhone dá zoom).
