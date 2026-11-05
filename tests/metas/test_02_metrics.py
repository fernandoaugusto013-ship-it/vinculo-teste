from helpers import SCENARIO, val

def setup(app):
    app.login('u_rec1'); app.ev(SCENARIO)

def test_hires_counts_by_job_owner(app):
    setup(app)
    assert val(app, 'hires', 'u_rec1') == 2 and val(app, 'hires', 'u_rec2') == 0

def test_triaged_counts_by_actor(app):
    setup(app)
    assert val(app, 'triaged', 'u_rec1') == 3 and val(app, 'triaged', 'u_rec2') == 0

def test_interviews_invites_evals(app):
    setup(app)
    assert val(app, 'interviews', 'u_rec1') == 1 and val(app, 'invites', 'u_rec1') == 2 and val(app, 'evals', 'u_rec1') == 1
    assert val(app, 'invites', 'u_rec2') == 1 and val(app, 'evals', 'u_rec2') == 0

def test_fill_and_resp_in_days(app):
    setup(app)
    assert val(app, 'fill', 'u_rec1') == 10
    assert val(app, 'resp', 'u_rec1') == 1.5

def test_client_ok_needs_five_cases(app):
    setup(app)
    app.ev("""() => { const db = __V.db, D = n => new Date(Date.now() - n * 864e5).toISOString();
      ['advance', 'advance', 'advance', 'reject'].forEach((d, i) => db.apps.push({ id: 'c' + i, jobId: 'j1', candId: 'x', stage: 'aprovado', date: D(40), history: [{ stage: 'novo', date: D(40), by: 'x', byId: null }], clientDecision: d, clientFeedback: [], hiredDate: null })); }""")
    assert val(app, 'clientOk', 'u_rec1', wide=True) is None
    app.ev("""() => { const D = n => new Date(Date.now() - n * 864e5).toISOString(); __V.db.apps.push({ id: 'c9', jobId: 'j1', candId: 'x', stage: 'aprovado', date: D(40), history: [{ stage: 'novo', date: D(40), by: 'x', byId: null }], clientDecision: 'advance', clientFeedback: [], hiredDate: null }); }""")
    assert val(app, 'clientOk', 'u_rec1', wide=True) == 80

def test_stuck_counts_open_jobs_idle_7d(app):
    setup(app)
    assert val(app, 'stuck', 'u_rec1') == 1 and val(app, 'stuck', 'u_rec2') == 0

def test_user_without_jobs_is_zero_not_nan(app):
    setup(app)
    vals = {m: val(app, m, 'u_nobody') for m in ['hires', 'fill', 'resp', 'triaged', 'interviews', 'invites', 'evals', 'clientOk', 'stuck']}
    assert vals['hires'] == 0 and vals['triaged'] == 0 and vals['stuck'] == 0
    assert vals['fill'] is None and vals['resp'] is None and vals['clientOk'] is None
    assert not any(isinstance(v, float) and v != v for v in vals.values())

def test_period_bounds_local(app):
    app.login('u_rec1')
    r = app.ev("""() => { const f = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + d.getHours();
      const ref = new Date(2026, 10, 5, 12), o = {};
      ['day', 'week', 'month'].forEach(p => { const b = __V.metas.periodBounds(p, ref); o[p] = [f(b.start), f(b.end)]; });
      o.key = __V.metas.monthKey(new Date(2026, 10, 30, 23, 59)); return o; }""")
    assert r['week'] == ['2026-11-02 0', '2026-11-09 0']
    assert r['month'] == ['2026-11-01 0', '2026-12-01 0']
    assert r['day'] == ['2026-11-05 0', '2026-11-06 0'] and r['key'] == '2026-11'

def test_suggest_target(app):
    setup(app)
    assert app.ev("() => __V.metas.suggestTarget('hires', 'u_rec1')") == {'value': 11, 'base': 10}
    assert app.ev("() => __V.metas.suggestTarget('fill', 'u_rec1')") == {'value': 9, 'base': 10}
    assert app.ev("() => __V.metas.suggestTarget('hires', 'u_nobody')") == {'value': 0, 'base': None}
