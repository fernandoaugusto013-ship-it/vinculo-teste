VALID_CNPJ = '11.222.333/0001-81'

def adm(app, uid='u_admin'):
    return f"__V.db.users.find(x => x.id === '{uid}')"

def test_legacy_db_migrated(app):
    app.login('u_admin')
    app.ev("() => { const d = JSON.parse(localStorage.getItem('vinculo_mvp_v1')); delete d.payParams; delete d.opps; delete d.payAdjust; delete d.payClosings; localStorage.setItem('vinculo_mvp_v1', JSON.stringify(d)); }")
    app.page.reload(); app.page.wait_for_selector('#app > *')
    r = app.ev("() => ({ m: __V.fin.payParams().metaBase, h: __V.db.payParams.history, o: __V.db.opps, a: __V.db.payAdjust, c: __V.db.payClosings })")
    assert r == {'m': 4200, 'h': [], 'o': [], 'a': [], 'c': []} and app.errors == []

def test_admin_changes_param_with_history(app):
    app.login('u_admin')
    r = app.ev(f"() => __V.fin.savePayParams({adm(app)}, {{ metaBase: 5000 }})")
    assert r['ok'] is True and app.ev("() => __V.fin.payParams().metaBase") == 5000
    h = app.ev("() => __V.db.payParams.history")
    assert len(h) == 1 and h[0]['key'] == 'metaBase' and h[0]['from'] == 4200 and h[0]['to'] == 5000 and h[0]['by']

def test_invalid_values_rejected(app):
    app.login('u_admin')
    for patch in [{'impostos': 1.5}, {'impostos': 'abc'}, {'metaBase': -1}, {'das': None}, {'despesas': ''}]:
        r = app.ev(f"p => __V.fin.savePayParams({adm(app)}, p)", patch)
        assert r['ok'] is False and r['errors'], patch
    assert app.ev("() => __V.fin.payParams().impostos") == 0.1 and app.ev("() => __V.db.payParams.history.length") == 0

def test_recruiter_cannot_save_or_open(app):
    app.login('u_rec1')
    assert app.ev(f"() => __V.fin.savePayParams({adm(app, 'u_rec1')}, {{ metaBase: 1 }})")['ok'] is False
    assert app.ev("() => __V.fin.payParams().metaBase") == 4200
    app.go('#/s/comissoes/parametros'); assert 'Acesso restrito' in app.main()

def test_menu_items(app):
    app.login('u_admin'); app.go('#/s/dashboard')
    assert app.page.locator('.side a.nl[href="#/s/comissoes"]').inner_text().strip().startswith('Comissões')
    app.login('u_rec1'); app.go('#/s/dashboard')
    assert 'Minhas comissões' in app.page.locator('.side a.nl[href="#/s/comissoes"]').inner_text()
    for role in ['client', 'candidate']:
        uid = app.ev("r => __V.db.users.find(x => x.role === r).id", role); app.login(uid); app.go('#/s/comissoes')
        assert 'Acesso restrito' in app.main()

def test_table_editable(app):
    app.login('u_admin')
    t = app.ev("() => { const t = JSON.parse(JSON.stringify(__V.fin.payParams().tabelas)); t.geral[0].ate = 12; return t; }")
    assert app.ev(f"t => __V.fin.savePayParams({adm(app)}, {{ tabelas: t }})", t)['ok'] is True
    assert app.ev("() => Comissoes.faixa('geral', 12, __V.fin.payParams()).pct") == 0.2
    bad = app.ev("() => { const t = JSON.parse(JSON.stringify(__V.fin.payParams().tabelas)); t.geral[1].ate = 5; return t; }")
    assert app.ev(f"t => __V.fin.savePayParams({adm(app)}, {{ tabelas: t }})", bad)['ok'] is False

def test_params_screen_edit_via_ui(app):
    app.login('u_admin'); app.go('#/s/comissoes/parametros')
    assert 'Ambiente de teste' in app.main()
    app.page.click('[data-act="paramEdit"]'); app.page.wait_for_timeout(150)
    app.page.fill('[name=metaBase]', '5000'); app.page.fill('[name=impostos]', '12')
    app.page.click('form[data-form="payParams"] button.pri'); app.page.wait_for_timeout(300)
    p = app.ev("() => __V.fin.payParams()")
    assert p['metaBase'] == 5000 and abs(p['impostos'] - 0.12) < 1e-9
    assert app.page.locator('.fin-hist tbody tr').count() == 2
    app.page.click('[data-act="paramEdit"]'); app.page.wait_for_timeout(150)
    app.page.fill('[name=impostos]', '150'); app.page.click('form[data-form="payParams"] button.pri'); app.page.wait_for_timeout(300)
    assert abs(app.ev("() => __V.fin.payParams().impostos") - 0.12) < 1e-9 and app.errors == []

def test_recruiter_start_date_required(app):
    app.login('u_admin'); app.go('#/s/usuarios')
    app.page.click('[data-act="userMenu"]')
    app.page.fill('#modal-root [name=name]', 'Nova MEI'); app.page.fill('#modal-root [name=email]', 'nova@mei.test'); app.page.fill('#modal-root [name=doc]', VALID_CNPJ)
    app.page.click('#modal-root button.pri'); app.page.wait_for_timeout(250)
    assert app.ev("() => __V.db.users.some(x => x.email === 'nova@mei.test')") is False
    app.page.fill('#modal-root [name=startDate]', '2026-12-10'); app.page.click('#modal-root button.pri'); app.page.wait_for_timeout(250)
    u = app.ev("() => __V.db.users.find(x => x.email === 'nova@mei.test')")
    assert u['startDate'] == '2026-12-10' and u['doc'] == '11222333000181'

def test_seed_recruiters_have_start_date(app):
    app.login('u_admin')
    assert app.ev("() => __V.db.users.filter(x => x.role === 'recruiter' && !x.startDate).length") == 0
