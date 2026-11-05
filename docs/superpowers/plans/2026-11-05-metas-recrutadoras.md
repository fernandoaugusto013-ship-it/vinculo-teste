# Metas das recrutadoras — Plano de implementação

> **Para executores:** SUB-SKILL OBRIGATÓRIA: usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans. Os passos usam caixas `- [ ]`.

**Objetivo:** Metas individuais por recrutadora (atribuídas pelo administrador ou pessoais), com progresso automático, alertas e histórico mensal em Indicadores.

**Arquitetura:** Um bloco novo `/* ---------- Metas ---------- */` em `vinculo/app.js` (SPA vanilla em IIFE, estado em `db` + `localStorage`), com funções puras de métrica/situação, uma única camada de acesso (`goalsFor`) e telas renderizadas por `shell()`. Funções expostas a testes só quando `window.__VINCULO_TEST__` existe.

**Tecnologia:** JavaScript vanilla, CSS com tokens existentes (`var(--card)`, `var(--line)`…), Playwright (Python) + pytest.

**Spec:** `docs/superpowers/specs/2026-11-05-metas-recrutadoras-design.md`

## Restrições globais
- Alterar **somente** o que a spec pede: menu e Tela Principal do staff, página Metas, subpágina de Indicadores, registro de `byId`. Não tocar painéis `/e/*` e `/c/*`, páginas públicas, Kanban nem os Indicadores existentes.
- Arquivos fonte: `vinculo/app.js` (usa `vinculo/img/...` relativo) e `vinculo/app.css`. Chaves de `localStorage` inalteradas (`vinculo_mvp_v1`, `vinculo_sess`).
- Textos em português do Brasil; usar "Kanban" (nunca "Pipeline") em textos novos; "Contato protegido até a contratação" permanece como está.
- Ids de usuário atuais: `u_admin`, `u_rec1` (Camila Duarte, `recrutador@vinculo.demo`), `u_rec2` (Rafael Lima, `rafael@vinculo.demo`); senha demo `demo123`.
- Semana = segunda a domingo, datas no horário local. Período mensal = mês-calendário local.
- Antes da Task 1: copiar `vinculo/app.js` e `vinculo/app.css` para `/mnt/user-data/outputs/vinculo-BACKUP-antes-metas/`.
- Trabalhar no branch `metas-recrutadoras` (criado a partir de `origin/main`).

## Foco de revisão
1. Recrutadora abre `#/s/metas?user=u_rec2` ou `#/s/metas/u_rec2`: vê só as próprias metas (parâmetro ignorado).
2. `localStorage` antigo sem `goals`, `goalSnaps` nem `byId` abre sem erro e é migrado.
3. Virada de dia/semana/mês: meta que termina às 23:59 do último dia ainda conta; nenhuma conta usa UTC.
4. Recrutadora sem vagas, alvo 0 e período de duração zero: nunca `NaN`, `Infinity` nem exceção.
5. Recrutadora desativada ou removida (LGPD, `name: 'Removido'`) não aparece na equipe do administrador e não quebra fotos/histórico.
6. Clique duplo em "Salvar" não cria meta duplicada.

## Estrutura de arquivos
- Modificar `vinculo/app.js` (bloco Metas antes de `const actions = {`; ganchos em `moveApp`, `forms.eval`, `route`, `shell`, `dashboard`, `IND_SUBS`, `indicadoresView`, inicialização no fim).
- Modificar `vinculo/app.css` (classes `.gl-*` ao final).
- Criar `tests/metas/harness.html`, `conftest.py`, `test_01_data.py` … `test_09_regression.py`.

---

### Task 1: Harness de testes

**Files:** Create `tests/metas/harness.html`, `tests/metas/conftest.py`, `tests/metas/test_00_smoke.py`

**Interfaces — Produces:** fixture `page` (contexto novo, `localStorage` limpo, app carregado em `harness.html` com `window.__VINCULO_TEST__ = true`, lista `page.errors` com erros de página); `login_as(page, email)`; `goto(page, hash)`.

