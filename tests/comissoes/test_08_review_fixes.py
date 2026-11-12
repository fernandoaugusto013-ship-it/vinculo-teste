def test_duplicate_job_does_not_copy_fin(app):
    app.login('u_admin'); jid = app.ev("() => __V.db.jobs[0].id")
    app.ev("([j]) => __V.fin.saveJobFin(__V.db.users.find(x => x.id === 'u_admin'), j, { tipo:'geral', valor:1320, gupy:false, alinhamento:'2026-11-01', aprovacao:'2026-11-05', diasSuspensos:0, admissao:'2026-11-06', status:'fechada', garantia:null, fatura:{emissao:'2026-11-07',status:'recebida',recebimento:'2026-11-08'}, parts:[{userId:'u_rec1',pct:100}], originadaPor:null, origTipo:null, contratoInicio:null })", [jid])
    n = app.ev("() => __V.db.jobs.length")
    app.ev("([j]) => __V.actions.dupJob({ dataset: { id: j } })", [jid]); app.page.wait_for_timeout(200)
    assert app.ev("() => __V.db.jobs.length") == n + 1
    assert app.ev("() => __V.db.jobs[__V.db.jobs.length - 1].fin || null") is None
    assert app.ev("() => __V.db.jobs.filter(j => j.fin).length") == 1
