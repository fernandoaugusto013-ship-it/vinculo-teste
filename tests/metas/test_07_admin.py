def admin(app):
    app.login('u_admin'); app.go('#/s/metas')

def test_team_one_card_per_active_recruiter(app):
    admin(app)
    t = app.main()
    assert 'Camila Duarte' in t and 'Rafael Lima' in t and 'no ritmo' in t
    app.ev("() => { __V.db.users.find(x => x.id === 'u_rec2').active = false; }")
    app.go('#/s/dashboard'); app.go('#/s/metas')
    assert 'Rafael Lima' not in app.page.inner_text('main') and app.errors == []

def test_assign_with_suggestion_and_notification(app):
    admin(app); app.ev("() => { __V.db.goals = []; }"); app.go('#/s/dashboard'); app.go('#/s/metas')
    app.page.click('[data-act="goalAssign"]')
    row = app.page.locator('#gl-rows .gl-row', has_text='Camila')
    assert 'últimos 90 dias' in row.inner_text() or 'Sem histórico' in row.inner_text()
    app.page.select_option('#modal-root [name=metric]', 'triaged'); row = app.page.locator('#gl-rows .gl-row', has_text='Camila')
    row.locator('[type=checkbox]').check(); row.locator('input[type=number]').fill('25')
    app.page.click('#modal-root button[type=submit]'); app.page.wait_for_timeout(250)
    g = app.ev("() => __V.db.goals")
    assert len(g) == 1 and g[0]['origin'] == 'admin' and g[0]['userId'] == 'u_rec1' and g[0]['metric'] == 'triaged' and g[0]['target'] == 25
    assert app.ev("() => __V.db.notifs.some(n => n.userId === 'u_rec1' && n.text.includes('Nova meta'))")
    assert 'Candidatos triados' in app.page.inner_text('main')

def test_suggestion_prefilled_from_history(app):
    from helpers import SCENARIO
    admin(app); app.ev(SCENARIO); app.go('#/s/dashboard'); app.go('#/s/metas')
    app.page.click('[data-act="goalAssign"]')
    row = app.page.locator('#gl-rows .gl-row', has_text='Camila')
    assert row.locator('input[type=number]').input_value() == '11' and 'média dos últimos 90 dias: 10' in row.inner_text()

def test_assign_to_many(app):
    admin(app); app.ev("() => { __V.db.goals = []; }"); app.go('#/s/dashboard'); app.go('#/s/metas')
    app.page.click('[data-act="goalAssign"]')
    for n in ['Camila', 'Rafael']:
        r = app.page.locator('#gl-rows .gl-row', has_text=n); r.locator('[type=checkbox]').check(); r.locator('input[type=number]').fill('3')
    app.page.click('#modal-root button[type=submit]'); app.page.wait_for_timeout(250)
    assert app.ev("() => __V.db.goals.length") == 2

def test_assign_requires_recruiter(app):
    admin(app); app.page.click('[data-act="goalAssign"]'); app.page.click('#modal-root button[type=submit]'); app.page.wait_for_timeout(200)
    assert 'ao menos uma recrutadora' in app.page.inner_text('#toasts')

def test_copy_previous_month(app):
    admin(app)
    app.ev("() => { __V.db.goals = []; }")
    app.ev("""() => { const u = __V.db.users.find(x => x.id === 'u_admin'); const m = new Date(); m.setMonth(m.getMonth() - 1);
      const k = m.getFullYear() + '-' + String(m.getMonth() + 1).padStart(2, '0'); ['hires', 'triaged'].forEach(x => __V.metas.saveGoal(u, { userId: 'u_rec1', metric: x, target: 3, month: k })); }""")
    app.go('#/s/dashboard'); app.go('#/s/metas')
    app.page.click('[data-act="goalCopy"]'); app.page.wait_for_timeout(250)
    assert '2 metas copiadas' in app.page.inner_text('#toasts')
    app.page.wait_for_timeout(3200)
    app.page.click('[data-act="goalCopy"]'); app.page.wait_for_timeout(250)
    assert 'Nenhuma meta nova' in app.page.inner_text('#toasts')

def test_edit_and_remove_assigned(app):
    admin(app)
    app.page.locator('[data-act="goalAdmEdit"]').first.click(); app.page.fill('#modal-root [name=target]', '9')
    app.page.click('#modal-root button[type=submit]'); app.page.wait_for_timeout(250)
    assert 9 in app.ev("() => __V.db.goals.map(g => g.target)")
    n = app.ev("() => __V.db.goals.length")
    app.page.locator('[data-act="goalAdmDel"]').first.click(); app.page.click('#modal-root [data-act="goalAdmDelDo"]'); app.page.wait_for_timeout(250)
    assert app.ev("() => __V.db.goals.length") == n - 1

def test_admin_view_has_no_personal_goals(app):
    admin(app)
    t = app.main()
    assert 'Revisar 10 currículos' not in t and 'contatos de acompanhamento' not in t

def test_recruiter_cannot_use_admin_actions(app):
    app.login('u_rec1'); app.go('#/s/metas')
    n = app.ev("() => __V.db.goals.length")
    app.ev("() => { __V.actions.goalAssign(); }")
    assert app.page.locator('#gl-rows').count() == 0
    r = app.ev("() => __V.metas.saveGoal(__V.db.users.find(x => x.id === 'u_rec1'), { userId: 'u_rec2', metric: 'hires', target: 2, month: '2030-01', period: 'month' }).goal.userId")
    assert r == 'u_rec1' and app.ev("() => __V.metas.copyMonthGoals(__V.db.users.find(x => x.id === 'u_rec1'), '2026-10', '2026-11')") == 0
