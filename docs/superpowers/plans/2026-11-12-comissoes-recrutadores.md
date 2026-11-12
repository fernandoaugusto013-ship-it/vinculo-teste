# Comissões e metas financeiras dos recrutadores — Plano de implementação

> **Para executores:** SUB-SKILL OBRIGATÓRIA: usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans. Os passos usam caixas `- [ ]`.

**Objetivo:** Calcular e exibir a remuneração mensal dos recrutadores (comissão por prazo, meta em R$ líquido, valor base, originação, ajuda de custo e DAS-MEI), com parâmetros editáveis e os 3 casos da política fechando ao centavo.

**Arquitetura:** Motor de cálculo puro em `vinculo/comissoes.js` (sem `db`, DOM nem relógio; recebe tudo por argumento) exposto como `window.Comissoes` e também testável em Node. A interface fica em `vinculo/app.js`, num bloco novo `/* ---------- Comissões ---------- */` que lê `db` e chama o motor. Dados novos em `db.payParams`, `db.opps`, `db.payAdjust`, `db.payClosings`, `job.fin` e campos do recrutador.

**Tecnologia:** JavaScript vanilla (SPA em IIFE), `node --test` para o motor, pytest + Playwright para a interface (mesmo padrão de `tests/metas`).

**Spec:** `docs/superpowers/specs/2026-11-12-comissoes-recrutadores-design.md`

## Restrições globais
- Alterar **somente** o que a spec pede. Não tocar painéis `/e/*` e `/c/*`, páginas públicas nem as metas de funil (`db.goals`, tela Metas, Indicadores).
- Moeda em reais com arredondamento meio-centavo para cima (`round2`) em cada valor final por vaga e no total. Datas como texto `YYYY-MM-DD` do dia local; nenhum cálculo em UTC.
- Textos em português do Brasil; "MEI" e "DAS-MEI" mantidos (recrutadores são MEI). Usar "Kanban", nunca "Pipeline".
- `window.Comissoes` não pode ler `db`, `Date.now()` nem `new Date()` sem argumento: quem chama passa `hoje` (`YYYY-MM-DD`).
- Todas as telas financeiras mostram a faixa `.fin-env`: "Ambiente de teste — dados fictícios".
- Permissões: recrutador só vê o próprio financeiro; admin vê tudo; cliente e candidato "Acesso restrito" (inclusive por URL; parâmetros de usuário na URL são ignorados). Em `jobs[].fin` só admin escreve.
- Chaves de `localStorage` inalteradas. Backup de `vinculo/app.js`, `vinculo/app.css` e `index.html` em `/mnt/user-data/outputs/vinculo-BACKUP-antes-comissoes/` antes da Task 1.
- Branch de trabalho: `comissoes-fase1` (cortado de `comissoes-spec`, que contém spec e plano); Fase 2 em `comissoes-fase2`, cortado de `comissoes-fase1` depois de mesclado. Merge na `main` só com "pode misturar" do dono.
- Ids de demonstração existentes: `u_admin`, `u_rec1` (Camila Duarte), `u_rec2` (Rafael Lima); senha `demo123`.

## Foco de revisão
1. Recrutador A abre `#/s/comissoes`, `#/s/comissoes/u_rec2` ou `?user=u_rec2`: nunca vê extrato, meta, oportunidade nem fatura de B.
2. Vaga sem `fin`, valor 0, `aprovacao` antes de `alinhamento`, datas vazias ou inválidas: nenhum `NaN`, `Infinity`, valor negativo nem exceção; a vaga vira "dados incompletos" e não entra na conta.
3. Viradas: admissão no último dia do mês, recebimento em 31/12, carência atravessando o mês, pagamento de dezembro caindo em janeiro do ano seguinte, fevereiro bissexto.
4. Editar parâmetro ou vaga depois do mês fechado não altera o extrato congelado; tentativa de editar `fin` de vaga em mês fechado é avisada.
5. Participações que não somam 100%, recrutador desativado ou removido numa vaga compartilhada, e empresa duplicada com acento, caixa ou espaços diferentes.

