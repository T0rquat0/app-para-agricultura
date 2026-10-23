# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA instalado no iPhone (Safari, modo standalone, notch e safe areas). Funciona também no navegador do computador.

## Users

O dono da AGS GEO (Guilherme), que faz levantamento com drone em propriedades rurais de Roraima. Usa o app sobretudo no iPhone, em campo (sol, caminhonete, entre um voo e outro) e no escritório, para lançar o que voou, o que gastou e para acompanhar o dinheiro da operação.

Auxiliares de campo vão entrar no futuro. O que eles poderão ver e fazer ainda não foi decidido: não projetar papéis/permissões por enquanto.

## Product Purpose

Painel de gestão da divisão de levantamento e geoprocessamento da AGS Soluções Agrícolas. Substitui planilha e caderno: cada projeto (cliente/fazenda) tem talhões, áreas voadas (hectares por dia), serviços cobrados, gastos operacionais e histórico. Em cima disso o app calcula o progresso do levantamento, o faturamento, o saldo da operação, a comissão mensal do funcionário e gera relatórios e propostas comerciais em PDF.

Sucesso: lançar uma área ou um gasto em segundos no celular e saber, de relance, quanto falta voar e quanto a operação está ganhando.

## Operating Context

- Lançamentos curtos e frequentes no celular, muitas vezes com uma mão e com pressa.
- Relatórios em PDF saem do app e vão para cliente (progresso) e para uso interno (gastos, investimentos, comissão).
- Propostas comerciais montadas no app e enviadas em PDF ao cliente.
- Dados na nuvem (Supabase), com login; celular e computador gravam ao mesmo tempo.
- Unidades: hectares (ha), reais (R$), datas no formato brasileiro. Valores grandes (milhares de ha, dezenas de milhares de R$).

## Capabilities and Constraints

- Telas: início (progresso global, saldo, frentes ativas, clientes), projeto (abas Áreas, Serviços, Gastos, Histórico), novo projeto, investimentos (CAPEX), comissão (lançamentos por mês, ajustes, relatório), propostas (lista, formulário, documento), relatórios de cliente e de gastos, login.
- Stack: Next.js 16, React 19, Tailwind 4, componentes próprios em components/painel, ícones lucide-react, SWR, Supabase.
- Tema claro e escuro.
- Mais etapas/funcionalidades serão acrescentadas depois do redesenho; a estrutura visual precisa aceitar telas novas sem retrabalho.
- Idioma: português do Brasil.

## Brand Commitments

- Nome: AGS GEO — divisão de Levantamento e Geoprocessamento da AGS Soluções Agrícolas.
- Nenhum elemento visual atual é obrigatório (logo, verde e paleta podem ser repensados).
- A abertura animada com o globo (foco em Roraima) fica; o dono acha que ela está artificial e quer melhorá-la, mas por último, depois do layout do app.

## Evidence on Hand

- Dados reais de 3 projetos, 7 investimentos, comissões e 3 propostas no banco.
- Marca atual em public/ (ags-geo-mark*.png, ags-logo*.png, ícones do PWA).
- Croqui de exemplo: public/croqui-vila-alta.pdf.

## Product Principles

1. Campo primeiro: a ação mais comum (lançar área ou gasto) tem que ser a mais rápida e caber numa mão.
2. Números são o produto: hectares e reais precisam ser legíveis de relance, inclusive no sol.
3. Uma ferramenta de trabalho de verdade, não uma vitrine: confiável, calma, sem enfeite que atrapalhe.
4. Crescer sem quebrar: novas etapas entram no mesmo sistema visual.
