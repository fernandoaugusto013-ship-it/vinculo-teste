ADM = "__V.db.users.find(x => x.id === 'u_admin')"
FIN = {'tipo': 'geral', 'valor': 1320, 'gupy': False, 'alinhamento': '2026-11-01', 'aprovacao': None, 'diasSuspensos': 0, 'admissao': None,
       'status': 'aberta', 'garantia': None, 'fatura': {'emissao': None, 'status': 'aberta', 'recebimento': None},
       'parts': [{'userId': 'u_rec1', 'pct': 100}], 'originadaPor': None, 'origTipo': None, 'contratoInicio': None}
def save(app, jid, patch=None):
    d = dict(FIN); d.update(patch or {})
    return app.ev(f"([j, d]) => __V.fin.saveJobFin({ADM}, j, d)", [jid, d])
def tabs(app): return [t.strip() for t in app.page.eval_on_selector_all('.fin-tabs a', 'els => els.map(e => e.textContent)')]

def test_tab_order_and_default(app):
    app.login('u_admin'); app.go('#/s/comissoes')
    assert tabs(app) == ['Vagas sem financeiro', 'Vagas com financeiro', 'Oportunidades', 'Extratos', 'Parâmetros']
    assert app.page.locator('#fin-pend').count() == 1
    for h in ['#/s/comissoes', '#/s/comissoes/com', '#/s/comissoes/oportunidades', '#/s/comissoes/extratos']:
        app.go(h); app.page.wait_for_timeout(120)
        assert app.page.locator('form[data-form="payParams"]').count() == 0, h
    app.go('#/s/comissoes/extratos'); assert app.page.locator('[data-act="polLoad"]').count() == 1
    app.go('#/s/comissoes/parametros'); assert app.page.locator('[data-act="polLoad"]').count() == 0 and app.page.locator('#fin-pend').count() == 0
    assert app.errors == []

def test_job_moves_between_lists(app):
    app.login('u_admin'); jid = app.ev("() => __V.db.jobs.find(j => j.status !== 'draft').id")
    app.go('#/s/comissoes'); assert app.page.locator(f'#fin-pend a[href="#/s/vaga/{jid}/financeiro"]').count() == 1
    assert save(app, jid)['ok'] is True
    app.ev('() => __V.render()'); app.page.wait_for_timeout(120)
    assert app.page.locator(f'#fin-pend a[href="#/s/vaga/{jid}/financeiro"]').count() == 0
    app.go('#/s/comissoes/com'); row = app.page.locator(f'#fin-com tr[data-id="{jid}"]')
    assert row.count() == 1 and 'Aguardando aprovação' in row.inner_text() and 'R$ 1.320,00' in row.inner_text()
    assert row.locator(f'a[href="#/s/vaga/{jid}/financeiro"]').inner_text().strip() == 'Editar'
    assert app.ev(f"([j]) => __V.fin.removeJobFin({ADM}, j).ok", [jid]) is True
    app.ev('() => __V.render()'); app.page.wait_for_timeout(120)
    assert app.page.locator(f'#fin-com tr[data-id="{jid}"]').count() == 0
    app.go('#/s/comissoes'); assert app.page.locator(f'#fin-pend a[href="#/s/vaga/{jid}/financeiro"]').count() == 1

def test_situations_and_filter(app):
    app.login('u_admin'); js = app.ev("() => __V.db.jobs.filter(j => j.status !== 'draft').slice(0, 3).map(j => j.id)")
    save(app, js[0])
    save(app, js[1], {'aprovacao': '2026-11-09', 'status': 'fechada', 'admissao': '2026-12-01'})
    save(app, js[2], {'aprovacao': '2026-11-09', 'status': 'fechada', 'admissao': '2026-12-01', 'fatura': {'emissao': '2026-12-02', 'status': 'recebida', 'recebimento': '2026-12-05'}})
    app.go('#/s/comissoes/com'); t = app.page.inner_text('#fin-com')
    assert 'Aguardando aprovação' in t and 'Aguardando fatura' in t and 'Entra no extrato de dez/2026' in t
    app.page.select_option('[name=finSit]', 'fatura'); app.page.wait_for_timeout(150)
    assert app.page.locator('#fin-com tbody tr[data-id]').count() == 1 and 'Aguardando fatura' in app.page.inner_text('#fin-com')

def test_remove_rules(app):
    app.login('u_admin'); jid = app.ev("() => __V.db.jobs[0].id")
    save(app, jid, {'aprovacao': '2026-11-09', 'status': 'fechada', 'admissao': '2026-12-01', 'fatura': {'emissao': '2026-12-02', 'status': 'recebida', 'recebimento': '2026-12-05'}})
    assert app.ev("([j]) => __V.fin.removeJobFin(__V.db.users.find(x => x.id === 'u_rec1'), j).ok", [jid]) is False
    app.ev("() => __V.db.payClosings.push({ month: '2026-12', closedAt: '2027-01-02', closedBy: 'u_admin', statements: [] })")
    r = app.ev(f"([j]) => __V.fin.removeJobFin({ADM}, j)", [jid]); assert r['ok'] is False and r['error'] == 'Mês fechado'
    assert app.ev("() => !!__V.db.jobs[0].fin") is True

def test_remove_button_with_confirm(app):
    app.login('u_admin'); jid = app.ev("() => __V.db.jobs[0].id")
    app.go(f'#/s/vaga/{jid}/financeiro'); assert app.page.locator('[data-act="finRemove"]').count() == 0
    save(app, jid); app.ev('() => __V.render()'); app.page.wait_for_timeout(150)
    app.page.click('[data-act="finRemove"]'); app.page.wait_for_timeout(150)
    assert app.ev("() => !!__V.db.jobs[0].fin") is True
    app.page.click('#modal-root [data-act="finRemoveDo"]'); app.page.wait_for_timeout(250)
    assert app.ev("() => __V.db.jobs[0].fin || null") is None and app.errors == []

def test_params_locked_until_edit(app):
    app.login('u_admin'); app.go('#/s/comissoes/parametros')
    assert app.page.locator('[name=metaBase]').is_disabled() and app.page.locator('form[data-form="payParams"] button[type=submit]').count() == 0
    app.page.click('[data-act="paramEdit"]'); app.page.wait_for_timeout(120)
    assert app.page.locator('[name=metaBase]').is_enabled()
    app.page.fill('[name=metaBase]', '9999'); app.page.click('[data-act="paramCancel"]'); app.page.wait_for_timeout(120)
    assert app.page.locator('[name=metaBase]').is_disabled() and app.ev("() => __V.fin.payParams().metaBase") == 4200
    app.go('#/s/comissoes'); app.go('#/s/comissoes/parametros'); assert app.page.locator('[name=metaBase]').is_disabled()

def test_recruiter_no_tabs(app):
    app.login('u_rec1')
    for h in ['#/s/comissoes', '#/s/comissoes/com', '#/s/comissoes/parametros']:
        app.go(h); app.page.wait_for_timeout(120); assert app.page.locator('.fin-tabs').count() == 0, h
    app.go('#/s/comissoes/com'); assert 'Minhas comissões' in app.main() or 'Acesso restrito' in app.main()
