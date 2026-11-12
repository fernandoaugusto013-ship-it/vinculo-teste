# Comissões e metas financeiras dos recrutadores — Especificação

Cliente: RHagile Group (Karina Tavares). Política válida a partir de 01/12/2026, ainda em validação com o contador.

## 1. Objetivo
Calcular a remuneração mensal de cada recrutador conforme a política: comissão por prazo de fechamento, meta mensal em R$ líquido, valor base, originação, ajuda de custo e reembolso DAS-MEI. Todos os valores e percentuais são **parâmetros editáveis**. Os 3 casos de teste da política devem fechar ao centavo.

## 2. Contexto e restrições
- Recrutadores são **MEI** (CNPJ); a empresa é Simples Nacional. "Coordenação" = papel `admin` existente.
- Protótipo sem backend: dados no `localStorage`. Telas financeiras exibem a faixa **"Ambiente de teste — dados fictícios"** até existir backend. A restrição por usuário vale na tela agora e no servidor depois.
- Não alterar os painéis de cliente e candidato, as páginas públicas nem as metas de funil já existentes (`db.goals`).
- O motor fica em arquivo separado, `vinculo/comissoes.js`, com funções puras (sem acesso a `db`, DOM ou relógio), para ser reaproveitado no servidor.

## 3. Parâmetros (`db.payParams.current`, editáveis só pelo admin)
`impostos 0.10`, `despesas 0.20`, `gupy 100`, `metaBase 4200`, `metaAdaptacao 2100`, `faixaMinima 0.75`, `valorBase 1500`, `ajudaCusto 500`, `das 86.05`, `origPct 0.10`, `carteiraMeses 6`, `clienteNovoMeses 12`, `carenciaDias 8`, `diaPagamento 15`, `diaPlanilha 5`, `diaConferencia 10`, `toleranciaDiasUteis 3`, `adaptacaoMeses 2`, `alertaDias 3`.
Tabelas de comissão por tipo: `geral: [{ate:10,pct:.20},{ate:20,pct:.10},{ate:null,pct:.05}]`, `contabil: [{ate:30,pct:.20},{ate:40,pct:.10},{ate:null,pct:.05}]`.
Cada alteração grava `db.payParams.history[]` com data, quem alterou, parâmetro, valor anterior e novo. Valores inválidos (negativos, percentual > 100%, tabela fora de ordem) são recusados.
`toleranciaDiasUteis` é informativo (dias suspensos são lançados à mão).

## 4. Dados novos
- `users[recrutador]`: `cnpj`, `startDate` (YYYY-MM-DD).
- `job.fin` (opcional; só o admin edita): `tipo` ('geral'|'contabil'), `cliente` (usa a empresa da vaga), `parts: [{userId, pct}]` (soma 100; padrão 100% do responsável, 50/50 se compartilhada), `valor`, `gupy` (bool), `alinhamento`, `aprovacao`, `diasSuspensos`, `admissao`, `status` ('aberta'|'fechada'|'cancelada'|'congelada'|'reposicao'), `garantia` (30|60|90), `fatura: {emissao, status:'aberta'|'recebida', recebimento}`, `originadaPor` (userId|null), `origTipo` ('vaga_extra'|'cliente_novo'|null), `contratoInicio` (data do 1º contrato, para a carteira de 6 meses).
- `db.opps[]`: `{id, userId, empresa, empresaKey, contato, createdAt, tipo ('vaga_extra'|'cliente_novo'|'outro'), servico (NR-01|palestra|formacao_lideres|disc|outro), status ('aberta'|'ganha'|'perdida'), jobId|null, valor|null, contratoData|null}`. `empresaKey` = nome normalizado (minúsculas, sem acento/pontuação/espaços extras); registro duplicado é bloqueado e informa quem registrou primeiro e quando.
- `db.payAdjust[]`: ajustes manuais da coordenação `{id, userId, month, valor (+/-), motivo, by, at}` (inclui estorno de reposição).
- `db.payClosings[]`: `{month, closedAt, closedBy, statements:[extrato congelado]}`. Mês fechado não recalcula; só aceita ajustes com `month` seguinte.

