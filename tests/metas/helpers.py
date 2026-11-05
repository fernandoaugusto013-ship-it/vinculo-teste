SCENARIO = """() => {
  const db = __V.db, D = n => new Date(Date.now() - n * 864e5).toISOString();
  const H = (stage, n, byId) => ({ stage, date: D(n), by: byId || '—', byId: byId || null });
  const job = (id, rec, st, pub) => ({ id, recruiterId: rec, status: st, pubDate: D(pub), companyId: 'co1', title: id });
  db.jobs = [job('j1', 'u_rec1', 'closed', 20), job('j2', 'u_rec1', 'open', 15), job('j3', 'u_rec2', 'open', 10), job('j4', 'u_rec1', 'open', 20), job('j5', 'u_rec1', 'closed', 70)];
  const app = (id, jobId, stage, date, hist, extra) => Object.assign({ id, jobId, candId: 'c_' + id, stage, date: D(date), history: hist, clientDecision: null, clientFeedback: [], hiredDate: null }, extra || {});
  db.apps = [
    app('a1', 'j1', 'contratado', 18, [H('novo', 18), H('triagem', 17, 'u_rec1'), H('contratado', 10, 'u_rec1')], { hiredDate: D(10) }),
    app('a2', 'j2', 'contratado', 8, [H('novo', 8), H('triagem', 6, 'u_rec1'), H('entrevista_rh', 5.5, 'u_rec1'), H('contratado', 5, 'u_rec1')], { hiredDate: D(5) }),
    app('a3', 'j3', 'triagem', 3, [H('novo', 3), H('triagem', 2, 'u_rec1')]),
    app('a4', 'j4', 'novo', 9, [H('novo', 9)])
  ];
  for (let i = 0; i < 28; i++) db.apps.push(app('h' + i, 'j5', 'contratado', 65, [H('novo', 65), H('contratado', 60, 'u_rec1')], { hiredDate: D(60) }));
  db.invites = [{ id: 'i1', by: 'u_rec1', date: D(3) }, { id: 'i2', by: 'u_rec1', date: D(3) }, { id: 'i3', by: 'u_rec2', date: D(3) }];
  db.evals = [{ id: 'e1', byId: 'u_rec1', date: D(2) }];
  db.goals = []; db.goalSnaps = [];
}"""
RANGE30 = "(() => [new Date(Date.now() - 30 * 864e5), new Date(Date.now() + 864e5)])()"

def val(app, metric, user, wide=False):
    return app.ev("([m, u, w]) => { const d = n => new Date(Date.now() + n * 864e5); return __V.metas.goalMetricValue(m, u, w ? d(-90) : d(-30), d(1)); }", [metric, user, wide])

def call(app, fn, uid, *args):
    return app.ev("([fn, uid, args]) => { const u = __V.db.users.find(x => x.id === uid); return __V.metas[fn](u, ...args); }", [fn, uid, list(args)])
