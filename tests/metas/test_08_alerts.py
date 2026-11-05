LATE = """() => { const D = n => new Date(Date.now() + n * 864e5).toISOString(); const db = __V.db;
  db.goals = db.goals.filter(g => g.userId !== 'u_rec1');
  [['L1', 1000], ['L2', 2000]].forEach(([t, v]) => db.goals.push({ id: 'g' + t, userId: 'u_rec1', origin: 'self', metric: null, title: t, target: v, unit: '', period: 'month', start: D(-20), end: D(1), manual: 0, status: 'active', createdBy: 'u_rec1', createdAt: D(-20) }));
  db.goals.push({ id: 'gR2', userId: 'u_rec2', origin: 'self', metric: null, title: 'R2late', target: 500, unit: '', period: 'month', start: D(-20), end: D(1), manual: 0, status: 'active', createdBy: 'u_rec2', createdAt: D(-20) }); }"""

def test_badge_counts_late_goals(app):
    app.login('u_rec1'); app.ev(LATE); app.go('#/s/dashboard')
    assert app.page.locator('.side a.nl[href="#/s/metas"] .cnt').inner_text() == '2'
    app.ev("() => { __V.db.goals.filter(g => g.userId === 'u_rec1').forEach(g => g.manual = g.target); }")
    app.go('#/s/vagas'); app.go('#/s/dashboard')
    assert app.page.locator('.side a.nl[href="#/s/metas"] .cnt').count() == 0

def test_dashboard_banner(app):
    app.login('u_rec1'); app.ev(LATE); app.go('#/s/dashboard')
    b = app.page.locator('.gl-banner')
    assert b.count() == 1 and '2 metas atrasadas' in b.inner_text() and b.get_attribute('href') == '#/s/metas'
    app.ev("() => { __V.db.goals = []; }"); app.go('#/s/vagas'); app.go('#/s/dashboard')
    assert app.page.locator('.gl-banner').count() == 0

def test_no_banner_or_badge_for_admin(app):
    app.login('u_admin'); app.ev(LATE); app.go('#/s/dashboard')
    assert app.page.locator('.gl-banner').count() == 0 and app.page.locator('.side a.nl[href="#/s/metas"] .cnt').count() == 0

def test_no_alert_for_other_recruiter(app):
    app.login('u_rec1'); app.ev(LATE)
    names = app.ev("() => __V.metas.lateGoalsFor(__V.db.users.find(x => x.id === 'u_rec1')).map(g => g.title)")
    assert sorted(names) == ['L1', 'L2']

def test_inactive_recruiter_leaves_tracking(app):
    app.login('u_rec1'); app.ev(LATE)
    app.ev("() => { __V.db.users.find(x => x.id === 'u_rec1').active = false; }")
    assert app.ev("() => __V.metas.lateGoalsFor(__V.db.users.find(x => x.id === 'u_rec1'))") == []
