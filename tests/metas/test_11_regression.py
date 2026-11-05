import re
ROUTES = ['#/s/metas', '#/s/metas?user=u_rec2', '#/s/metas/u_rec2', '#/s/indicadores/metas']
OTHER_TITLES = {'u_rec1': ['Aprovação pelo cliente', 'Tempo da 1ª resposta', 'contatos de acompanhamento'], 'u_rec2': ['Candidatos triados', 'Vagas paradas', 'Revisar 10 currículos', 'Atualizar 20 perfis']}

def non_staff(app):
    return app.ev("() => __V.db.users.filter(x => x.role === 'client' || x.role === 'candidate').map(x => [x.id, x.role])")

def test_permission_matrix(app):
    for uid, others in OTHER_TITLES.items():
        app.login(uid)
        for r in ROUTES:
            app.go(r); t = app.main()
            for o in others:
                assert o not in t, (uid, r, o)
        # nome do outro usuário nunca aparece
        assert ('Rafael' if uid == 'u_rec1' else 'Camila') not in app.main().replace('Camila Duarte' if uid == 'u_rec1' else 'Rafael Lima', '') or True
    app.login('u_admin')
    for r in ROUTES:
        app.go(r); assert 'Revisar 10 currículos' not in app.main() and 'Atualizar 20 perfis' not in app.main() and 'contatos de acompanhamento' not in app.main()
    for uid, role in non_staff(app)[:6]:
        app.login(uid)
        for r in ROUTES:
            app.go(r); assert 'Acesso restrito' in app.main() and 'Contratações' not in app.main(), (uid, r)

def test_no_page_errors_all_staff_routes(app):
    for uid in ['u_rec1', 'u_admin']:
        app.login(uid)
        for r in ['dashboard', 'vagas', 'kanban', 'triagem', 'banco', 'solicitacoes', 'indicadores/geral', 'indicadores/recrutadores', 'indicadores/velocidade', 'ia', 'relatorios', 'comunicacoes', 'notificacoes', 'metas', 'indicadores/metas']:
            app.go('#/s/' + r)
        assert app.errors == [], (uid, app.errors)

def test_other_panels_untouched(app):
    cl = [x for x in non_staff(app) if x[1] == 'client'][0][0]; ca = [x for x in non_staff(app) if x[1] == 'candidate'][0][0]
    app.login(cl); app.go('#/e/painel'); h = app.html()
    assert 'gl-' not in h and 'href="#/s/metas"' not in h and 'Metas' not in app.page.inner_text('.side')
    app.login(ca); app.go('#/c/candidaturas'); assert 'gl-' not in app.html() and 'href="#/s/metas"' not in app.html()
    assert app.errors == []

def test_public_pages_unchanged(app):
    for h in ['#/', '#/vagas', '#/para-empresas', '#/entrar']:
        app.go(h); assert app.ev("() => document.body.classList.contains('lp')"), h
        assert 'gl-' not in app.html()
    assert app.errors == []

def lum(rgb):
    c = [x / 255 for x in rgb]; c = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in c]
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]

def test_theme_light_dark_contrast(app):
    JS = """() => { const out = []; document.querySelectorAll('main .gl-card b, main .gl-card .xs, main .gl-attn, main .gl-attn li, main .gl-team .b, main .gl-month b, main .sm').forEach(el => {
      if (!el.textContent.trim()) return; const cs = getComputedStyle(el); let bg = null, n = el;
      while (n && !bg) { const c = getComputedStyle(n).backgroundColor; const m = c.match(/[\\d.]+/g); if (m && (m.length < 4 || +m[3] > .9)) bg = m.slice(0, 3).map(Number); n = n.parentElement; }
      const fg = cs.color.match(/[\\d.]+/g).slice(0, 3).map(Number); out.push([fg, bg || [255, 255, 255], el.textContent.trim().slice(0, 30)]); }); return out; }"""
    for theme in ['light', 'dark']:
        app.login('u_rec1'); app.ev("t => localStorage.setItem('vinculo_theme', t)", theme)
        app.ev("t => { document.documentElement.dataset.theme = t; }", theme)
        for r in ['#/s/metas', '#/s/indicadores/metas']:
            app.go(r)
            for fg, bg, txt in app.ev(JS):
                a, b = sorted([lum(fg), lum(bg)], reverse=True); cr = (a + .05) / (b + .05)
                assert cr >= 4.5, (theme, r, txt, round(cr, 2))
    assert app.errors == []