- [ ] **Passo 1:** `harness.html` com `<div id="app">`, `<div id="modal-root">`, `<div id="toasts">`, define `window.__VINCULO_TEST__=true` e carrega `/vinculo/app.css` e `/vinculo/app.js`.
- [ ] **Passo 2:** `conftest.py`: fixture de sessão que serve a raiz do repo com `python3 -m http.server` em porta livre; fixture `page` (Chromium headless, `page.on('pageerror')` → `page.errors`); `login_as` lê `vinculo_mvp_v1`, acha o usuário pelo e-mail, grava `vinculo_sess` e recarrega; `goto` troca o hash e espera 300 ms.
- [ ] **Passo 3 (teste):** `test_admin_dashboard_loads`: `login_as(page,'admin@vinculo.demo'); goto(page,'#/s/dashboard'); assert 'Boa' in page.inner_text('main') or page.locator('.page').count()==1; assert page.errors==[]`.
- [ ] **Passo 4:** `python3 -m pytest tests/metas/test_00_smoke.py -v` → PASS (instalar `pytest` com `pip install pytest --break-system-packages` se faltar).
- [ ] **Passo 5:** commit `test: harness de testes das metas`.

### Task 2: Id nas ações e migração do banco

**Files:** Modify `vinculo/app.js` (função `moveApp` ~l.1645, `forms.eval` ~l.1941, inicialização ~l.2137); Test `tests/metas/test_01_data.py`

**Interfaces — Produces:** `ensureGoalsDb(): void` (garante `db.goals=[]`, `db.goalSnaps=[]`); `backfillActorIds(): void` (preenche `byId` em `app.history[]` e `db.evals[]` casando `by` com `db.users[].name`; sem correspondência → `byId: null`). Registros novos de `history` e `evals` incluem `byId: u.id`.

- [ ] **Passo 1 (testes):**
  - `test_move_app_records_actor_id`: logar como `recrutador@vinculo.demo`, chamar `__metas.moveApp(appId,'triagem')` para uma candidatura em `novo`; assert último item de `history` tem `byId == 'u_rec1'` e `by == 'Camila Duarte'`.
  - `test_legacy_db_is_migrated`: gravar no `localStorage` um db sem `goals`/`goalSnaps`/`byId`, recarregar; assert `db.goals == []`, `db.goalSnaps == []`, e todo `history` com `by == 'Camila Duarte'` tem `byId == 'u_rec1'`; `page.errors == []`.
- [ ] **Passo 2:** rodar → FAIL (`__metas` indefinido).
- [ ] **Passo 3:** implementar `ensureGoalsDb` e `backfillActorIds`; chamá-los depois de `db = Persist.load()/seedDB()` (e dentro de `doReset` após `seedDB()`); acrescentar `byId` em `moveApp` e `forms.eval`; no fim do arquivo `if (window.__VINCULO_TEST__) window.__metas = { db: () => db, moveApp, ensureGoalsDb, backfillActorIds }` (as próximas tasks acrescentam suas funções a este objeto).
- [ ] **Passo 4:** rodar → PASS.
- [ ] **Passo 5:** commit `feat(metas): grava id nas ações e migra banco`.

### Task 3: Catálogo e motor de métricas

**Files:** Modify `vinculo/app.js` (bloco Metas); Test `tests/metas/test_02_metrics.py`

**Interfaces — Produces:**
`GOAL_METRICS: Record<id,{label:string,unit:string,dir:'up'|'down'}>` com ids exatos `hires, fill, resp, triaged, interviews, invites, evals, clientOk, stuck` (unidades: `''`, `'dias'`, `'dias'`, `''`, `''`, `''`, `''`, `'%'`, `'vagas'`; `fill, resp, stuck` são `down`).
`periodBounds(period:'day'|'week'|'month', ref?:Date): {start:Date,end:Date}` (end exclusivo, local).
`monthKey(d:Date|string): string` ('YYYY-MM').
`goalMetricValue(metric:string, userId:string, start:Date, end:Date): number|null` (`null` = dados insuficientes; reaproveitar `indMetrics`/`jobStats`/`inR` onde servirem).
`suggestTarget(metric:string, userId:string): {value:number, base:number|null}` — base = média por período dos últimos 90 dias; ↑ ×1,10 e ↓ ×0,90, arredondado a 1 casa (inteiro para contagens); sem base → `{value:0, base:null}`.

