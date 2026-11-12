ADM = "__V.db.users.find(x => x.id === 'u_admin')"
def load(app, m=None):
    return app.ev(f"(m) => __V.fin.loadPolicyCases({ADM}, m || __V.metas.monthKey(new Date()))", m)
def soma(ex, t): return round(sum(l['valor'] for l in ex['linhas'] if l['tipo'] == t), 2)

def test_three_cases_totals(app):
    app.login('u_admin'); r = load(app); assert r['ok'] and len(r['users']) == 3
    m = app.ev("() => __V.metas.monthKey(new Date())")
    exs = [app.ev(f"([m, id]) => __V.fin.payStatement({ADM}, m, id)", [m, i]) for i in r['users']]
    assert [e['total'] for e in exs] == [2827.25, 3979.05, 863.25]
    assert [soma(e, 'comissao') for e in exs] == [741.2, 1631.2, 277.2]
    assert soma(exs[1], 'originacao') == 261.8 and exs[0]['valorBase'] == 1500 and exs[2]['valorBase'] == 0

def test_other_month_param(app):
    app.login('u_admin'); r = load(app, '2026-08')
    assert app.ev(f"([id]) => __V.fin.payStatement({ADM}, '2026-08', id).total", [r['users'][2]]) == 863.25

def test_idempotent_and_remove(app):
    app.login('u_admin')
    before = app.ev("() => [__V.db.users.length, __V.db.jobs.length, __V.db.notifs ? __V.db.notifs.length : 0]")
    a = load(app); b = load(app); assert a['users'] == b['users']
    assert app.ev("() => __V.db.payDemo.users.length") == 3
    nj = app.ev("() => __V.db.payDemo.jobs.length"); assert nj == app.ev("() => new Set(__V.db.payDemo.jobs.map(j => j.id)).size")
    assert app.ev("() => [__V.db.users.length, __V.db.jobs.length, __V.db.notifs ? __V.db.notifs.length : 0]") == before
    assert app.ev(f"() => __V.fin.removePolicyCases({ADM}).ok") is True
    assert app.ev("() => __V.db.payDemo.users.length + __V.db.payDemo.jobs.length") == 0
    assert app.ev("() => [__V.db.users.length, __V.db.jobs.length, __V.db.notifs ? __V.db.notifs.length : 0]") == before

def test_recruiter_cannot_load(app):
    app.login('u_rec1')
    assert app.ev("() => __V.fin.loadPolicyCases(__V.db.users.find(x => x.id === 'u_rec1'), '2026-11').ok") is False
    assert app.ev("() => __V.fin.removePolicyCases(__V.db.users.find(x => x.id === 'u_rec1')).ok") is False
    assert app.ev("() => (__V.db.payDemo.users || []).length") == 0

def test_ui_button_and_not_elsewhere(app):
    app.login('u_admin'); app.go('#/s/comissoes')
    app.page.click('[data-act="polLoad"]'); app.page.wait_for_timeout(300)
    assert 'Caso 1 — meta atingida' in app.main()
    app.go('#/s/comissoes/extratos')
    names = app.page.eval_on_selector_all('[name=payUser] option', 'els => els.map(e => e.textContent)')
    assert any('Caso 2 — crescimento' in n for n in names)
    app.page.select_option('[name=payUser]', label=[n for n in names if 'Caso 2' in n][0]); app.page.wait_for_timeout(200)
    t = app.main(); assert 'R$ 3.979,05' in t and 'Originação' in t
    for h in ['#/s/metas', '#/s/vagas', '#/s/usuarios', '#/s/kanban']:
        app.go(h); app.page.wait_for_timeout(150); assert 'Caso 1 — meta atingida' not in app.main(), h
    app.go('#/s/comissoes'); app.page.click('[data-act="polRemove"]'); app.page.wait_for_timeout(300)
    assert app.ev("() => __V.db.payDemo.users.length") == 0
    assert app.errors == []
