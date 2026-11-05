# Metas das recrutadoras — especificação de desenho

Data: 2026-11-05 · Estado: aguardando revisão do cliente · Caminho: arquitetural

## 1. Objetivo
Dar a cada recrutadora metas individuais, atribuídas pelo administrador ou criadas por ela mesma, com acompanhamento automático, alertas de metas não alcançadas e histórico mensal em Indicadores. Escopo: apenas a área do staff (recrutadora e administrador). Painéis da empresa cliente e do candidato, páginas públicas, Kanban e Indicadores existentes **não mudam**.

## 2. Decisões já aprovadas
| Tema | Decisão |
|---|---|
| Abordagem | Progresso calculado automaticamente a partir dos dados do sistema (catálogo fixo de métricas); metas pessoais podem ser livres (manual) |
| Atribuição de resultado | Contratações e prazos contam para a **responsável pela vaga** (`job.recruiterId`); triagem, entrevista, convite e avaliação contam para **quem executou** (id gravado na ação) |
| Privacidade | Metas pessoais são vistas só pela autora. O administrador vê apenas as metas que ele atribuiu. Recrutadora nunca vê metas de outra |
| Período do administrador | Mensal, com sugestão pelo histórico de 90 dias e botão "Copiar metas do mês anterior" |
| Período da recrutadora (metas pessoais) | Diário, semanal ou mensal |

## 3. Dados
Persistência atual: `localStorage` (`vinculo_mvp_v1`). Migra para o banco na Fase 2.

- `db.goals[]`: `{ id, userId, origin: 'admin'|'self', metric|null, title, target, unit, period: 'day'|'week'|'month', start, end, manual: number|null, createdBy, createdAt, status: 'active'|'archived' }`
- `db.goalSnaps[]`: `{ id, userId, month: 'YYYY-MM', goalId, metric, target, result, hit: boolean, origin }` (somente números; sem dados de candidatos)
- Mudanças de etapa (`app.history[]`), avaliações (`db.evals[]`) e convites (`db.invites[]`) passam a gravar também `byId`. O campo `by` (nome) é mantido para não quebrar o que existe. Registros antigos sem `byId` são atribuídos por nome ao usuário correspondente.
- Entrevistas agendadas são contadas pela mudança de etapa para "Entrevista RH" com `byId` (a entrevista única em `app.interview` não é usada para contagem).

## 4. Catálogo de métricas (↑ maior é melhor, ↓ menor é melhor)
| Id | Métrica | Cálculo no período | Dir. |
|---|---|---|---|
| hires | Contratações | Candidaturas das vagas dela com `hiredDate` no período | ↑ |
| fill | Tempo médio de fechamento | Dias da publicação à 1ª contratação, vagas dela | ↓ |
| resp | Tempo da 1ª resposta | Dias entre a candidatura e o 1º movimento, vagas dela | ↓ |
| triaged | Candidatos triados | Mudanças para "Triagem" com `byId` = ela | ↑ |
| interviews | Entrevistas de RH agendadas | Mudanças para "Entrevista RH" com `byId` = ela | ↑ |
| invites | Convites do banco | `db.invites` com `by` = id dela | ↑ |
| evals | Avaliações registradas | `db.evals` com `byId` = ela | ↑ |
| clientOk | Aprovação pelo cliente | Aprovados ÷ (aprovados + reprovados pelo cliente), vagas dela; < 5 casos = "dados insuficientes" | ↑ |
| stuck | Vagas paradas (≥ 7 dias) | Quantidade no momento (reaproveita `jobStats`) | ↓ |

Reaproveitar `indMetrics`/`jobStats` onde já existem. Valor sugerido ao administrador: média por período dos últimos 90 dias × 1,10 (↑) ou × 0,90 (↓), com a base visível e editável.

## 5. Situação de cada meta
- ↑: **Atingida** (resultado ≥ alvo); **No ritmo** (progresso ≥ esperado linear − 10 p.p.); **Atrasada** (abaixo disso); **Não atingida** (período encerrado sem atingir).
- ↓: **Dentro da meta** (valor ≤ alvo) ou **Fora da meta**; sem cálculo de ritmo.
- Meta livre (manual): contador ou marcação; segue a regra ↑.

## 6. Telas e permissões
- Menu: item **Metas** no grupo "Análise" (recrutadora e administrador). Selo com a contagem de metas atrasadas (recrutadora).
- **Recrutadora** `#/s/metas`, três abas: Acompanhamento (bloco "Precisa de atenção" no topo, barras de progresso), Atribuídas (somente leitura) e Pessoais (criar, editar, apagar).
- **Administrador** `#/s/metas`: tabela da equipe com o andamento das metas atribuídas; "Atribuir meta" (várias recrutadoras, métrica, mês, valor sugerido editável); "Copiar do mês anterior". Não vê metas pessoais.
- **Tela Principal da recrutadora:** faixa "N metas atrasadas" com link para Metas.
- **Notificação** à recrutadora ao receber ou ter alterada uma meta do administrador (`notify`).
- **Indicadores → Metas (histórico)** `#/s/indicadores/metas`: últimos 12 meses, atingimento por mês e por métrica. Recrutadora: só o dela (atribuídas + pessoais). Administrador: todas as recrutadoras (apenas atribuídas).
- Acesso: toda leitura de meta passa por uma função única que filtra por `userId` da sessão (admin: `origin = 'admin'`). A rota e as ações recusam acesso de cliente, candidato e de recrutadora a dados de outra, inclusive por URL digitada.
- No protótipo a restrição vale na interface; com backend (Fase 2) passa a ser imposta no servidor.

## 7. Fechamento mensal (fotos)
Na primeira abertura após a virada do mês, para cada meta mensal encerrada sem foto, grava-se uma entrada em `goalSnaps` (idempotente: mesma meta + mês nunca duplica). As métricas por data são recalculadas com precisão; "vagas paradas" é aproximada (estado no momento do fechamento). O protótipo inclui dados de demonstração dos 3 meses anteriores.

## 8. Casos de borda
- Sem vagas ou sem dados: 0 ou "dados insuficientes", nunca erro ou NaN.
- Alvo inválido (vazio, negativo; zero em ↑): formulário bloqueia.
- Meta duplicada (mesma métrica, recrutadora e período): bloqueada.
- Recrutadora desativada: metas vão ao histórico e saem do acompanhamento.
- Exclusão de dados (LGPD): fotos guardam só números.
- Meses sem foto no relatório: exibem "sem metas".

## 9. Testes e validação
Playwright em navegador real, antes de concluir: (1) cálculo de cada métrica com dados de demonstração conhecidos e recrutadora sem vagas; (2) as quatro situações em metas ↑ e ↓; (3) permissões — A nunca vê B (telas, listas, histórico, URL direta), administrador não vê pessoais, cliente e candidato barrados; (4) fluxos: atribuir, copiar mês anterior, criar/editar/apagar pessoal, alerta e selo; (5) fechamento idempotente; (6) regressão das etapas anteriores sem erros no console; (7) capturas nos tons claro e escuro e no celular.

## 10. Entrega
Backup dos arquivos atuais; branch separado `metas-recrutadoras`; arquivos `app.js`, `app.css`, diff e zip do GitHub Pages; mistura na `main` só com "pode misturar". Fora de escopo: e-mail/WhatsApp de alertas, metas para a empresa cliente, metas coletivas, bonificação.