## 5. Cálculos (motor puro)
Todas as datas são do dia local (`YYYY-MM-DD`). Arredondamento: meio centavo para cima, aplicado em cada valor final por vaga e no total.
- **Líquido** = `valor × (1 − impostos − despesas) − (gupy ? 100 : 0)`. Gupy é descontada uma vez, antes da divisão por participação.
- **Prazo** (dias corridos) = `aprovacao − alinhamento − diasSuspensos` (mínimo 0).
- **Faixa**: primeira linha da tabela do tipo com `prazo ≤ ate` (limites inclusivos: geral 10/20; contábil 30/40).
- **Comissão do recrutador na vaga** = `líquido × pct da faixa × parts.pct`. Zero se status ∈ {reposicao, cancelada, congelada}.
- **Originação** (quem consta em `originadaPor`): vaga extra e outros serviços = `origPct × líquido`; cliente novo = `origPct × líquido de cada vaga do cliente` com `contratoInicio` até `carteiraMeses` meses antes da fatura. Cliente novo = sem contrato nos últimos `clienteNovoMeses`. Quem vendeu e conduziu recebe as duas.
- **Meta do mês M** = soma de `líquido × parts.pct` das vagas elegíveis com `admissao` em M **+** líquido originado em M. Cada vaga conta uma vez por recrutador (venda + condução pelo mesmo recrutador = 1). Meta = `metaAdaptacao` para o mês de início e o seguinte (`adaptacaoMeses`), senão `metaBase`.
- **Valor base**: atingimento ≥ 100% → `valorBase`; entre `faixaMinima` e 100% → `valorBase × atingimento`; abaixo → 0.
- **Mês de pagamento da comissão**: mês do **último** entre o recebimento da fatura e `admissao + carenciaDias`; pago em `diaPagamento` do mês seguinte. Fatura em aberto: comissão "aguardando recebimento" (prevista, não liberada), entra no 15 seguinte ao recebimento.
- **Extrato do mês de pagamento P** (para o recrutador): `ajudaCusto + das + valorBase(mês M = P−1) + comissões liberadas em P−1 + originação liberada em P−1 + ajustes` = total a pagar no dia 15 de P.
- **Alerta**: vaga aberta com tipo definido e `alinhamento`: faltam ≤ `alertaDias` dias para o prazo passar de faixa (dias corridos, descontando suspensos) → notificação única por vaga e faixa.

## 6. Telas e permissões
- **Admin** (menu "Comissões"): *Parâmetros* (editar + histórico); *Recrutadores* (CNPJ, início); aba **Financeiro** na vaga; *Extratos* (todos, por mês, ajustes, fechar mês); *Coordenação* (faturas em aberto, comissões aguardando recebimento, todos os recrutadores).
- **Recrutador** (menu "Minhas comissões"): % da meta do mês, vagas abertas com dias restantes por faixa, comissões previstas e liberadas, extrato mensal, oportunidades próprias (criar, ver; vê o aviso de duplicidade, mas não o conteúdo do registro alheio além de "já registrada por [nome] em [data]").
- Cliente e candidato: "Acesso restrito", inclusive por URL. Recrutador nunca vê dados financeiros de outro (parâmetro na URL é ignorado).
- Faixa de ambiente de teste em todas as telas financeiras.

## 7. Fases
- **Fase 1:** `comissoes.js` + parâmetros + dados do recrutador + aba Financeiro na vaga + extrato (admin e recrutador) + os 3 casos como teste de aceitação.
- **Fase 2:** oportunidades + painel do recrutador + relatório da coordenação + alertas + fechamento de mês.
- Cada fase em branch próprio, entregue com diff e zip; merge na `main` só com "pode misturar". Backend depois.

## 8. Casos de aceitação (valores da política)
1. 3 vagas R$ 1.320 em 15 dias + 2 de R$ 1.800 com Gupy em 8 dias → líquido 5.092,00; comissões 741,20; valor base 1.500,00; total 2.827,25.
2. 4 × R$ 1.320 em 8 dias; 2 × R$ 1.800 Gupy em 15 dias; 2 contábeis R$ 2.500 Gupy em 25 dias; originação de cliente novo (2 vagas R$ 1.320) e palestra R$ 1.100 → líquido 9.316,00; comissões 1.631,20; originação 261,80; total 3.979,05.
3. 3 × R$ 1.320 em 15 dias → líquido 2.772,00 (66%); comissões 277,20; valor base 0; total 863,25.
Total = comissões + originação + valor base + 500,00 + 86,05.

## 9. Casos de borda a testar
Prazo 10/11/20/21 (geral) e 30/31/40/41 (contábil); participação 50/50; fatura em aberto; admissão depois do recebimento; reposição/cancelada/congelada; meta de adaptação; atingimento 74,99/75/99,99/100%; recrutador sem vagas; parâmetro editado muda o resultado; mês fechado não recalcula; duplicidade de empresa (acentos, maiúsculas); permissões A≠B; migração de `localStorage` antigo.

## 10. Decisões assumidas (aguardam a Karina)
Mês da admissão para a meta; originado conta na meta no mês da admissão/contrato; reposição sem comissão e estorno só por ajuste manual; garantia apenas registrada; adaptação = mês de início + seguinte, sem proporcional; tolerância só informativa; arredondamento meio-centavo para cima. Cada item é alterável sem mudar a estrutura.

## 11. Fora do escopo
Integração com faturamento/ERP, PDF/planilha, cálculo de tributos além dos parâmetros, backend (próximo projeto).
