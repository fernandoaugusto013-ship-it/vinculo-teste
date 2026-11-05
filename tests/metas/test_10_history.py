def test_close_months_idempotent(app):
    app.login('u_rec1')
    app.ev("""() => { __V.db.goals = []; __V.db.goalSnaps = []; __V.db.goals.push({ id: 'gold', userId: 'u_rec1', origin: 'self', metric: null, title: 'Antiga', target: 5, unit: '', period: 'month',
      start: new Date(2026, 9, 1).toISOString(), end: new Date(2026, 10, 1).toISOString(), manual: 6, status: 'active', createdBy: 'u_rec1', createdAt: '2026-10-01' }); }""")
    assert app.ev("() => __V.metas.closeMonths(new Date(2026, 10, 5))") == 1
    assert app.ev("() => __V.metas.closeMonths(new Date(2026, 10, 5))") == 0
    app.page.reload(); app.page.wait_for_selector('#app > *')
    snaps = app.ev("() => __V.db.goalSnaps.filter(x => x.goalId === 'gold')")
    assert len(snaps) == 1 and snaps[0]['hit'] is True and snaps[0]['result'] == 6 and snaps[0]['month'] == '2026-10'

def test_current_month_not_closed(app):
    app.login('u_rec1')
    assert app.ev("() => { __V.db.goalSnaps = []; return __V.metas.closeMonths(); }") == 0

def test_seed_has_three_prior_months(app):
    app.login('u_rec1')
    h = app.ev("() => __V.metas.goalHistory(__V.db.users.find(x => x.id === 'u_rec1'), 12)")
    assert [m['total'] > 0 for m in h[:3]] == [True, True, True] and h[3]['total'] == 0 and h[3]['pct'] is None

def test_recruiter_history_is_private(app):
    app.login('u_rec1')
    h = app.ev("() => __V.metas.goalHistory(__V.db.users.find(x => x.id === 'u_rec1'), 12)")
    assert all(i['userId'] == 'u_rec1' for m in h for i in m['items'])
    app.go('#/s/indicadores/metas'); t = app.main()
    assert 'Rafael' not in t and 'Aprovação pelo cliente' not in t and 'Atualizar 20 perfis' in t and app.errors == []

def test_admin_history_assigned_only(app):
    app.login('u_admin')
    h = app.ev("() => __V.metas.goalHistory(__V.db.users.find(x => x.id === 'u_admin'), 12)")
    users = {i['userId'] for m in h for i in m['items']}
    assert users == {'u_rec1', 'u_rec2'} and all(i['origin'] == 'admin' for m in h for i in m['items'])
    app.go('#/s/indicadores/metas'); assert 'Atualizar 20 perfis' not in app.main() and 'Rafael Lima' in app.main()

def test_snapshot_has_only_numbers(app):
    app.login('u_rec1')
    keys = app.ev("() => [...new Set(__V.db.goalSnaps.flatMap(x => Object.keys(x)))]")
    assert set(keys) <= {'id', 'userId', 'month', 'goalId', 'metric', 'title', 'target', 'unit', 'result', 'hit', 'origin'}

def test_removed_recruiter_does_not_break(app):
    app.login('u_admin')
    app.ev("""() => { __V.db.users.push({ id: 'u_gone', role: 'recruiter', name: 'Removido', email: 'x@y.invalid', pass: 'x', active: false });
      __V.db.goalSnaps.push({ id: 'gsx', userId: 'u_gone', month: '2026-09', goalId: 'zz', metric: 'hires', title: 'Contratações', target: 1, unit: '', result: 1, hit: true, origin: 'admin' });
      __V.db.goalSnaps.push({ id: 'gsy', userId: 'u_nobody', month: '2026-09', goalId: 'zy', metric: 'hires', title: 'Contratações', target: 1, unit: '', result: 1, hit: true, origin: 'admin' }); }""")
    app.go('#/s/indicadores/metas')
    assert 'Removido' not in app.main() and app.errors == []

def test_deactivated_recruiter_stays_in_history(app):
    app.login('u_admin'); app.ev("() => { __V.db.users.find(x => x.id === 'u_rec2').active = false; }")
    app.go('#/s/indicadores/metas'); assert 'Rafael Lima' in app.main()

def test_menu_lists_metas_subpage(app):
    app.login('u_rec1'); app.go('#/s/indicadores/geral')
    assert app.page.locator('.nlsub a', has_text='Metas (histórico)').count() == 1
    for uid in app.ev("() => __V.db.users.filter(x => x.role === 'client' || x.role === 'candidate').map(x => x.id).slice(0, 2)"):
        app.login(uid); app.go('#/s/indicadores/metas'); assert 'Acesso restrito' in app.main()
