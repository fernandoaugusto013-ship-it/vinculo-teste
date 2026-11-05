from helpers import SCENARIO

def prog(app, goal_extra, now):
    return app.ev("""([g, now]) => { const base = { id: 'g', userId: 'u_rec1', origin: 'self', metric: null, title: 't', target: 10, unit: '', period: 'month',
      start: new Date(2026, 10, 1).toISOString(), end: new Date(2026, 11, 1).toISOString(), manual: 0, status: 'active' };
      if (g.end === 'SAME') g.end = base.start; return __V.metas.goalProgress(Object.assign(base, g), new Date(now)); }""", [goal_extra, now])

MID = '2026-11-16T12:00:00'   # horário local; ~51,7% do mês

def test_hit(app):
    app.login('u_rec1')
    assert prog(app, {'manual': 10}, MID)['status'] == 'hit'

def test_ontrack_and_late(app):
    app.login('u_rec1')
    assert prog(app, {'manual': 5}, MID)['status'] == 'ontrack'
    r = prog(app, {'manual': 4}, MID)
    assert r['status'] == 'late' and r['pct'] == 40

def test_missed_when_period_over(app):
    app.login('u_rec1')
    assert prog(app, {'manual': 7}, '2026-12-02T09:00:00')['status'] == 'missed'

def test_down_within_out(app):
    app.login('u_rec1'); app.ev(SCENARIO)
    near = lambda t, n: app.ev("""([t, n]) => __V.metas.goalProgress({ id: 'g', userId: 'u_rec1', metric: 'stuck', target: t, period: 'month', manual: null,
        start: new Date(Date.now() - 5 * 864e5).toISOString(), end: new Date(Date.now() + 5 * 864e5).toISOString() }, new Date()).status""", [t, n])
    assert near(0, 0) == 'out' and near(2, 0) == 'within'

def test_manual_goal_uses_manual_value(app):
    app.login('u_rec1')
    assert prog(app, {'manual': 3}, MID)['value'] == 3

def test_nodata_when_metric_null(app):
    app.login('u_rec1'); app.ev(SCENARIO)
    assert prog(app, {'metric': 'clientOk', 'target': 80}, MID)['status'] == 'nodata'

def test_zero_length_period_no_nan(app):
    app.login('u_rec1')
    r = prog(app, {'manual': 1, 'end': 'SAME'}, MID)
    assert r['expectedPct'] == 100
    assert not any(isinstance(v, float) and v != v for v in r.values())

def test_target_zero_up_no_division(app):
    app.login('u_rec1')
    r = prog(app, {'target': 0, 'manual': 0}, MID)
    assert r['pct'] is None and r['status'] == 'nodata'

def test_last_day_2359_still_open(app):
    app.login('u_rec1')
    r = prog(app, {'manual': 3}, '2026-11-30T23:59:00')
    assert r['daysLeft'] == 0 and r['status'] == 'late'
