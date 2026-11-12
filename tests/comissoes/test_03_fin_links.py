FIN = {'tipo': 'geral', 'valor': 1320, 'gupy': False, 'alinhamento': '2026-11-01', 'aprovacao': None, 'diasSuspensos': 0, 'admissao': None,
       'status': 'aberta', 'garantia': None, 'fatura': {'emissao': None, 'status': 'aberta', 'recebimento': None},
       'parts': [{'userId': 'u_rec1', 'pct': 100}], 'originadaPor': None, 'origTipo': None, 'contratoInicio': None}

def test_admin_job_list_has_fin_button_and_status(app):
    app.login('u_admin'); app.go('#/s/vagas')
    n = app.ev("() => __V.db.jobs.length")
    assert app.page.locator('#ja-res a[href$="/financeiro"]').count() == n
    assert app.page.locator('#ja-res a[title="Financeiro pendente"]').count() == n
    jid = app.ev("() => __V.db.jobs[0].id")
    assert app.ev("([j, d]) => __V.fin.saveJobFin(__V.db.users.find(x => x.id === 'u_admin'), j, d).ok", [jid, FIN]) is True
    app.ev('() => __V.render()'); app.page.wait_for_timeout(150)
    row = app.page.locator(f'#ja-res a[href="#/s/vaga/{jid}/financeiro"]')
    assert row.get_attribute('title') == 'Financeiro preenchido' and 'preenchido' in row.inner_text()
    row.click(); app.page.wait_for_timeout(200); assert 'Financeiro —' in app.main()
    assert app.errors == []

def test_recruiter_job_list_has_no_fin(app):
    app.login('u_rec1'); app.go('#/s/vagas')
    assert app.page.locator('a[href$="/financeiro"]').count() == 0 and 'Financeiro pendente' not in app.main()

def test_comissoes_lists_pending_jobs(app):
    app.login('u_admin'); app.go('#/s/comissoes')
    pend = app.ev("() => __V.db.jobs.filter(j => j.status !== 'draft' && !j.fin).length")
    assert pend > 0 and 'Vagas sem financeiro' in app.main()
    assert app.page.locator('#fin-pend a[href$="/financeiro"]').count() == pend
    jid = app.ev("() => __V.db.jobs.find(j => j.status !== 'draft').id")
    app.ev("([j, d]) => __V.fin.saveJobFin(__V.db.users.find(x => x.id === 'u_admin'), j, d)", [jid, FIN])
    app.ev('() => __V.render()'); app.page.wait_for_timeout(150)
    assert app.page.locator('#fin-pend a[href$="/financeiro"]').count() == pend - 1
    assert 'Salvar parâmetros' in app.main()
    assert app.errors == []
