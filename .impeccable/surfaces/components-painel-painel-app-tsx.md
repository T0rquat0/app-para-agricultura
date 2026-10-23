---
version: 1
slug: "components-painel-painel-app-tsx"
primary_target: "components/painel/painel-app.tsx"
related_targets: ["components/painel"]
---

# Painel AGS GEO (app inteiro)

Modo: Operate. PWA no iPhone, campo e escritório. Dono hoje; auxiliares no futuro (papéis em aberto).

Tarefa principal: saber quanto falta voar por cliente e matrícula, lançar área voada e gasto em segundos, e acompanhar o dinheiro da operação.

Restrições: todas as funções atuais ficam (projetos, talhões/matrículas, áreas, serviços, gastos, histórico, relatórios PDF, investimentos, comissão, propostas, login, backup). Português do Brasil. Números em ha e R$.

## Direction contract

THESIS: o app é a própria fazenda vista do satélite. Cada matrícula é o polígono do KML sobre a imagem real, riscado da esquerda para a direita na proporção do que foi voado. Recusa o "centro de operações" preto com verde neon e textura de curvas de nível do app antigo, e o app branco genérico de agro com cartões e barrinhas verdes.

OWN-WORLD: chão quase preto neutro #0A0C0E, superfícies #14171A e #1C2024 separadas por tom e filete branco 8%; texto #F2F4F5 / #A3ABB2 / #7B848C; um sinal azul-ciano #4CC3FF nas ações; riscos a 45° como marca do voado, na cor do andamento fixada pelo usuário (vermelho no começo, laranja, amarelo na metade, verde-claro, verde quando fecha); contorno branco onde nada foi voado. Hanken Grotesk com algarismos tabulares. Painéis que flutuam sobre o mapa com raio 22 e sombra; o resto plano.

STORY: abre e vê quanto falta voar; toca no cliente e vê a fazenda dele no satélite com o que já foi riscado; lança a área do dia e vê o risco avançar.

FIRST VIEWPORT: Início: marca e conta no topo; "Falta voar" com o número em 56px; linha de frentes e total voado; lista de projetos com miniatura de satélite e contorno riscado, barra na cor do andamento; abas embaixo (Campo, Dinheiro, Lançar ao centro, Comissão, Propostas). Projeto: mapa de ponta a ponta em cerca de 58% da tela com o KML, nome do cliente e botões flutuantes (voltar, editar, importar KML, tela cheia), escala; folha que sobe por cima do mapa com falta/voado/contratado, matrículas, último voo e "Lançar área voada" + importar KML.

FORM: direção fixada pelo usuário (satélite, GNSS, precisão, drone; escuro cinematográfico na linha DJI Fly/Terra), após quatro rodadas recusadas; não saiu do sorteio. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Assinatura: o risco proporcional da matrícula no mapa (recorte do polígono por linha vertical com busca binária pela área exata).

Em aberto: serviço de imagem de satélite de produção (MapTiler ou Mapbox, conta do usuário); modo claro para o sol (mantido como opção, padrão escuro); quais polígonos do KML contam como matrícula (o usuário escolhe ao importar).