## Estrutura de arquivos
- Criar `vinculo/comissoes.js` (motor), `tests/comissoes/engine.test.js`, `tests/comissoes/conftest.py` (cópia do de `tests/metas`), `tests/comissoes/test_*.py`.
- Modificar `index.html` (carregar `vinculo/comissoes.js` antes de `vinculo/app.js`), `vinculo/app.js`, `vinculo/app.css` (classes `.fin-*`).
- Lovable: o mesmo arquivo vai para `public/vinculo/comissoes.js` e o `index.html` do projeto carrega-o; avisar na entrega.

## Contratos do motor (todas as tasks de motor e de interface usam estes nomes)
```
Params = { impostos, despesas, gupy, metaBase, metaAdaptacao, faixaMinima, valorBase, ajudaCusto, das, origPct,
  carteiraMeses, clienteNovoMeses, carenciaDias, diaPagamento, diaPlanilha, diaConferencia, toleranciaDiasUteis,
  adaptacaoMeses, alertaDias, tabelas: { geral: Faixa[], contabil: Faixa[] } }   // Faixa = { ate: number|null, pct }
Fin = { tipo:'geral'|'contabil', parts:[{userId,pct}], valor, gupy, alinhamento, aprovacao, diasSuspensos, admissao,
  status:'aberta'|'fechada'|'cancelada'|'congelada'|'reposicao', garantia:30|60|90,
  fatura:{emissao, status:'aberta'|'recebida', recebimento}, originadaPor, origTipo:'vaga_extra'|'cliente_novo'|'outro'|null, contratoInicio }
Job = { id, cliente, cargo, fin: Fin|null }
Comissoes.defaultParams(): Params
Comissoes.validateParams(p: Params): { ok: boolean, errors: string[] }
Comissoes.round2(n: number): number
Comissoes.diffDays(a: 'YYYY-MM-DD', b: 'YYYY-MM-DD'): number            // b − a em dias
Comissoes.addDays(d, n): string; Comissoes.addMonths(d, n): string; Comissoes.monthOf(d): 'YYYY-MM'; Comissoes.nextMonth(m, n=1): 'YYYY-MM'
Comissoes.liquido(valor, gupy, p): number
Comissoes.prazo(fin): number | null                                     // null se datas faltam/inválidas
Comissoes.faixa(tipo, prazo, p): { pct: number, ate: number|null, idx: number }
Comissoes.diasParaMudar(tipo, prazoAtual, p): number | null             // dias até a próxima faixa mais baixa; null se já na última
Comissoes.competencia(fin, p): 'YYYY-MM' | null                         // mês M; pago dia diaPagamento de M+1; null se fatura aberta
Comissoes.comissaoVaga(job, userId, p): { ok, motivo?, liquido, prazo, pct, valor }
Comissoes.originacao(jobs, userId, p): Array<{ jobId, tipo, base, valor, competencia }>
Comissoes.metaDoMes(month, user, jobs, p): { meta, realizado, pct }   // user = {id, startDate}
Comissoes.valorBase(pct, p): number
Comissoes.extrato(month, user, jobs, ajustes, p): { month, pagamentoEm, ajudaCusto, das, valorBase, meta:{meta,realizado,pct},
  linhas:[{jobId,tipo:'comissao'|'originacao'|'ajuste',descricao,valor}], previstas:[{jobId,valor}], total }
```
Convenção: `extrato(M)` lista o que é pago em `diaPagamento` do mês M+1, e `valorBase` usa a meta do mês M.

---

### Task 1: Motor — parâmetros, datas, líquido, prazo, faixa
**Files:** Create `vinculo/comissoes.js`, `tests/comissoes/engine.test.js`
**Interfaces — Produces:** `defaultParams, validateParams, round2, diffDays, addDays, addMonths, monthOf, nextMonth, liquido, prazo, faixa, diasParaMudar` (contratos acima). Padrão do arquivo: IIFE que atribui a `window.Comissoes` (ou `globalThis` em Node) e `module.exports` quando `module` existe.

