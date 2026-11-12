import re
def setup(app, who='u_rec1'):
    m = app.ev("() => __V.metas.monthKey(new Date())")
    app.ev("""([m, who]) => { const j = __V.db.jobs[0];
      j.fin = { tipo: 'geral', valor: 1320, gupy: false, alinhamento: '2026-10-01', aprovacao: '2026-10-16', diasSuspensos: 0, admissao: m + '-02', status: 'fechada', garantia: null,
        fatura: { emissao: m + '-05', status: 'recebida', recebimento: m + '-12' }, parts: [{ userId: who, pct: 100 }], originadaPor: null, origTipo: null, contratoInicio: null }; }""", [m, who])
    return m

def pay_date(m):
    y, mo = map(int, m.split('-')); mo += 1
    if mo == 13: y, mo = y + 1, 1
    return f'15/{mo:02d}/{y}'

def test_recruiter_sees_own_statement(app):
    app.login('u_rec1'); m = setup(app); app.go('#/s/comissoes')
    t = app.main()
    for s in ['Ajuda de custo', 'R$ 500,00', 'DAS-MEI', 'R$ 86,05', 'Valor base', 'R$ 92,40', 'Ambiente de teste', 'Total a pagar em ' + pay_date(m), 'R$ 678,45']:
        assert s in t, s
    assert app.ev("() => __V.db.jobs[0].title") in t
    assert app.errors == []

def test_recruiter_cannot_read_others(app):
    app.login('u_rec1'); m = setup(app, 'u_rec2')
    ex = app.ev("(m) => __V.fin.payStatement(__V.db.users.find(x => x.id === 'u_rec1'), m, 'u_rec2')", m)
    assert ex['userId'] == 'u_rec1' and ex['linhas'] == [] and ex['total'] == 586.05
    for h in ['#/s/comissoes?user=u_rec2', '#/s/comissoes/u_rec2', '#/s/comissoes/extratos?user=u_rec2']:
        app.go(h); app.page.wait_for_timeout(150); assert 'R$ 92,40' not in app.main(), h

def test_admin_picks_recruiter_and_month(app):
    app.login('u_admin'); m = setup(app, 'u_rec2'); app.go('#/s/comissoes/extratos')
    opts = app.page.eval_on_selector_all('[name=payMonth] option', 'els => els.map(e => e.value)')
    assert len(opts) == 7 and opts[0] == m and all(re.fullmatch(r'\d{4}-\d{2}', o) for o in opts)
    app.page.select_option('[name=payUser]', 'u_rec1'); app.page.wait_for_timeout(150)
    assert 'R$ 92,40' not in app.main() and 'R$ 586,05' in app.main()
    app.page.select_option('[name=payUser]', 'u_rec2'); app.page.wait_for_timeout(150)
    assert 'R$ 92,40' in app.main() and 'R$ 678,45' in app.main()
    app.page.select_option('[name=payMonth]', opts[1]); app.page.wait_for_timeout(150)
    t = app.main(); assert 'R$ 678,45' not in t and 'Nenhuma comissão neste mês' in t and 'previstas para meses seguintes' in t
    assert app.ev("(m) => __V.fin.payStatement(__V.db.users.find(x => x.id === 'u_admin'), m, 'u_rec2').total", m) == 678.45
    assert app.errors == []

def test_client_and_candidate_denied(app):
    for uid in [app.ev("() => __V.db.users.find(u => u.role === 'client').id"), app.ev("() => __V.db.users.find(u => u.role === 'candidate').id")]:
        app.login(uid); app.go('#/s/comissoes'); app.page.wait_for_timeout(150)
        assert 'Acesso restrito' in app.main()
        assert app.ev("([u]) => __V.fin.payStatement(__V.db.users.find(x => x.id === u), '2026-11', 'u_rec1')", [uid]) is None

def test_job_without_fin_absent_and_empty_month(app):
    app.login('u_rec1'); app.go('#/s/comissoes'); t = app.main()
    assert 'R$ 586,05' in t and 'Nenhuma comissão neste mês' in t

def test_closed_month_uses_frozen(app):
    app.login('u_rec1'); m = setup(app)
    app.ev("(m) => __V.db.payClosings.push({ month: m, closedAt: m + '-28', closedBy: 'u_admin', statements: [{ userId: 'u_rec1', extrato: { month: m, pagamentoEm: '2099-01-15', ajudaCusto: 500, das: 86.05, valorBase: 0, meta: { meta: 4200, realizado: 0, pct: 0 }, linhas: [], previstas: [], total: 111.11 } }] })", m)
    assert app.ev("(m) => __V.fin.payStatement(__V.db.users.find(x => x.id === 'u_rec1'), m).total", m) == 111.11
    app.go('#/s/comissoes'); assert 'R$ 111,11' in app.main() and 'Mês fechado' in app.main()
