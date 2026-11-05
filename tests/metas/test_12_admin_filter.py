def test_admin_selects_recruiter_and_sees_her_goals(app):
    app.login('u_admin'); app.go('#/s/metas')
    assert app.page.locator('.gl-team').count() == 2
    app.page.select_option('select[data-act="metaRec"]', 'u_rec1')
    app.page.wait_for_timeout(250)
    assert app.page.locator('.gl-team').count() == 1
    t = app.page.inner_text('.gl-team')
    assert 'Camila Duarte' in t and 'Rafael' not in t and 'Candidatos triados' in t and 'Rafael' not in app.page.inner_text('main').split('Camila Duarte')[-1].replace('Rafael Lima\nMês','')
    assert app.page.locator('.gl-team .gl-card').count() == 3
    assert 'Revisar 10 currículos' not in t
    app.page.select_option('select[data-act="metaRec"]', '')
    app.page.wait_for_timeout(250)
    assert app.page.locator('.gl-team').count() == 2 and app.errors == []

def test_filter_ignores_stale_recruiter(app):
    app.login('u_admin'); app.ev("() => { __V.ui.metaRec = 'u_gone'; }"); app.go('#/s/metas')
    assert app.page.locator('.gl-team').count() == 2