- [ ] **Passo 1 (testes `node:test`):** `defaultParams` traz exatamente os valores da spec §3 (`impostos .10`, `despesas .20`, `gupy 100`, `metaBase 4200`, `metaAdaptacao 2100`, `faixaMinima .75`, `valorBase 1500`, `ajudaCusto 500`, `das 86.05`, `origPct .10`, `carteiraMeses 6`, `clienteNovoMeses 12`, `carenciaDias 8`, `diaPagamento 15`, `adaptacaoMeses 2`, `alertaDias 3`, tabelas 10/20/null e 30/40/null com 20/10/5%).
  `liquido(1320,false,p) === 924`; `liquido(1800,true,p) === 1160`; `liquido(0,false,p) === 0`; `liquido(100,true,p) === -30` limitado a 0 → deve devolver `0` (líquido nunca negativo).
  `round2(0.005) === 0.01`, `round2(1.005) === 1.01`, `round2(2.675) === 2.68`, `round2(-0.005) === -0.01`.
  `faixa('geral', n)` para n = 0,10 → pct .20; 11,20 → .10; 21,999 → .05; `faixa('contabil', n)` para 30 → .20, 31 → .10, 40 → .10, 41 → .05.
  `prazo`: alinhamento `2026-12-01`, aprovação `2026-12-11`, suspensos 0 → 10; suspensos 3 → 7; aprovação anterior ao alinhamento → `null`; data vazia ou `2026-02-30` → `null`; suspensos maior que o intervalo → 0.
  `diasParaMudar(tipo, prazoAtual, p)` = `ate − prazoAtual + 1` da faixa atual (dias corridos até o prazo ultrapassar o limite): `diasParaMudar('geral', 8) === 3`, `('geral', 10) === 1`, `('geral', 25) === null`, `('contabil', 28) === 3`.
  `validateParams`: percentual > 1 ou < 0, valores negativos, tabela fora de ordem (`ate` decrescente) ou sem linha final `ate:null` → `ok:false` com mensagem em português.
  `addMonths('2026-01-31', 1) === '2026-02-28'`, `addMonths('2028-01-31',1) === '2028-02-29'`, `nextMonth('2026-12') === '2027-01'`, `diffDays('2026-12-31','2027-01-02') === 2`.
- [ ] **Passo 2:** `node --test tests/comissoes/` → FAIL (módulo inexistente).
- [ ] **Passo 3:** implementar com datas em UTC internamente apenas para aritmética de calendário (`Date.UTC`), sem fuso do usuário; `round2` com `Math.round((n + Math.sign(n) * 1e-9) * 100) / 100`.
- [ ] **Passo 4:** → PASS. **Passo 5:** commit `feat(comissoes): motor — parâmetros, datas, líquido, prazo e faixa`.

### Task 2: Motor — comissão, originação, meta, valor base, competência e extrato
**Files:** Modify `vinculo/comissoes.js`; Test `tests/comissoes/engine.test.js` (ou `engine2.test.js`)
**Interfaces — Consumes:** Task 1. **Produces:** `comissaoVaga, originacao, metaDoMes, valorBase, competencia, extrato`.

Regras (spec §5): comissão = `liquido × pct × parts.pct`, zero se status ∈ {reposicao, cancelada, congelada} ou `prazo === null` (`ok:false`, `motivo:'dados incompletos'`/`'status'`). Participação: se `parts` não soma 100 → `ok:false, motivo:'participação'`. `competencia`: fatura recebida → `monthOf(max(recebimento, addDays(admissao, carenciaDias)))`; admissão ausente ou fatura aberta → `null`. Originação: `originadaPor === userId`; `vaga_extra` e `outro` = `origPct × liquido`; `cliente_novo` = `origPct × liquido` de cada vaga cujo `contratoInicio` esteja a até `carteiraMeses` meses da `fatura.recebimento` (inclusive); competência pela mesma regra da fatura. Para `outro` (serviço sem vaga) o `Job` traz `fin.valor`, `fin.gupy=false`, sem `parts`. Meta: soma de `liquido × pct` das vagas elegíveis do recrutador com `monthOf(admissao) === month` + líquido originado cujo mês de admissão/`contratoInicio` seja `month`; cada `jobId` conta uma vez por recrutador; meta = `metaAdaptacao` se `month` ∈ [`monthOf(startDate)`, +`adaptacaoMeses−1`] senão `metaBase`; `pct = realizado/meta` (0 se meta 0).

