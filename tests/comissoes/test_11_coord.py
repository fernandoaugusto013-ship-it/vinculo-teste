U = lambda i: f"__V.db.users.find(x => x.id === '{i}')"
A = U('u_admin')
def prev_month(app): return app.ev("() => { const m = __V.metas.monthKey(new Date()); let [y, mo] = m.split('-').map(Number); mo--; if (!mo) { y--; mo = 12; } return y + '-' + String(mo).padStart(2, '0'); }")
def seed(app, m, extra=None):
    d = {'tipo': 'geral', 'valor': 1320, 'gupy': False, 'alinhamento': m + '-01', 'aprovacao': m + '-02', 'diasSuspensos': 0, 'admissao': m + '-02', 'status': 'fechada', 'garantia': 30,
         'fatura': {'emissao': m + '-03', 'status': 'recebida', 'recebimento': m + '-04'}, 'parts': [{'userId': 'u_rec1', 'pct': 100}], 'originadaPor': None, 'origTipo': None, 'contratoInicio': None}
    d.update(extra or {})
    return app.ev(f"([j, d]) => __V.fin.saveJobFin({A}, j, d)", [app.ev("() => __V.db.jobs[0].id"), d])
def st(app, uid, m): return app.ev(f"(m) => __V.fin.payStatement({A}, m, '{uid}')", m)
def adj(app, who, uid, m, v, mot): return app.ev(f"([u, m, v, t]) => __V.fin.addAdjust({U(who)}, u, m, v, t)", [uid, m, v, mot])

def test_adjust_rules(app):
    m = app.ev("() => __V.metas.monthKey(new Date())")
    assert adj(app, 'u_admin', 'u_rec1', m, -50, 'Desconto de material')['ok'] is True
    s = st(app, 'u_rec1', m); a = [l for l in s['linhas'] if l['tipo'] == 'ajuste']
    assert a == [{'jobId': None, 'tipo': 'ajuste', 'descricao': 'Desconto de material', 'valor': -50}] and s['total'] == 536.05
    for args in [(-50, ''), (0, 'x'), ('abc', 'x')]:
        assert adj(app, 'u_admin', 'u_rec1', m, *args)['ok'] is False
    assert adj(app, 'u_admin', 'u_ghost', m, 10, 'x')['ok'] is False
    assert adj(app, 'u_admin', 'u_rec1', '2026-13', 10, 'x')['ok'] is False
    assert adj(app, 'u_rec1', 'u_rec1', m, 999, 'bonus')['ok'] is False
    assert app.ev("() => __V.db.payAdjust.length") == 1

def test_close_month_freezes(app):
    pm = prev_month(app); seed(app, pm)
    before = st(app, 'u_rec1', pm)['total']; assert before == 770.85
    r = app.ev(f"(m) => __V.fin.closeMonth({A}, m)", pm); assert r['ok'] is True
    app.ev(f"() => __V.fin.savePayParams({A}, {{ metaBase: 9000, ajudaCusto: 1 }})")
    app.ev("() => { __V.db.jobs[0].fin.valor = 99999; }")
    s = st(app, 'u_rec1', pm); assert s['total'] == before and s['fechado'] is True
    assert app.ev(f"(m) => __V.fin.closeMonth({A}, m).ok", pm) is False
    assert app.ev("(m) => __V.db.payClosings.filter(c => c.month === m).length", pm) == 1
    ids = app.ev("(m) => __V.db.payClosings.find(c => c.month === m).statements.map(s => s.userId).sort()", pm)
    assert ids == sorted(app.ev("() => __V.db.users.filter(u => u.role === 'recruiter' && u.active !== false).map(u => u.id)"))
    assert adj(app, 'u_admin', 'u_rec1', pm, 10, 'x')['ok'] is False

def test_close_rules(app):
    m = app.ev("() => __V.metas.monthKey(new Date())")
    assert app.ev(f"(m) => __V.fin.closeMonth({A}, m).ok", m) is False
    assert app.ev(f"() => __V.fin.closeMonth({A}, '2030-01').ok") is False
    assert app.ev(f"() => __V.fin.closeMonth({U('u_rec1')}, '2026-01').ok") is False
    assert app.ev("() => __V.db.payClosings.length") == 0

def test_reposicao_estorno_next_month(app):
    pm = prev_month(app); m = app.ev("() => __V.metas.monthKey(new Date())"); seed(app, pm)
    app.ev(f"(m) => __V.fin.closeMonth({A}, m)", pm)
    assert adj(app, 'u_admin', 'u_rec1', m, -184.8, 'Estorno — reposição da vaga')['ok'] is True
    s = st(app, 'u_rec1', m); assert s['total'] == 401.25

def test_coord_view(app):
    pm = prev_month(app); m = app.ev("() => __V.metas.monthKey(new Date())"); seed(app, m)
    j2 = app.ev("() => __V.db.jobs[1].id")
    app.ev(f"([j, m]) => __V.fin.saveJobFin({A}, j, {{ tipo:'geral', valor:1800, gupy:true, alinhamento:m+'-01', aprovacao:m+'-02', diasSuspensos:0, admissao:m+'-03', status:'fechada', garantia:null, fatura:{{emissao:m+'-04',status:'aberta',recebimento:null}}, parts:[{{userId:'u_rec2',pct:100}}], originadaPor:null, origTipo:null, contratoInicio:null }})", [j2, m])
    app.login('u_admin'); app.go('#/s/comissoes/coordenacao')
    assert app.page.input_value('[name=coordMonth]') == pm
    app.page.select_option('[name=coordMonth]', m); app.page.wait_for_timeout(150)
    t = app.main(); names = app.ev("() => __V.db.users.filter(u => u.role === 'recruiter').map(u => u.name)")
    for n in names: assert n in app.page.inner_text('#coord-rec'), n
    assert 'R$ 770,85' in app.page.inner_text('#coord-rec')
    fa = app.page.inner_text('#coord-fat'); assert app.ev("() => __V.db.jobs[1].title") in fa and 'R$ 1.800,00' in fa and 'dias' in fa
    assert 'R$ 232,00' in app.page.inner_text('#coord-agu')
    app.page.select_option('#coord-adj [name=userId]', 'u_rec1'); app.page.fill('#coord-adj [name=valor]', '-30'); app.page.fill('#coord-adj [name=motivo]', 'Ajuste teste')
    app.page.click('#coord-adj button[type=submit]'); app.page.wait_for_timeout(250)
    assert app.ev("() => __V.db.payAdjust.length") == 1 and 'Ajuste teste' in app.main()
    app.page.select_option('[name=coordMonth]', pm); app.page.wait_for_timeout(150)
    app.page.click('[data-act="payClose"]'); app.page.wait_for_timeout(150)
    app.page.click('#modal-root [data-act="payCloseDo"]'); app.page.wait_for_timeout(250)
    assert app.ev("(m) => __V.db.payClosings.some(c => c.month === m)", pm) and 'Mês fechado' in app.main()
    assert app.page.locator('[data-act="payClose"]').count() == 0 and app.errors == []

def test_recruiter_no_coord(app):
    app.login('u_rec1'); app.go('#/s/comissoes/coordenacao'); t = app.main()
    assert 'coord-rec' not in app.html() and 'Faturas em aberto' not in t