- [ ] **Passo 1 (testes, db controlado via `__metas.db()`):** montar no teste 2 vagas de `u_rec1` e 1 de `u_rec2`, candidaturas e `history` com `byId` conhecidos, depois:
  - `test_hires_counts_by_job_owner`: `goalMetricValue('hires','u_rec1',A,B) == 2` e `'u_rec2' == 0` (contratação em vaga de outra não conta).
  - `test_triaged_counts_by_actor`: movimentos para `triagem` com `byId='u_rec1'` em vaga de `u_rec2` contam para `u_rec1` (3) e não para `u_rec2` (0).
  - `test_fill_and_resp_in_days`: `fill == 10`, `resp == 1.5` para os dados montados.
  - `test_client_ok_needs_five_cases`: 4 decisões → `null`; 5 decisões (4 aprovadas) → `80`.
  - `test_stuck_counts_open_jobs_idle_7d`: 1 vaga aberta sem movimento há 8 dias → `1`.
  - `test_user_without_jobs_is_zero_not_nan`: recrutadora sem vagas: `hires == 0`, `fill is None`, nenhum `NaN`.
  - `test_period_bounds_local`: `periodBounds('week', 2026-11-05)` → início `2026-11-02 00:00`, fim `2026-11-09 00:00`; `month` → `2026-11-01` a `2026-12-01`; `day` com duração 24 h.
  - `test_suggest_target`: base 10/mês em `hires` → `{value:11, base:10}`; base 10 em `fill` → `{value:9, base:10}`.
- [ ] **Passo 2:** rodar → FAIL.
- [ ] **Passo 3:** implementar as quatro funções e o catálogo; expor no `__metas`.
- [ ] **Passo 4:** rodar → PASS. **Passo 5:** commit `feat(metas): catálogo e motor de métricas`.

### Task 4: Situação das metas

**Files:** Modify `vinculo/app.js`; Test `tests/metas/test_03_status.py`

**Interfaces — Consumes:** Task 3. **Produces:** `goalProgress(goal, now?:Date): {value:number|null, pct:number|null, expectedPct:number, status:'hit'|'ontrack'|'late'|'missed'|'within'|'out'|'nodata', daysLeft:number}` e `GOAL_STATUS_LABEL: Record<status,string>` com os textos "Atingida", "No ritmo", "Atrasada", "Não atingida", "Dentro da meta", "Fora da meta", "Dados insuficientes".

Regras: `value` = `goal.manual` quando `goal.metric` é nulo, senão `goalMetricValue`. ↑: `pct = value/target*100`; `hit` se `pct ≥ 100`; período encerrado sem atingir → `missed`; `expectedPct` = fração do período decorrida ×100; `ontrack` se `pct ≥ expectedPct − 10`, senão `late`. ↓: `within` se `value ≤ target`, senão `out`. `value == null` → `nodata`. Alvo 0 em ↑ não existe (bloqueado na Task 5); proteger divisão por zero retornando `pct: null`.