- [ ] **Passo 1 (testes de aceitação, valores da spec §8):**
  - Caso 1: recrutador único; 3 vagas R$ 1.320 (alinhamento→aprovação 15 dias, admissão no mês) + 2 de R$ 1.800 Gupy em 8 dias; faturas recebidas no mês, admissão com carência vencida → `extrato(M)`: `meta.realizado === 5092`, soma das linhas de comissão `741.2`, `valorBase 1500`, `total 2827.25`.
  - Caso 2: 4 × 1.320 em 8 dias; 2 × 1.800 Gupy em 15; 2 contábeis 2.500 Gupy em 25 dias; originação cliente novo (2 vagas 1.320, `contratoInicio` no mês) e palestra 1.100 (`outro`) → líquido das vagas conduzidas `9316`, comissões `1631.2`, originação `261.8`, `total 3979.05`.
  - Caso 3: 3 × 1.320 em 15 dias → `realizado 2772`, `pct 0.66`, comissões `277.2`, `valorBase 0`, `total 863.25`.
  - Extrato sem nenhuma vaga: `total === 586.05`, `valorBase 0`, sem `NaN`.
- [ ] **Passo 2 (testes de borda):** `valorBase(0.7499)=0`, `(0.75)=1125`, `(0.9999)=1499.85` (arredondado), `(1)=1500`, `(1.8)=1500`; participação 50/50 divide comissão (cada um 50%); soma ≠ 100 → vaga fora com motivo; status `reposicao`, `cancelada`, `congelada` → fora da meta e da comissão; fatura em aberto → `competencia === null`, vaga aparece em `previstas` e fora de `linhas`; admissão 2026-12-28 e recebimento 2026-12-30 → competência `2027-01` (admissão+8 = 2027-01-05) e `pagamentoEm` de `extrato('2027-01')` = `2027-02-15`; `extrato('2026-12').pagamentoEm === '2027-01-15'`; adaptação: `startDate 2026-12-10`, meses 2026-12 e 2027-01 usam 2100, 2027-02 usa 4200; vaga contada uma vez quando o mesmo recrutador vendeu e conduziu (meta soma o líquido uma vez; comissão soma conduzida + originação); ajustes (`{valor:-50}`, `{valor:30}`) entram em `linhas` tipo `ajuste` e no total; mudar `p.faixaMinima`/`p.metaBase` muda o resultado; `cliente_novo` com `contratoInicio` 7 meses antes do recebimento não gera originação.
- [ ] **Passo 3:** FAIL. **Passo 4:** implementar. **Passo 5:** `node --test tests/comissoes/` → todos PASS. **Passo 6:** commit `feat(comissoes): motor — comissão, originação, meta e extrato`.

### Task 3: Dados, migração, parâmetros e cadastro de recrutador
**Files:** Modify `index.html`, `vinculo/app.js` (inicialização, `seedDB`, bloco Comissões, `shell`, `route`, tela de usuários), `vinculo/app.css`; Create `tests/comissoes/conftest.py`, `test_01_params.py`
**Interfaces — Consumes:** `Comissoes.defaultParams/validateParams`. **Produces (em `app.js`, expostas em `__V.fin`):** `ensurePayDb(): void` (garante `db.payParams={current,history:[]}`, `db.opps=[]`, `db.payAdjust=[]`, `db.payClosings=[]`); `payParams(): Params`; `savePayParams(u, patch): {ok, errors?}` (só admin; valida; grava histórico `{at, by, key, from, to}`); `finAccess(u): 'admin'|'recruiter'|null`. Rotas `#/s/comissoes/parametros` (admin), item de menu "Comissões" (grupo Análise; admin) e "Minhas comissões" (recrutador). Em Usuários, recrutadores ganham campos `cnpj` e `startDate`.

