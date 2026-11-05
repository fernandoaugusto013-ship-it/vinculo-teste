from helpers import call

def fresh(app):
    app.login('u_rec1')
    app.ev("() => { __V.db.goals = []; __V.db.goalSnaps = []; }")

def mk_admin(app, rec='u_rec1', metric='hires', target=4, month='2026-10'):
    return call(app, 'saveGoal', 'u_admin', {'userId': rec, 'metric': metric, 'target': target, 'month': month})

def test_seed_has_demo_goals(app):
    app.login('u_rec1')
    g = app.ev("() => __V.db.goals")
    assert any(x['origin'] == 'admin' and x['userId'] == 'u_rec1' for x in g)
    assert any(x['origin'] == 'self' and x['userId'] == 'u_rec2' for x in g)

def test_rec_sees_only_own(app):
    app.login('u_rec1')
    r = app.ev("() => { const u = __V.db.users.find(x => x.id === 'u_rec1'); return __V.metas.goalsFor(u).map(g => g.userId); }")
    assert r and set(r) == {'u_rec1'}

def test_admin_never_sees_personal(app):
    app.login('u_admin')
    r = app.ev("() => { const u = __V.db.users.find(x => x.id === 'u_admin'); return __V.metas.goalsFor(u).map(g => g.origin); }")
    assert r and set(r) == {'admin'}

def test_client_and_candidate_get_nothing(app):
    app.login('u_rec1')
    for uid in [u for u in app.ev("() => __V.db.users.filter(x => x.role === 'client' || x.role === 'candidate').map(x => x.id)")[:3]]:
        assert app.ev("id => __V.metas.goalsFor(__V.db.users.find(x => x.id === id))", uid) == []
    assert app.ev("() => __V.metas.goalsFor(null)") == []

def test_rec_cannot_edit_or_delete_others_or_admin_goals(app):
    fresh(app)
    other = mk_admin(app, 'u_rec2')['goal']['id']; mine_admin = mk_admin(app, 'u_rec1')['goal']['id']
    assert call(app, 'removeGoal', 'u_rec1', other)['ok'] is False
    assert call(app, 'removeGoal', 'u_rec1', mine_admin)['ok'] is False
    assert call(app, 'saveGoal', 'u_rec1', {'id': other, 'target': 99})['ok'] is False
    assert call(app, 'saveGoal', 'u_rec1', {'userId': 'u_rec2', 'metric': 'triaged', 'target': 5, 'period': 'week'})['goal']['userId'] == 'u_rec1'

def test_admin_cannot_edit_personal(app):
    fresh(app)
    mine = call(app, 'saveGoal', 'u_rec1', {'metric': None, 'title': 'Pessoal', 'target': 5, 'period': 'day'})['goal']['id']
    assert call(app, 'removeGoal', 'u_admin', mine)['ok'] is False
    assert call(app, 'saveGoal', 'u_admin', {'id': mine, 'target': 1})['ok'] is False

def test_validation(app):
    fresh(app)
    assert mk_admin(app, target=0)['ok'] is False
    assert mk_admin(app, target=-1)['ok'] is False
    assert mk_admin(app, target='')['ok'] is False
    assert mk_admin(app, metric='stuck', target=0)['ok'] is True        # menor é melhor: zero vale
    assert call(app, 'saveGoal', 'u_rec1', {'metric': None, 'title': '', 'target': 3, 'period': 'day'})['ok'] is False
    assert call(app, 'saveGoal', 'u_rec1', {'metric': 'triaged', 'target': 3, 'period': 'year'})['ok'] is False
    assert call(app, 'saveGoal', 'u_rec1', {'userId': 'u_rec2', 'metric': 'hires', 'target': 3, 'month': '2026-10', 'period': 'month'})['ok'] is True
    assert call(app, 'saveGoal', 'u_admin', {'userId': 'u_admin', 'metric': 'hires', 'target': 3, 'month': '2026-10'})['ok'] is False
    assert call(app, 'saveGoal', 'u_admin', {'userId': 'u_rec1', 'metric': 'hires', 'target': 3, 'month': '2026-10', 'period': 'week'})['goal']['period'] == 'month'

def test_duplicate_and_double_submit(app):
    fresh(app)
    first = mk_admin(app); second = mk_admin(app)
    assert first['ok'] is True and second['ok'] is False and 'Já existe uma meta igual neste período.' in second['error']
    d = {'metric': None, 'title': 'Ligar', 'target': 5, 'period': 'day'}
    assert call(app, 'saveGoal', 'u_rec1', d)['ok'] is True and call(app, 'saveGoal', 'u_rec1', d)['ok'] is False
    assert app.ev("() => __V.db.goals.filter(g => g.userId === 'u_rec1').length") == 2

def test_bump_manual_only_own(app):
    fresh(app)
    gid = call(app, 'saveGoal', 'u_rec1', {'metric': None, 'title': 'Ligar', 'target': 5, 'period': 'day'})['goal']['id']
    for _ in range(3): call(app, 'bumpGoal', 'u_rec1', gid, 1)
    call(app, 'bumpGoal', 'u_rec1', gid, -10)
    assert app.ev("id => __V.db.goals.find(g => g.id === id).manual", gid) == 0
    call(app, 'bumpGoal', 'u_rec1', gid, 2)
    assert call(app, 'bumpGoal', 'u_rec2', gid, 1)['ok'] is False and app.ev("id => __V.db.goals.find(g => g.id === id).manual", gid) == 2

def test_copy_month(app):
    fresh(app)
    mk_admin(app, 'u_rec1', 'hires'); mk_admin(app, 'u_rec1', 'triaged', 30); mk_admin(app, 'u_rec2', 'resp', 2)
    assert call(app, 'copyMonthGoals', 'u_admin', '2026-10', '2026-11') == 3
    assert call(app, 'copyMonthGoals', 'u_admin', '2026-10', '2026-11') == 0
    app.ev("() => { __V.db.users.find(x => x.id === 'u_rec2').active = false; }")
    assert call(app, 'copyMonthGoals', 'u_admin', '2026-10', '2026-12') == 2
    assert call(app, 'copyMonthGoals', 'u_rec1', '2026-10', '2027-01') == 0

def test_notifications_on_admin_changes(app):
    fresh(app)
    gid = mk_admin(app)['goal']['id']
    n0 = app.ev("() => __V.db.notifs.filter(n => n.userId === 'u_rec1').length")
    call(app, 'saveGoal', 'u_admin', {'id': gid, 'target': 7})
    call(app, 'removeGoal', 'u_admin', gid)
    texts = app.ev("() => __V.db.notifs.filter(n => n.userId === 'u_rec1').map(n => n.text)")
    assert len(texts) == n0 + 2 and any('atualizada' in t for t in texts) and any('removida' in t for t in texts)
    assert any('Nova meta' in t for t in texts)
