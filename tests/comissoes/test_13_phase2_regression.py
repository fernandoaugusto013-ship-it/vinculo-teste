U = lambda i: f"__V.db.users.find(x => x.id === '{i}')"
A = U('u_admin')

def test_opps_isolated_by_url(app):
    app.ev(f"() => {{ __V.fin.saveOpp({U('u_rec2')}, {{ empresa: 'Segredo do Rafael', contato: 'tel-oculto', tipo: 'vaga_extra', servico: '' }}); }}")
    app.ev("() => localStorage.setItem('vinculo_mvp_v1', JSON.stringify(__V.db))")
    app.login('u_rec1')
    for h in ['#/s/comissoes/oportunidades', '#/s/comissoes/oportunidades?user=u_rec2', '#/s/comissoes/oportunidades/u_rec2', '#/s/comissoes?oppUser=u_rec2']:
        app.go(h); app.page.wait_for_timeout(120); t = app.main()
        assert 'Segredo do Rafael' not in t and 'tel-oculto' not in t, h

def test_mobile_no_overflow_all_new_screens(app):
    app.page.set_viewport_size({'width': 390, 'height': 844})
    for theme in ['light', 'dark']:
        for uid, routes in [('u_admin', ['#/s/comissoes', '#/s/comissoes/com', '#/s/comissoes/oportunidades', '#/s/comissoes/extratos', '#/s/comissoes/coordenacao', '#/s/comissoes/parametros']),
                            ('u_rec1', ['#/s/comissoes', '#/s/comissoes/extrato', '#/s/comissoes/oportunidades'])]:
            app.login(uid)
            for h in routes:
                app.go(h); app.ev(f"() => document.documentElement.setAttribute('data-theme', '{theme}')"); app.page.wait_for_timeout(120)
                assert app.ev("() => document.documentElement.scrollWidth") <= 390, (theme, uid, h)
    assert app.errors == []

def test_old_db_without_phase2_keys(app):
    app.ev("() => { const d = JSON.parse(localStorage.getItem('vinculo_mvp_v1')) || __V.db; ['opps', 'payAlerts', 'payAdjust', 'payClosings', 'payDemo'].forEach(k => delete d[k]); localStorage.setItem('vinculo_mvp_v1', JSON.stringify(d)); }")
    app.login('u_admin')
    for h in ['#/s/comissoes/oportunidades', '#/s/comissoes/coordenacao', '#/s/comissoes/extratos']:
        app.go(h); app.page.wait_for_timeout(150); assert 'Algo deu errado' not in app.main(), h
    app.login('u_rec1'); app.go('#/s/comissoes'); assert 'Meta do mês' in app.main() and app.errors == []

def test_closed_month_blocks_retroactive_win(app):
    pm = app.ev("() => { const m = __V.metas.monthKey(new Date()); let [y, mo] = m.split('-').map(Number); mo--; if (!mo) { y--; mo = 12; } return y + '-' + String(mo).padStart(2, '0'); }")
    oid = app.ev(f"() => __V.fin.saveOpp({U('u_rec1')}, {{ empresa: 'Retro', contato: 'c', tipo: 'outro', servico: 'palestra' }}).id")
    assert app.ev(f"(m) => __V.fin.closeMonth({A}, m).ok", pm) is True
    before = app.ev(f"(m) => __V.fin.payStatement({A}, m, 'u_rec1').total", pm)
    r = app.ev(f"([i, m]) => __V.fin.updateOpp({A}, i, {{ status: 'ganha', valor: 1100, contratoData: m + '-01', fatRecebimento: m + '-05' }})", [oid, pm])
    assert r['ok'] is False and r['error'] == 'Mês fechado'
    assert app.ev(f"(m) => __V.fin.payStatement({A}, m, 'u_rec1').total", pm) == before