- [ ] **Passo 1 (testes):** `test_hit`, `test_ontrack` (meta 10, valor 5 a 50% do mês → `ontrack`; valor 4 a 50% → `late`), `test_missed` (período encerrado, valor 7/10), `test_down_within_out` (`stuck` alvo 0: valor 0 → `within`, valor 2 → `out`), `test_manual_goal_uses_manual_value`, `test_nodata_when_metric_null`, `test_zero_length_period_no_nan` (`start == end` → `expectedPct == 100`, sem `NaN`), `test_last_day_2359_still_open` (agora = 23:59 do último dia → `daysLeft == 0` e status ainda não `missed` se `pct < 100` for `late`).
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(metas): situação das metas`.

### Task 5: Acesso, CRUD e dados de demonstração

**Files:** Modify `vinculo/app.js` (bloco Metas; `seedDB` para metas demo); Test `tests/metas/test_04_access.py`

**Interfaces — Consumes:** Tasks 3-4. **Produces:**
`goalsFor(u:User): Goal[]` — **único** ponto de leitura: recrutadora → `userId === u.id` (atribuídas e pessoais); administrador → `origin === 'admin'`; qualquer outro papel → `[]`.
`saveGoal(u:User, data:Partial<Goal>): {ok:true,goal:Goal}|{ok:false,error:string}` — admin cria `origin:'admin'` para `data.userId` recrutadora ativa; recrutadora cria `origin:'self'` só para si; edição só do que `goalsFor` devolve e de `origin` compatível com o papel.
`removeGoal(u:User, id:string): {ok:boolean,error?:string}`; `bumpGoal(u:User, id:string, delta:number): {ok:boolean}` (só metas `manual`, valor mínimo 0, só `origin:'self'` da própria).
`copyMonthGoals(admin:User, fromMonth:string, toMonth:string): number` (devolve quantas copiou; ignora recrutadoras inativas e metas já existentes no destino).

Validações de `saveGoal`: alvo numérico > 0 (para `up`) ou ≥ 0 (para `down`); `period` ∈ day/week/month; admin só `month`; meta com `metric` repetida para mesma `userId`+período vigente → erro "Já existe uma meta igual neste período."; meta sem `metric` exige `title`.
Demo em `seedDB`: metas do mês atual para `u_rec1` (`hires` 2, `triaged` 40, `stuck` 0) e `u_rec2` (`hires` 1, `resp` 2, `clientOk` 70), `origin:'admin'`; uma meta pessoal livre para cada.

- [ ] **Passo 1 (testes):**
  - `test_rec_sees_only_own`: logar como `u_rec1`; `goalsFor(u_rec1).every(g => g.userId==='u_rec1')` e nenhuma tem `userId==='u_rec2'`.
  - `test_admin_never_sees_personal`: `goalsFor(admin).every(g => g.origin==='admin')`.
  - `test_client_and_candidate_get_nothing`: `goalsFor(cliente) == []`, `goalsFor(candidato) == []`.
  - `test_rec_cannot_edit_or_delete_others_or_admin_goals`: `removeGoal(u_rec1, idDeU_rec2).ok == false`; `removeGoal(u_rec1, idAdminDaPropriaU_rec1).ok == false`.
  - `test_admin_cannot_edit_personal`: `removeGoal(admin, idPessoal).ok == false`.
  - `test_validation`: alvo `0` em `hires` → erro; alvo `-1` → erro; duplicata → "Já existe uma meta igual neste período."; chamada dupla imediata de `saveGoal` com os mesmos dados cria só 1 meta.
  - `test_copy_month`: copia 3 metas de 2026-10 para 2026-11; segunda chamada devolve `0`; recrutadora inativa não recebe.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar e semear. **Passo 4:** PASS. **Passo 5:** commit `feat(metas): acesso restrito, CRUD e demo`.

### Task 6: Menu, rota e tela da recrutadora (somente leitura)

**Files:** Modify `vinculo/app.js` (`shell` → grupo "Análise" ~l.481; `route` caso `'s'` ~l.1500; nova `metasView()`), `vinculo/app.css`; Test `tests/metas/test_05_recruiter_view.py`

**Interfaces — Consumes:** Tasks 3-5. **Produces:** rota `#/s/metas` → `metasView()`; `metasView()` decide pela sessão (`recruiter` → `metasRecruiter()`, `admin` → `metasAdmin()` na Task 8); nunca lê parâmetro de usuário da URL. Item de menu `nl('/s/metas', 'kanban'|'trend'…, 'Metas', lateCount)` para staff. Abas via `ui.metaTab` ∈ `'acomp'|'atrib'|'pess'`.

- [ ] **Passo 1 (testes):**
  - `test_menu_item_visible_for_staff_only`: `Metas` no menu de `u_rec1` e admin; ausente para cliente e candidato; cliente e candidato abrindo `#/s/metas` veem "Acesso restrito".
  - `test_recruiter_acomp_shows_own_goals_with_progress`: `u_rec1` vê 3 barras atribuídas + a pessoal; nenhuma menção a "Rafael" nem às metas de `u_rec2` (`'Rafael' not in page.inner_text('main')`).
  - `test_url_param_ignored`: `goto('#/s/metas?user=u_rec2')` e `goto('#/s/metas/u_rec2')` mostram o mesmo conteúdo que `#/s/metas`.
  - `test_attention_block_lists_late_goals`: com uma meta forçada em atraso, o bloco "Precisa de atenção" lista o título dela; sem atrasos, mostra "Tudo em dia".
  - `test_tab_assigned_is_read_only`: na aba Atribuídas não existem botões editar/apagar.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar o item de menu, a rota e `metasRecruiter()` com abas Acompanhamento e Atribuídas (aba Pessoais mostra só a lista, ainda sem criar); CSS `.gl-*` com tokens existentes, claro/escuro. **Passo 4:** PASS. **Passo 5:** commit `feat(metas): tela da recrutadora`.

