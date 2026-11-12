U = lambda i: f"__V.db.users.find(x => x.id === '{i}')"
def opp(app, who, data):
    return app.ev(f"(d) => __V.fin.saveOpp({U(who)}, d)", data)
def upd(app, who, oid, patch):
    return app.ev(f"([i, p]) => __V.fin.updateOpp({U(who)}, i, p)", [oid, patch])
def stmt(app, uid, m):
    return app.ev(f"(m) => __V.fin.payStatement({U('u_admin')}, m, '{uid}')", m)
BASE = {'empresa': 'Açaí & Cia. LTDA ', 'contato': 'Ana — (11) 9999-0000', 'tipo': 'outro', 'servico': 'palestra'}

def test_empresa_key(app):
    k = lambda s: app.ev("(s) => __V.fin.empresaKey(s)", s)
    assert k('Açaí & Cia. LTDA ') == k('acai cia') == k('ACAI  CIA - ME') == k('Açaí Cia Eireli') == k('acai cia s.a.')
    assert k('Acai Cia') != k('Acai Companhia')

def test_duplicate_blocked_shows_only_who_and_when(app):
    app.login('u_rec1'); r = opp(app, 'u_rec1', BASE); assert r['ok'] is True
    r2 = opp(app, 'u_rec2', dict(BASE, empresa='acai cia', contato='segredo'))
    assert r2['ok'] is False and r2['existing']['by'] == app.ev(f"() => {U('u_rec1')}.name") and len(r2['existing']['at']) == 10
    assert set(r2['existing'].keys()) == {'by', 'at'}
    app.login('u_rec2'); app.go('#/s/comissoes/oportunidades')
    app.page.fill('[name=empresa]', 'ACAI CIA'); app.page.fill('[name=contato]', 'x'); app.page.select_option('[name=tipo]', 'outro'); app.page.select_option('[name=servico]', 'palestra')
    app.page.click('form[data-form="opp"] button[type=submit]'); app.page.wait_for_timeout(250)
    t = app.page.inner_text('body'); assert 'já registrada por' in t and 'Ana — (11) 9999-0000' not in t
    assert app.ev("() => __V.db.opps.length") == 1

def test_lost_can_be_registered_again(app):
    app.login('u_rec1'); oid = opp(app, 'u_rec1', BASE)['id']
    assert upd(app, 'u_rec1', oid, {'status': 'perdida'})['ok'] is True
    assert opp(app, 'u_rec2', BASE)['ok'] is True

def test_visibility(app):
    opp(app, 'u_rec1', BASE); opp(app, 'u_rec2', dict(BASE, empresa='Outra Empresa'))
    ids = lambda u: sorted(o['userId'] for o in app.ev(f"() => __V.fin.oppsFor({U(u)})"))
    assert ids('u_rec1') == ['u_rec1'] and ids('u_rec2') == ['u_rec2'] and ids('u_admin') == ['u_rec1', 'u_rec2']
    cli = app.ev("() => __V.db.users.find(u => u.role === 'client').id"); assert app.ev(f"() => __V.fin.oppsFor({U(cli)})") == []
    app.login('u_rec1'); app.go('#/s/comissoes/oportunidades'); assert 'Outra Empresa' not in app.main()
    app.login('u_admin'); app.go('#/s/comissoes/oportunidades'); t = app.main(); assert 'Outra Empresa' in t and 'Açaí & Cia. LTDA' in t
    app.page.select_option('[name=oppUser]', 'u_rec2'); app.page.wait_for_timeout(150)
    assert 'Outra Empresa' in app.main() and 'Açaí & Cia. LTDA' not in app.main()
    assert app.errors == []

def test_validation_and_ownership(app):
    for d, w in [({'empresa': ''}, 'empresa'), ({'contato': ''}, 'contato'), ({'tipo': 'x'}, 'tipo'), ({'servico': 'x'}, 'serviço')]:
        r = opp(app, 'u_rec1', dict(BASE, **d)); assert r['ok'] is False and w in r['error'].lower(), (d, r)
    assert opp(app, 'u_rec1', dict(BASE, userId='u_rec2'))['ok'] is True and app.ev("() => __V.db.opps[0].userId") == 'u_rec1'
    assert opp(app, 'u_admin', dict(BASE, empresa='Beta', userId='u_rec2'))['ok'] is True and app.ev("() => __V.db.opps[1].userId") == 'u_rec2'
    assert opp(app, 'u_admin', dict(BASE, empresa='Gama'))['ok'] is False
    oid = app.ev("() => __V.db.opps[0].id")
    assert upd(app, 'u_rec2', oid, {'status': 'perdida'})['ok'] is False
    assert upd(app, 'u_rec1', oid, {'status': 'ganha', 'valor': 1100, 'contratoData': '2026-11-01'})['ok'] is False

