def ids(app, role):
    return app.ev("r => __V.db.users.filter(x => x.role === r).map(x => x.id)", role)

def test_menu_item_visible_for_staff_only(app):
    for uid in ['u_rec1', 'u_admin']:
        app.login(uid); app.go('#/s/dashboard')
        assert app.page.locator('.side a.nl[href="#/s/metas"]').count() == 1
    for role in ['client', 'candidate']:
        app.login(ids(app, role)[0]); app.go('#/s/metas')
        assert 'Acesso restrito' in app.main() and 'Minhas metas' not in app.main()

def test_recruiter_acomp_shows_own_goals(app):
    app.login('u_rec1'); app.go('#/s/metas')
    t = app.main()
    assert 'Minhas metas' in t and 'Contratações' in t and 'Candidatos triados' in t and 'Vagas paradas' in t
    for other in ['Rafael', 'Aprovação pelo cliente', 'Tempo da 1ª resposta', 'contatos de acompanhamento']:
        assert other not in t
    assert app.page.locator('.gl-card .prog').count() >= 3 and app.errors == []

def test_url_param_ignored(app):
    app.login('u_rec1'); app.go('#/s/metas')
    base = app.page.inner_text('main')
    for h in ['#/s/metas?user=u_rec2', '#/s/metas/u_rec2', '#/s/metas?userId=u_rec2&u=u_rec2']:
        app.go(h); assert app.page.inner_text('main') == base

def test_attention_block(app):
    app.login('u_rec1')
    app.ev("""() => { const D = n => new Date(Date.now() + n * 864e5).toISOString(); __V.db.goals.push({ id: 'gx', userId: 'u_rec1', origin: 'self', metric: null, title: 'Meta atrasada X', target: 1000, unit: '', period: 'month', start: D(-20), end: D(1), manual: 0, status: 'active', createdBy: 'u_rec1', createdAt: D(-20) }); }""")
    app.go('#/s/metas'); assert 'Meta atrasada X' in app.page.inner_text('.gl-attn')
    app.ev("() => { __V.db.goals = __V.db.goals.filter(g => g.userId !== 'u_rec1'); }")
    app.go('#/s/dashboard'); app.go('#/s/metas'); assert 'Tudo em dia' in app.page.inner_text('.gl-attn')

def test_tab_assigned_is_read_only_and_personal_has_edit(app):
    app.login('u_rec1'); app.go('#/s/metas')
    app.page.click('[data-act="metaTab"][data-v="atrib"]')
    assert app.page.locator('.gl-card').count() >= 3 and app.page.locator('[data-act="goalEdit"], [data-act="goalDel"], [data-act="goalBump"]').count() == 0
    app.page.click('[data-act="metaTab"][data-v="pess"]')
    assert 'Revisar 10 currículos' in app.main() and app.page.locator('[data-act="goalEdit"]').count() >= 1
