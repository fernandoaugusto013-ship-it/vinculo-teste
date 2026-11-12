SET = """([idx, x]) => { const j = __V.db.jobs[idx]; j.fin = Object.assign({ tipo: 'geral', valor: 1320, gupy: false, alinhamento: '2026-11-01', aprovacao: null, diasSuspensos: 0, admissao: null,
  status: 'aberta', garantia: null, fatura: { emissao: null, status: 'aberta', recebimento: null }, parts: [{ userId: 'u_rec1', pct: 100 }], originadaPor: null, origTipo: null, contratoInicio: null }, x); return j.title; }"""
def chk(app, hoje): return app.ev("(h) => __V.fin.checkFaixaAlerts(h)", hoje)
def notes(app, uid): return app.ev(f"() => __V.db.notifs.filter(n => n.userId === '{uid}' && n.text.includes('mudar de faixa')).map(n => n.text)")
def clear(app): app.ev("() => { __V.db.jobs.forEach(j => delete j.fin); __V.db.payAlerts.length = 0; }")

def test_basic_once_and_text(app):
    clear(app); title = app.ev(SET, [0, {}])
    assert chk(app, '2026-11-06') == 0
    assert chk(app, '2026-11-09') == 1 and chk(app, '2026-11-09') == 0 and chk(app, '2026-11-10') == 0
    n = notes(app, 'u_rec1'); assert len(n) == 1 and n[0].startswith('Faltam 3 dias para a vaga') and title in n[0] and '20%' in n[0] and '10%' in n[0]
    assert notes(app, 'u_rec2') == []
    assert chk(app, '2026-11-19') == 1 and len(notes(app, 'u_rec1')) == 2
    assert chk(app, '2026-11-21') == 0

def test_singular(app):
    clear(app); app.ev(SET, [0, {}]); assert chk(app, '2026-11-11') == 1
    assert notes(app, 'u_rec1')[0].startswith('Falta 1 dia para a vaga')

def test_excluded(app):
    clear(app)
    for i, x in enumerate([{'status': 'fechada'}, {'status': 'cancelada'}, {'status': 'congelada'}, {'alinhamento': None}, {'aprovacao': '2026-11-05'}]):
        app.ev(SET, [i, x])
    assert chk(app, '2026-11-09') == 0

def test_parts_only_and_inactive(app):
    clear(app); app.ev(SET, [0, {'parts': [{'userId': 'u_rec1', 'pct': 50}, {'userId': 'u_rec2', 'pct': 50}]}])
    app.ev("() => { __V.db.users.find(u => u.id === 'u_rec2').active = false; }")
    assert chk(app, '2026-11-09') == 1
    assert len(notes(app, 'u_rec1')) == 1 and notes(app, 'u_rec2') == []
    assert app.ev("() => __V.db.notifs.filter(n => n.text.includes('mudar de faixa')).length") == 1

def test_suspended_days_delay(app):
    clear(app); app.ev(SET, [0, {'diasSuspensos': 2}])
    assert chk(app, '2026-11-09') == 0 and chk(app, '2026-11-11') == 1

def test_contabil_table(app):
    clear(app); app.ev(SET, [0, {'tipo': 'contabil'}])
    assert chk(app, '2026-11-09') == 0 and chk(app, '2026-11-29') == 1

def test_notifications_page_shows(app):
    app.login('u_rec1'); clear(app); title = app.ev(SET, [0, {}])
    app.ev("() => { const p2 = n => String(n).padStart(2, '0'), t = new Date(); t.setDate(t.getDate() - 8); __V.db.jobs[0].fin.alinhamento = t.getFullYear() + '-' + p2(t.getMonth() + 1) + '-' + p2(t.getDate()); __V.save && __V.save(); }")
    app.go('#/s/notificacoes'); app.page.wait_for_timeout(200)
    t = app.main(); assert 'Faltam 3 dias para a vaga' in t and title in t and app.errors == []