def test_win_rules(app):
    oid = opp(app, 'u_rec1', BASE)['id']
    for p, w in [({}, 'valor'), ({'valor': 1100}, 'contrato')]:
        r = upd(app, 'u_admin', oid, dict(p, status='ganha')); assert r['ok'] is False and w in r['error'].lower(), r
    ve = opp(app, 'u_rec1', dict(BASE, empresa='Vaga Extra SA', tipo='vaga_extra', servico=''))['id']
    assert 'vaga' in upd(app, 'u_admin', ve, {'status': 'ganha'})['error'].lower()
    cn = opp(app, 'u_rec1', dict(BASE, empresa='Cliente Novo', tipo='cliente_novo', servico=''))['id']
    cid = app.ev("() => __V.db.companies[0].id")
    assert 'empresa' in upd(app, 'u_admin', cn, {'status': 'ganha', 'contratoData': '2026-11-01'})['error'].lower()
    assert 'contrato' in upd(app, 'u_admin', cn, {'status': 'ganha', 'companyId': cid})['error'].lower()

def test_win_service_generates_origination(app):
    m = app.ev("() => __V.metas.monthKey(new Date())")
    oid = opp(app, 'u_rec1', BASE)['id']
    assert upd(app, 'u_admin', oid, {'status': 'ganha', 'valor': 1100, 'contratoData': m + '-01', 'fatRecebimento': m + '-05'})['ok'] is True
    ex = stmt(app, 'u_rec1', m); o = [l for l in ex['linhas'] if l['tipo'] == 'originacao']
    assert len(o) == 1 and o[0]['valor'] == 77.0

def test_win_extra_job_and_new_client(app):
    m = app.ev("() => __V.metas.monthKey(new Date())")
    cid = app.ev("() => __V.db.jobs[0].companyId"); j0 = app.ev("() => __V.db.jobs[0].id")
    j1 = app.ev("(c) => (__V.db.jobs.find(j => j.companyId === c && j.id !== __V.db.jobs[0].id) || {}).id || null", cid)
    fin = lambda who: {'tipo': 'geral', 'valor': 1320, 'gupy': False, 'alinhamento': m + '-01', 'aprovacao': m + '-05', 'diasSuspensos': 0, 'admissao': m + '-02', 'status': 'fechada', 'garantia': None,
        'fatura': {'emissao': m + '-03', 'status': 'recebida', 'recebimento': m + '-04'}, 'parts': [{'userId': who, 'pct': 100}], 'originadaPor': None, 'origTipo': None, 'contratoInicio': None}
    app.ev(f"([j, d]) => __V.fin.saveJobFin({U('u_admin')}, j, d)", [j0, fin('u_rec1')])
    ve = opp(app, 'u_rec2', dict(BASE, empresa='Extra', tipo='vaga_extra', servico=''))['id']
    assert upd(app, 'u_admin', ve, {'status': 'ganha', 'jobId': j0})['ok'] is True
    o = [l for l in stmt(app, 'u_rec2', m)['linhas'] if l['tipo'] == 'originacao']; assert len(o) == 1 and o[0]['valor'] == 92.4
    assert app.ev("() => __V.db.jobs[0].fin.originadaPor") is None
    app.ev(f"([j, d]) => __V.fin.saveJobFin({U('u_admin')}, j, Object.assign(d, {{ originadaPor: 'u_rec1', origTipo: 'vaga_extra' }}))", [j0, fin('u_rec1')])
    assert [l for l in stmt(app, 'u_rec2', m)['linhas'] if l['tipo'] == 'originacao'] == []
    if j1:
        app.ev(f"([j, d]) => __V.fin.saveJobFin({U('u_admin')}, j, d)", [j1, fin('u_rec1')])
        cn = opp(app, 'u_rec2', dict(BASE, empresa='Novo Cliente', tipo='cliente_novo', servico=''))['id']
        assert upd(app, 'u_admin', cn, {'status': 'ganha', 'companyId': cid, 'contratoData': m + '-01'})['ok'] is True
        o = [l for l in stmt(app, 'u_rec2', m)['linhas'] if l['tipo'] == 'originacao']; assert len(o) == 1 and o[0]['valor'] == 92.4

def test_double_submit_creates_one(app):
    app.login('u_rec1'); app.go('#/s/comissoes/oportunidades')
    app.page.fill('[name=empresa]', 'Delta'); app.page.fill('[name=contato]', 'x'); app.page.select_option('[name=tipo]', 'vaga_extra')
    app.page.evaluate("() => { const f = document.querySelector('form[data-form=opp]'); f.requestSubmit(); f.requestSubmit(); }"); app.page.wait_for_timeout(250)
    assert app.ev("() => __V.db.opps.length") == 1 and app.errors == []

def test_admin_win_via_modal(app):
    m = app.ev("() => __V.metas.monthKey(new Date())")
    oid = opp(app, 'u_rec1', BASE)['id']; app.login('u_admin'); app.go('#/s/comissoes/oportunidades')
    app.page.click(f'[data-act="oppWin"][data-id="{oid}"]'); app.page.wait_for_timeout(200)
    app.page.fill('#modal-root [name=valor]', '1100'); app.page.fill('#modal-root [name=contratoData]', m + '-01'); app.page.fill('#modal-root [name=fatRecebimento]', m + '-05')
    app.page.click('#modal-root button[type=submit]'); app.page.wait_for_timeout(250)
    assert app.ev("() => __V.db.opps[0].status") == 'ganha' and app.errors == []
    app.login('u_rec1'); app.go('#/s/comissoes/oportunidades'); assert app.page.locator('[data-act="oppWin"]').count() == 0