- [ ] **Passo 1 (testes):** banco antigo sem os campos abre sem erro e é migrado (`payParams.current` igual ao padrão); admin altera `metaBase` para 5000 → `payParams().metaBase === 5000` e histórico tem 1 item com valores anterior e novo; valor inválido (`impostos` 1.5, texto, vazio) → recusado e nada muda; recrutador chamando `savePayParams` → `ok:false`; recrutador abre `#/s/comissoes/parametros` → "Acesso restrito"; menu: admin vê "Comissões", recrutador vê "Minhas comissões", cliente/candidato nenhum dos dois; tabela de faixas editável (alterar 10→12 dias muda `faixa('geral',12)`); CNPJ aceita 14 dígitos com ou sem máscara e recusa tamanho errado; `startDate` obrigatório para recrutador; `page.errors == []`.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar (tela com `.fin-env`, formulário por grupo de parâmetros, histórico em tabela). **Passo 4:** PASS. **Passo 5:** commit `feat(comissoes): dados, parâmetros e cadastro de recrutador`.

### Task 4: Aba Financeiro na vaga
**Files:** Modify `vinculo/app.js` (detalhe da vaga `vagaView`, `actions`, `forms.jobFin`), `vinculo/app.css`; Test `tests/comissoes/test_02_job_fin.py`
**Interfaces — Consumes:** Task 3. **Produces:** `saveJobFin(u, jobId, data): {ok, errors?}` (só admin; valida; bloqueia se a competência do mês estiver fechada em `db.payClosings`, devolvendo `ok:false, error:'Mês fechado'` salvo se `data.force` e papel admin com confirmação); `jobFinSummary(job)` usado pelas telas.

- [ ] **Passo 1 (testes):** admin vê a aba "Financeiro" na vaga e salva os campos da spec §4 (tipo, participações, valor, Gupy, datas, dias suspensos, admissão, status, garantia, fatura, originada por); recrutador não vê a aba nem consegue chamar `saveJobFin`; participações padrão 100% do responsável da vaga, botão "Dividir 50/50"; soma ≠ 100 → erro; `aprovacao` anterior ao `alinhamento` → erro; valor ≤ 0 ou texto → erro; recebimento antes da emissão → erro; fatura `recebida` exige `recebimento`; recrutador desativado ou inexistente em `parts` → erro; duplo clique em salvar não duplica; mostra prévia ao vivo (líquido, prazo, faixa e comissão) usando o motor; vaga em mês fechado → aviso e bloqueio.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(comissoes): aba Financeiro na vaga`.

### Task 5: Extratos (admin e recrutador)
**Files:** Modify `vinculo/app.js` (`comissoesView`, `extratoCard`, rotas `#/s/comissoes` e `#/s/comissoes/extratos`), `vinculo/app.css`; Test `tests/comissoes/test_03_extrato.py`
**Interfaces — Consumes:** `Comissoes.extrato`. **Produces:** `payStatement(u, month, userId): Extrato|null` — **único ponto de leitura**: recrutador só recebe o próprio (ignora `userId` diferente), admin recebe qualquer, outros `null`; usa o congelado de `db.payClosings` quando o mês estiver fechado, senão calcula ao vivo com `payParams()`.