### Task 7: Metas pessoais (criar, editar, apagar, contador)

**Files:** Modify `vinculo/app.js` (`actions`: `goalNew`, `goalEdit`, `goalDel`, `goalBump`; `forms.goalSelf`), `vinculo/app.css`; Test `tests/metas/test_06_personal.py`

**Interfaces — Consumes:** `saveGoal`, `removeGoal`, `bumpGoal`. **Produces:** modal "Nova meta pessoal" com campos título, período (Diária/Semanal/Mensal), métrica (opcional, do catálogo) e alvo.

- [ ] **Passo 1 (testes):**
  - `test_create_personal_manual_goal`: preencher "Ligar para 5 candidatos", período Diária, alvo 5; aparece na aba Pessoais com `0/5`; `+1` três vezes → `3/5`; `-1` nunca abaixo de 0.
  - `test_create_personal_metric_goal`: escolher "Candidatos triados" semanal alvo 20; progresso vem do sistema (sem botões +1/-1).
  - `test_invalid_target_blocked`: alvo vazio ou 0 → mensagem de erro e nenhuma meta criada.
  - `test_double_submit_creates_one`: duplo clique em Salvar → 1 meta.
  - `test_edit_and_delete_personal`: editar alvo para 8; apagar com confirmação; some da lista.
  - `test_admin_does_not_see_personal_goal_text`: após criar como `u_rec1`, logar como admin; `'Ligar para 5 candidatos' not in` HTML de `#/s/metas`.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar usando os padrões `openModal`, `validate`, `toast` e `forms` existentes. **Passo 4:** PASS. **Passo 5:** commit `feat(metas): metas pessoais`.

### Task 8: Tela do administrador

**Files:** Modify `vinculo/app.js` (`metasAdmin()`, `actions.goalAssign`, `actions.goalCopy`, `forms.goalAdmin`), `vinculo/app.css`; Test `tests/metas/test_07_admin.py`

**Interfaces — Consumes:** `saveGoal`, `copyMonthGoals`, `suggestTarget`, `goalProgress`.

- [ ] **Passo 1 (testes):**
  - `test_team_table_one_row_per_active_recruiter`: linhas para Camila e Rafael com andamento (ex.: "3 de 4 no ritmo"); recrutadora inativa não aparece.
  - `test_assign_with_suggestion`: abrir "Atribuir meta", escolher `hires` e Camila; campo alvo já preenchido com a sugestão e a base "média dos últimos 90 dias: X" visível; salvar cria meta `origin:'admin'` do mês atual; `u_rec1` recebe notificação "Nova meta atribuída".
  - `test_assign_to_many`: duas recrutadoras selecionadas → duas metas.
  - `test_copy_previous_month`: botão copia e informa "N metas copiadas"; segundo clique informa "Nenhuma meta nova para copiar".
  - `test_admin_view_has_no_personal_goals`: nenhuma meta `origin:'self'` renderizada.
  - `test_recruiter_cannot_open_admin_actions`: como `u_rec1`, chamar `actions.goalAssign` via `__metas` devolve erro (sem criar nada).
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(metas): tela do administrador`.

### Task 9: Alertas

**Files:** Modify `vinculo/app.js` (`dashboard()` ~l.976, `shell` selo do item Metas, `notify` na atribuição já coberto), `vinculo/app.css`; Test `tests/metas/test_08_alerts.py`

**Interfaces — Produces:** `lateGoalsFor(u:User): Goal[]` — metas de `goalsFor(u)` do período vigente com `status` ∈ `late|out`; só recrutadora (administrador → `[]`).

- [ ] **Passo 1 (testes):** `test_badge_counts_late_goals` (selo no menu = nº de atrasadas; some quando zera); `test_dashboard_banner` (faixa "2 metas atrasadas" com link `#/s/metas`; ausente sem atrasos e ausente para administrador); `test_no_alert_for_other_recruiter` (atrasos de `u_rec2` nunca contam para `u_rec1`).
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar. **Passo 4:** PASS. **Passo 5:** commit `feat(metas): alertas`.

### Task 10: Fotos mensais e histórico em Indicadores

**Files:** Modify `vinculo/app.js` (`IND_SUBS`, `indicadoresView` ramo `'metas'`, `closeMonths`, `goalHistory`, seed de fotos, inicialização), `vinculo/app.css`; Test `tests/metas/test_08_history.py`

