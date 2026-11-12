BASE = {'tipo': 'geral', 'valor': 1320, 'gupy': False, 'alinhamento': '2026-11-01', 'aprovacao': '2026-11-11', 'diasSuspensos': 0, 'admissao': '2026-12-10',
        'status': 'fechada', 'garantia': 30, 'fatura': {'emissao': '2026-12-05', 'status': 'recebida', 'recebimento': '2026-12-12'},
        'parts': [{'userId': 'u_rec1', 'pct': 100}], 'originadaPor': None, 'origTipo': None, 'contratoInicio': None}

def save(app, uid, patch=None, job=None):
    d = dict(BASE); d.update(patch or {})
    return app.ev("([uid, job, d]) => __V.fin.saveJobFin(__V.db.users.find(x => x.id === uid), job || __V.db.jobs[0].id, d)", [uid, job, d])

def test_admin_saves_all_fields(app):
    app.login('u_admin'); r = save(app, 'u_admin')
    assert r['ok'] is True
    f = app.ev("() => __V.db.jobs[0].fin")
    assert f['valor'] == 1320 and f['fatura']['status'] == 'recebida' and f['parts'] == [{'userId': 'u_rec1', 'pct': 100}] and f['garantia'] == 30

def test_recruiter_cannot_save_or_see_tab(app):
    app.login('u_rec1')
    assert save(app, 'u_rec1')['ok'] is False and app.ev("() => __V.db.jobs[0].fin || null") is None
    jid = app.ev("() => __V.db.jobs[0].id")
    app.go(f'#/s/vaga/{jid}'); assert app.page.locator('a[href$="/financeiro"]').count() == 0
    app.go(f'#/s/vaga/{jid}/financeiro'); assert 'Acesso restrito' in app.main()

def test_validations(app):
    app.login('u_admin')
    cases = [({'valor': 0}, 'valor'), ({'valor': 'abc'}, 'valor'), ({'tipo': 'x'}, 'tipo'),
      ({'parts': [{'userId': 'u_rec1', 'pct': 60}, {'userId': 'u_rec2', 'pct': 60}]}, '100'),
      ({'parts': [{'userId': 'u_rec1', 'pct': 100}, {'userId': 'u_rec1', 'pct': 0}]}, 'repet'),
      ({'parts': [{'userId': 'u_ghost', 'pct': 100}]}, 'recrutador'),
      ({'aprovacao': '2026-10-01'}, 'anterior'), ({'alinhamento': '2026-02-30'}, 'data'),
      ({'diasSuspensos': -1}, 'suspens'), ({'garantia': 45}, 'garantia'), ({'status': 'x'}, 'status'),
      ({'fatura': {'emissao': '2026-12-05', 'status': 'recebida', 'recebimento': None}}, 'recebimento'),
      ({'fatura': {'emissao': '2026-12-05', 'status': 'recebida', 'recebimento': '2026-12-01'}}, 'anterior'),
      ({'originadaPor': 'u_rec2', 'origTipo': None}, 'tipo de originação'),
      ({'originadaPor': 'u_rec2', 'origTipo': 'cliente_novo', 'contratoInicio': None}, 'contrato')]
    for patch, word in cases:
        r = save(app, 'u_admin', patch); assert r['ok'] is False, patch; assert word in ' '.join(r['errors']).lower(), (patch, r)
    assert app.ev("() => __V.db.jobs[0].fin || null") is None
    app.ev("() => { __V.db.users.find(x => x.id === 'u_rec2').active = false; }")
    assert save(app, 'u_admin', {'parts': [{'userId': 'u_rec2', 'pct': 100}]})['ok'] is False

def test_open_job_without_approval_is_valid(app):
    app.login('u_admin')
    r = save(app, 'u_admin', {'aprovacao': None, 'admissao': None, 'status': 'aberta', 'fatura': {'emissao': None, 'status': 'aberta', 'recebimento': None}})
    assert r['ok'] is True

def test_closed_month_blocks_edit(app):
    app.login('u_admin'); assert save(app, 'u_admin')['ok'] is True
    app.ev("() => { __V.db.payClosings.push({ month: '2026-12', closedAt: '2027-01-02', closedBy: 'u_admin', statements: [] }); }")
    r = save(app, 'u_admin', {'valor': 2000}); assert r['ok'] is False and r['error'] == 'Mês fechado'
    assert app.ev("() => __V.db.jobs[0].fin.valor") == 1320

def test_ui_form_preview_and_save(app):
    app.login('u_admin'); jid = app.ev("() => __V.db.jobs[0].id")
    app.go(f'#/s/vaga/{jid}'); app.page.click('a[href$="/financeiro"]'); app.page.wait_for_timeout(300)
    assert 'Ambiente de teste' in app.main()
    app.page.fill('[name=valor]', '1800'); app.page.check('[name=gupy]'); app.page.fill('[name=alinhamento]', '2026-11-01'); app.page.fill('[name=aprovacao]', '2026-11-09')
    app.page.click('[data-act="finPreview"]'); app.page.wait_for_timeout(250)
    t = app.page.inner_text('#fin-prev'); assert '1.160,00' in t and '8 dias' in t and '20%' in t and '232,00' in t
    app.page.select_option('[name=status]', 'fechada'); app.page.fill('[name=admissao]', '2026-12-10')
    app.page.click('form[data-form="jobFin"] button.pri'); app.page.wait_for_timeout(300)
    f = app.ev("() => __V.db.jobs.find(j => j.fin).fin"); assert f['valor'] == 1800 and f['gupy'] is True
    app.page.click('[data-act="finSplit"]') if app.page.locator('[data-act="finSplit"]').count() else None
    assert app.errors == []

def test_split_5050(app):
    app.login('u_admin'); jid = app.ev("() => __V.db.jobs[0].id"); app.go(f'#/s/vaga/{jid}/financeiro')
    app.page.select_option('[name=p2_user]', 'u_rec2'); app.page.click('[data-act="finSplit"]')
    assert app.page.input_value('[name=p1_pct]') == '50' and app.page.input_value('[name=p2_pct]') == '50'

def test_double_click_save(app):
    app.login('u_admin'); jid = app.ev("() => __V.db.jobs[0].id"); app.go(f'#/s/vaga/{jid}/financeiro')
    app.page.fill('[name=valor]', '1320'); app.page.fill('[name=alinhamento]', '2026-11-01')
    app.page.evaluate("() => { const f = document.querySelector('form[data-form=jobFin]'); f.requestSubmit(); f.requestSubmit(); }"); app.page.wait_for_timeout(300)
    assert app.ev("() => __V.db.jobs.filter(j => j.fin).length") == 1 and app.ev("() => __V.db.payParams.history.length") == 0