- [ ] **Passo 1 (testes):** recrutador vê o próprio extrato com ajuda de custo, DAS-MEI, valor base, comissões por vaga, originação e "Total a pagar em 15/mm/aaaa"; `payStatement(u_rec1, m, 'u_rec2')` devolve o de `u_rec1`; admin escolhe mês e recrutador e vê o extrato; seletor de mês só lista meses (atual e 6 anteriores); `#/s/comissoes?user=u_rec2` e `#/s/comissoes/u_rec2` para recrutador não mudam o conteúdo; cliente e candidato "Acesso restrito"; vaga sem `fin` não aparece; valores formatados `R$ 1.234,56`; `fin-env` presente; mês sem dados mostra só ajuda de custo e DAS-MEI.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(comissoes): extratos`.

### Task 6: Casos da política carregáveis (ambiente de teste da Karina)
**Files:** Modify `vinculo/app.js` (`loadPolicyCases`, botão na tela de parâmetros), Test `tests/comissoes/test_04_cases.py`
**Interfaces — Produces:** `loadPolicyCases(u, month): {ok, users:[id,id,id]}` (só admin): cria 3 recrutadores fictícios "Caso 1 — meta atingida", "Caso 2 — crescimento", "Caso 3 — abaixo da meta" (`cnpj` fictício, `startDate` 12 meses antes, sem login) e as vagas com `fin` para o `month` informado, de modo que `payStatement(admin, month, id).total` seja exatamente `2827.25`, `3979.05` e `863.25`; idempotente (segunda chamada não duplica). `removePolicyCases(u)` apaga só o que foi criado (marcado `demo:'politica'`).

- [ ] **Passo 1 (testes):** após o botão, os três extratos exibem os totais esperados e as linhas de comissão somam `741,20`, `1.631,20` e `277,20`; segunda chamada não duplica; remover apaga só os criados; recrutador não consegue chamar; os recrutadores fictícios não recebem notificações nem aparecem em Metas.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar (datas calculadas a partir do `month`, p.ex. admissão no dia 10 e recebimento no dia 12 com carência vencida). **Passo 4:** PASS. **Passo 5:** commit `feat(comissoes): casos da política carregáveis`.

### Task 7: Fase 1 — regressão e entrega
**Files:** Create `tests/comissoes/test_05_phase1_regression.py`

- [ ] **Passo 1 (testes):** matriz de permissões (admin, `u_rec1`, `u_rec2`, cliente, candidato) em `#/s/comissoes`, `#/s/comissoes/parametros`, `#/s/comissoes/extratos`, com URLs de outro usuário; nenhuma rota staff existente gera erro de página (dashboard, vagas, kanban, triagem, banco, indicadores, metas, notificações, usuários); painéis `/e/*`, `/c/*` e páginas públicas sem classes `fin-` e sem item de menu novo; contraste ≥ 4,5:1 nos tons claro e escuro nas telas novas; `localStorage` antigo migra; suíte `tests/metas` continua passando.
- [ ] **Passo 2:** `node --test tests/comissoes/ && python3 -m pytest tests/comissoes tests/metas -q` → tudo PASS. **Passo 3:** capturas (claro, escuro, 390 px) de parâmetros, aba Financeiro e extratos; revisar. **Passo 4:** gerar `/mnt/user-data/outputs/vinculo-comissoes-fase1/` com `app.js` e `comissoes.js` (versão Lovable com `/vinculo/img/`), `app.css`, `index.html`, `alteracoes.diff`, `COMO-USAR.txt` e atualizar `vinculo-github-pages.zip`; push de `comissoes-fase1` e aguardar "pode misturar". **Passo 5:** commit `test(comissoes): regressão da Fase 1`.

### Task 8: Oportunidades (Fase 2)
**Files:** Modify `vinculo/app.js` (`oppsView`, `actions`, `forms.opp`), `vinculo/app.css`; Test `tests/comissoes/test_06_opps.py`
**Interfaces — Produces:** `empresaKey(nome): string` (minúsculas, sem acento, pontuação e espaços repetidos; remove sufixos "ltda", "me", "eireli", "sa"); `saveOpp(u, data): {ok, error?, existing?:{by,at}}` (recrutador cria só para si; admin cria para qualquer recrutador ativo; duplicidade de `empresaKey` → `ok:false, existing:{by:nome, at}`); `updateOpp(u, id, patch)` (status ganha/perdida, vínculo com vaga/contrato; só dono ou admin); `oppsFor(u)`: recrutador só as próprias, admin todas.

- [ ] **Passo 1 (testes):** `empresaKey('Açaí & Cia. LTDA ')` igual a `empresaKey('acai cia')`; segundo registro da mesma empresa por outro recrutador é bloqueado e a tela mostra só "já registrada por [nome] em [data]"; `oppsFor(u_rec1)` nunca traz as de `u_rec2`; tipo/serviço/status válidos; campos obrigatórios; duplo clique cria 1; marcar "ganha" exige vaga ou contrato vinculado e, para cliente novo, `contratoInicio`; ao ganhar, copia `originadaPor` e `origTipo` para o `fin` da vaga vinculada; admin vê todas com filtro por recrutador.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(comissoes): oportunidades`.

### Task 9: Painel do recrutador
**Files:** Modify `vinculo/app.js` (`minhasComissoesView`), `vinculo/app.css`; Test `tests/comissoes/test_07_panel.py`
**Interfaces — Consumes:** `Comissoes.metaDoMes/diasParaMudar/faixa/extrato`.

- [ ] **Passo 1 (testes):** painel mostra % da meta do mês com barra e rótulo "Meta de adaptação" quando aplicável; lista vagas abertas do recrutador (com `fin.alinhamento`) com "dias restantes nesta faixa" e a comissão atual e a da próxima faixa; comissões previstas (fatura em aberto) e liberadas separadas; vaga de outro recrutador nunca aparece; sem vagas mostra estado vazio sem `NaN`; admin vê o painel de qualquer recrutador via seletor, recrutador não tem seletor.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(comissoes): painel do recrutador`.