**Interfaces — Produces:** `closeMonths(now?:Date): number` (cria `goalSnaps` para metas mensais de meses encerrados sem foto; idempotente por `goalId`+`month`; devolve quantas criou); `goalHistory(u:User, months?:number): Array<{month:string,total:number,hit:number,pct:number|null,byMetric:Record<string,{target:number,result:number|null,hit:boolean}>}>` — recrutadora: só as dela (atribuídas e pessoais mensais); administrador: todas, só `origin:'admin'`. Nova entrada `['metas','Metas (histórico)','Resultado das metas mês a mês.']` em `IND_SUBS`; a página mostra últimos 12 meses ("Sem metas" nos vazios).

- [ ] **Passo 1 (testes):**
  - `test_close_months_idempotent`: com meta de 2026-10 e `now` em 2026-11-05: `closeMonths()` devolve `1`, a segunda chamada `0`, e recarregar a página não duplica.
  - `test_seed_has_three_prior_months`: histórico de `u_rec1` tem 3 meses anteriores com dados.
  - `test_recruiter_history_is_private`: `goalHistory(u_rec1)` não contém metas de `u_rec2`; a página `#/s/indicadores/metas` como `u_rec1` não contém "Rafael".
  - `test_admin_history_assigned_only`: administrador vê as duas recrutadoras e nenhuma meta `self`.
  - `test_snapshot_has_only_numbers`: nenhum campo de `goalSnaps` contém nome de candidato.
  - `test_deleted_recruiter_does_not_break`: usuário com `name:'Removido'` e `active:false` com fotos → página renderiza sem erro e sem a linha.
  - `test_menu_lists_metas_subpage`: submenu de Indicadores mostra "Metas (histórico)" para staff; cliente/candidato barrados.
- [ ] **Passo 2:** FAIL. **Passo 3:** implementar; chamar `closeMonths()` após `ensureGoalsDb()` na inicialização. **Passo 4:** PASS. **Passo 5:** commit `feat(metas): fotos mensais e histórico`.

### Task 11: Permissões ponta a ponta, regressão e validação visual

**Files:** Create `tests/metas/test_09_regression.py`; screenshots em `/tmp`-equivalente do scratchpad.

- [ ] **Passo 1 (testes):**
  - `test_permission_matrix`: para cada papel (admin, `u_rec1`, `u_rec2`, cliente, candidato) e cada rota `#/s/metas`, `#/s/metas?user=u_rec2`, `#/s/indicadores/metas`: o HTML nunca contém título de meta de outra recrutadora; cliente e candidato veem "Acesso restrito".
  - `test_no_page_errors_all_staff_routes`: percorrer `dashboard, vagas, kanban, triagem, banco, solicitacoes, indicadores/geral, ia, relatorios, comunicacoes, notificacoes, metas, indicadores/metas` como `u_rec1` e como admin; `page.errors == []`.
  - `test_other_panels_untouched`: logar como cliente e candidato; `#/e/painel` e `#/c/candidaturas` abrem, sem item "Metas" e sem classe `gl-` no HTML.
  - `test_theme_light_dark_metas`: alternar tema nas duas páginas novas sem erro; texto legível (contraste ≥ 4,5:1 medido por script nos títulos e rótulos).
  - `test_public_pages_unchanged`: `#/`, `#/vagas`, `#/entrar` abrem com `body.lp`.
- [ ] **Passo 2:** `python3 -m pytest tests/metas -v` → tudo PASS. **Passo 3:** capturas (claro, escuro, 390 px) de Metas (recrutadora e administrador) e Indicadores → Metas; revisar a olho. **Passo 4:** commit `test(metas): regressão e permissões`.

### Task 12: Entrega

- [ ] **Passo 1:** conferir backup em `/mnt/user-data/outputs/vinculo-BACKUP-antes-metas/`.
- [ ] **Passo 2:** gerar `/mnt/user-data/outputs/vinculo-metas/` com `app.js`, `app.css`, `alteracoes.diff` (contra o backup) e a versão Lovable de `app.js` (trocar `src="vinculo/img/` e `"vinculo/img/` por `/vinculo/img/`); atualizar `vinculo-github-pages.zip`.
- [ ] **Passo 3:** `git push origin metas-recrutadoras`; informar o link do pull request e aguardar "pode misturar".
