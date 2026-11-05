def open_personal(app):
    app.login('u_rec1'); app.ev("() => { __V.db.goals = __V.db.goals.filter(g => g.userId !== 'u_rec1'); }")
    app.go('#/s/metas'); app.page.click('[data-act="metaTab"][data-v="pess"]')

def new_goal(app, title, period, target, metric=''):
    app.page.click('[data-act="goalNew"]')
    app.page.fill('#modal-root [name=title]', title)
    app.page.select_option('#modal-root [name=period]', period)
    if metric: app.page.select_option('#modal-root [name=metric]', metric)
    app.page.fill('#modal-root [name=target]', str(target))
    app.page.click('#modal-root button[type=submit]'); app.page.wait_for_timeout(250)

def test_create_manual_goal_and_counter(app):
    open_personal(app); new_goal(app, 'Ligar para 5 candidatos', 'day', 5)
    card = app.page.locator('.gl-card', has_text='Ligar para 5 candidatos')
    assert card.count() == 1 and 'de 5' in card.inner_text()
    for _ in range(3): card.locator('[data-act="goalBump"][data-d="1"]').click()
    assert card.locator('.gl-nums b').inner_text() == '3'
    for _ in range(5): card.locator('[data-act="goalBump"][data-d="-1"]').click()
    assert card.locator('.gl-nums b').inner_text() == '0'

def test_create_metric_goal(app):
    open_personal(app); new_goal(app, '', 'week', 20, 'triaged')
    card = app.page.locator('.gl-card', has_text='Candidatos triados')
    assert card.count() == 1 and card.locator('[data-act="goalBump"]').count() == 0

def test_invalid_target_blocked(app):
    open_personal(app); app.page.click('[data-act="goalNew"]')
    app.page.fill('#modal-root [name=title]', 'Sem alvo'); app.page.click('#modal-root button[type=submit]')
    assert app.ev("() => __V.db.goals.filter(g => g.userId === 'u_rec1').length") == 0
    app.page.fill('#modal-root [name=target]', '0'); app.page.click('#modal-root button[type=submit]'); app.page.wait_for_timeout(200)
    assert 'valor válido' in app.page.inner_text('#toasts') and app.ev("() => __V.db.goals.filter(g => g.userId === 'u_rec1').length") == 0

def test_double_submit_creates_one(app):
    open_personal(app); app.page.click('[data-act="goalNew"]')
    app.page.fill('#modal-root [name=title]', 'Clique duplo'); app.page.fill('#modal-root [name=target]', '4')
    app.page.evaluate("() => { const f = document.querySelector('#modal-root form'); f.requestSubmit(); f.requestSubmit(); }")
    app.page.wait_for_timeout(250)
    assert app.ev("() => __V.db.goals.filter(g => g.userId === 'u_rec1').length") == 1

def test_edit_and_delete_personal(app):
    open_personal(app); new_goal(app, 'Editável', 'day', 5)
    app.page.locator('.gl-card', has_text='Editável').locator('[data-act="goalEdit"]').click()
    app.page.fill('#modal-root [name=target]', '8'); app.page.click('#modal-root button[type=submit]'); app.page.wait_for_timeout(200)
    assert 'de 8' in app.page.locator('.gl-card', has_text='Editável').inner_text()
    app.page.locator('.gl-card', has_text='Editável').locator('[data-act="goalDel"]').click()
    app.page.click('#modal-root [data-act="goalDelDo"]'); app.page.wait_for_timeout(200)
    assert app.page.locator('.gl-card', has_text='Editável').count() == 0

def test_admin_does_not_see_personal_goal_text(app):
    open_personal(app); new_goal(app, 'Ligar para 5 candidatos', 'day', 5)
    app.login('u_admin'); app.go('#/s/metas')
    assert 'Ligar para 5 candidatos' not in app.html()
    app.go('#/s/indicadores/metas'); assert 'Ligar para 5 candidatos' not in app.html()