### Task 10: Coordenação, ajustes e fechamento de mês
**Files:** Modify `vinculo/app.js` (`coordenacaoView`, `actions`), `vinculo/app.css`; Test `tests/comissoes/test_08_coord.py`
**Interfaces — Produces:** `addAdjust(u, userId, month, valor, motivo): {ok}` (só admin; motivo obrigatório; valor ≠ 0; recusa mês fechado); `closeMonth(u, month): {ok, error?}` (só admin; congela os extratos de todos os recrutadores ativos em `db.payClosings`; só meses anteriores ao atual; idempotente por mês); `reopenMonth` não existe (correção só por ajuste no mês seguinte).

- [ ] **Passo 1 (testes):** relatório lista todos os recrutadores com total do mês, faturas em aberto (cliente, vaga, valor, dias em aberto) e comissões aguardando recebimento; ajuste de −50 com motivo aparece no extrato; sem motivo é recusado; fechar mês congela: alterar parâmetro (`metaBase`) ou `fin` depois não muda o extrato fechado; fechar duas vezes não duplica; recrutador não chama `closeMonth`/`addAdjust`; ajuste em mês fechado recusado; estorno de reposição lançado como ajuste negativo no mês seguinte e refletido no total.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(comissoes): coordenação, ajustes e fechamento`.

### Task 11: Alertas de faixa
**Files:** Modify `vinculo/app.js` (`checkFaixaAlerts`, chamada na inicialização e em `render` do dashboard), Test `tests/comissoes/test_09_alerts.py`
**Interfaces — Produces:** `checkFaixaAlerts(hoje:string): number` (cria notificação ao recrutador responsável quando `diasParaMudar ≤ alertaDias`; uma por vaga e faixa, guardando `db.payAlerts[] = {jobId, faixaIdx}`; devolve quantas criou).

- [ ] **Passo 1 (testes):** vaga geral com prazo 8 (faltam 3) gera 1 alerta ao responsável; segunda chamada gera 0; prazo 5 não gera; ao passar para a faixa seguinte e voltar a faltar 3 dias para a próxima, gera novo alerta; vaga fechada, cancelada, congelada ou sem `alinhamento` não gera; alerta vai só para os `parts` da vaga; dias suspensos adiam o alerta; recrutador desativado não recebe; selo/lista de notificações do recrutador mostra o texto "falta(m) N dia(s) para a vaga [cargo] mudar de faixa de comissão".
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(comissoes): alertas de faixa`.

### Task 12: Fase 2 — regressão e entrega
**Files:** Create `tests/comissoes/test_10_phase2_regression.py`

- [ ] **Passo 1 (testes):** matriz de permissões estendida a oportunidades, painel e coordenação (admin, `u_rec1`, `u_rec2`, cliente, candidato; URLs com usuário alheio); nenhuma rota de staff gera erro de página; painéis cliente/candidato e páginas públicas intactos; tons claro/escuro e 390 px sem estouro horizontal nas telas novas; mês fechado e migração de banco antigo continuam corretos; suítes `tests/comissoes` e `tests/metas` verdes.
- [ ] **Passo 2:** rodar tudo. **Passo 3:** capturas e revisão visual. **Passo 4:** gerar `/mnt/user-data/outputs/vinculo-comissoes-fase2/` (mesmo formato da Fase 1) e atualizar o zip; push de `comissoes-fase2`; aguardar "pode misturar". **Passo 5:** commit `test(comissoes): regressão da Fase 2`.
