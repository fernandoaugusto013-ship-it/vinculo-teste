def test_move_app_records_actor_id(app):
    app.login('u_rec1')
    r = app.ev("""() => { const a = __V.db.apps.find(x => x.stage === 'novo'); __V.moveApp(a.id, 'triagem');
      const h = a.history[a.history.length - 1]; return h; }""")
    assert r['byId'] == 'u_rec1' and r['by'] == 'Camila Duarte'

def test_seed_evals_have_ids(app):
    app.login('u_rec1')
    r = app.ev("() => __V.db.evals.filter(e => e.byId === undefined).length")
    assert r == 0

def test_legacy_db_is_migrated(app):
    app.login('u_rec1')
    app.ev("""() => { const d = JSON.parse(localStorage.getItem('vinculo_mvp_v1')); delete d.goals; delete d.goalSnaps;
      d.apps.forEach(a => a.history.forEach(h => delete h.byId)); d.evals.forEach(e => delete e.byId);
      localStorage.setItem('vinculo_mvp_v1', JSON.stringify(d)); }""")
    app.page.reload(); app.page.wait_for_selector('#app > *')
    r = app.ev("""() => ({ g: __V.db.goals, s: __V.db.goalSnaps,
      bad: __V.db.apps.flatMap(a => a.history).filter(h => h.by === 'Camila Duarte' && h.byId !== 'u_rec1').length,
      ev: __V.db.evals.filter(e => e.by === 'Rafael Lima' && e.byId !== 'u_rec2').length })""")
    assert r['s'] == [] and isinstance(r['g'], list) and r['bad'] == 0 and r['ev'] == 0
    assert app.errors == []

def test_seed_history_has_ids(app):
    app.login('u_rec1')
    r = app.ev("() => __V.db.apps.flatMap(a => a.history).filter(h => h.byId === undefined).length")
    assert r == 0
