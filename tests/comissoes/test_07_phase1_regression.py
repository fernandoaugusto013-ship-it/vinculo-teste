import json
ROUTES = ['#/s/comissoes', '#/s/comissoes/com', '#/s/comissoes/extratos', '#/s/comissoes/parametros',
          '#/s/comissoes/u_rec2', '#/s/comissoes?user=u_rec2', '#/s/comissoes/extratos?user=u_rec2']

def seed_rec2(app):
    m = app.ev("() => __V.metas.monthKey(new Date())")
    app.ev("""(m) => { const j = __V.db.jobs[0]; j.fin = { tipo:'geral', valor:7777, gupy:false, alinhamento:'2026-10-01', aprovacao:'2026-10-05', diasSuspensos:0, admissao:m+'-02', status:'fechada', garantia:null,
      fatura:{emissao:m+'-03',status:'recebida',recebimento:m+'-04'}, parts:[{userId:'u_rec2',pct:100}], originadaPor:null, origTipo:null, contratoInicio:null }; }""", m)

def test_permission_matrix(app):
    cli = app.ev("() => __V.db.users.find(u => u.role === 'client').id"); cand = app.ev("() => __V.db.users.find(u => u.role === 'candidate').id")
    for uid in ['u_admin', 'u_rec1', 'u_rec2', cli, cand]:
        app.login(uid); seed_rec2(app)
        for h in ROUTES:
            app.go(h); app.page.wait_for_timeout(100); t = app.main()
            if uid in (cli, cand): assert 'Acesso restrito' in t, (uid, h)
            elif uid == 'u_rec1':
                assert '7.777' not in t and '5.443,90' not in t and '1.088,78' not in t and 'fin-tabs' not in app.html(), (uid, h)
                if h.endswith('parametros'): assert 'Acesso restrito' in t
            elif uid == 'u_rec2':
                assert 'fin-tabs' not in app.html(), (uid, h)
                if h.endswith('parametros'): assert 'Acesso restrito' in t
                else: assert '1.088,78' in t, (uid, h)
            else: assert 'Acesso restrito' not in t, (uid, h)
    assert app.errors == []

def test_staff_routes_no_errors(app):
    for uid in ['u_admin', 'u_rec1']:
        app.login(uid)
        for h in ['#/s/dashboard', '#/s/vagas', '#/s/kanban', '#/s/triagem', '#/s/banco', '#/s/indicadores', '#/s/metas', '#/s/notificacoes', '#/s/comissoes'] + (['#/s/usuarios'] if uid == 'u_admin' else []):
            app.go(h); app.page.wait_for_timeout(120); assert 'Algo deu errado' not in app.main(), h
    assert app.errors == []

def test_client_candidate_public_untouched(app):
    cli = app.ev("() => __V.db.users.find(u => u.role === 'client').id"); cand = app.ev("() => __V.db.users.find(u => u.role === 'candidate').id")
    app.login(cli)
    for h in ['#/e/painel', '#/e/vagas']:
        app.go(h); app.page.wait_for_timeout(120); html = app.html(); assert 'fin-' not in html and 'Comiss' not in html, h
    app.login(cand)
    for h in ['#/c/candidaturas', '#/c/perfil']:
        app.go(h); app.page.wait_for_timeout(120); html = app.html(); assert 'fin-' not in html and 'Comiss' not in html, h
    app.ev("() => localStorage.removeItem('vinculo_sess')")
    for h in ['#/', '#/vagas', '#/para-empresas']:
        app.go(h); app.page.wait_for_timeout(120); assert 'fin-' not in app.html() and 'Comiss' not in app.html(), h
    assert app.errors == []

def test_old_storage_migrates(app):
    app.ev("""() => { const d = JSON.parse(localStorage.getItem('vinculo_mvp_v1')) || __V.db;
      ['payParams','opps','payAdjust','payClosings','payAlerts','payDemo'].forEach(k => delete d[k]); localStorage.setItem('vinculo_mvp_v1', JSON.stringify(d)); }""")
    app.page.reload(); app.page.wait_for_timeout(300); app.login('u_admin'); app.go('#/s/comissoes/extratos'); app.page.wait_for_timeout(200)
    assert app.ev("() => !!__V.db.payParams.current && Array.isArray(__V.db.payClosings) && Array.isArray(__V.db.payDemo.users)") is True
    assert 'R$ 586,05' in app.main() and app.errors == []

CONTRAST = """() => {
  const lum = c => { let m = c.match(/[\\d.]+/g).map(Number); if (c.startsWith('color(')) m = m.slice(0, 3).map(v => v * 255).concat(m.length > 3 ? [m[3]] : []); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return [.2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]), m.length > 3 ? m[3] : 1]; };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const a = b.match(/[\\d.]+/g); if (a && (a.length < 4 || +a[3] > .5)) return b; } return getComputedStyle(document.body).backgroundColor; };
  const bad = [];
  document.querySelectorAll('main *, .main *').forEach(el => {
    if (!el.closest('#fin-and, #fin-prev-list, .fin-list, .card, #opp-list, form[data-form=opp], .fin-env, .fin-tabs, #fin-pend, #fin-com, .fin-ex, .fin-tb, form[data-form=payParams], form[data-form=jobFin]')) return;
    if (el.closest('.badge.dot')) return; /* selo de status de vaga já existente no sistema (jobStBadge) — fora do escopo, reportado */
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own || el.offsetParent === null) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden') return;
    const [l1] = lum(cs.color), [l2] = lum(bgOf(el)); const r = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    if (r < (big ? 3 : 4.5)) bad.push(el.tagName + ' "' + el.textContent.trim().slice(0, 30) + '" ' + r.toFixed(2));
  });
  return bad; }"""

def test_contrast_light_and_dark(app):
    app.login('u_admin'); seed_rec2(app)
    for e, st in [('Alfa', 'aberta'), ('Beta', 'perdida')]:
        app.ev("([e, st]) => { const r = __V.fin.saveOpp(__V.db.users.find(x => x.id === 'u_admin'), { userId: 'u_rec1', empresa: e, contato: 'c', tipo: 'vaga_extra', servico: '' }); if (st !== 'aberta') __V.fin.updateOpp(__V.db.users.find(x => x.id === 'u_admin'), r.id, { status: st }); }", [e, st])
    jid = app.ev("() => __V.db.jobs[0].id")
    for theme in ['light', 'dark']:
        for h in ['#/s/comissoes', '#/s/comissoes/com', '#/s/comissoes/oportunidades', '#/s/comissoes/extratos', '#/s/comissoes/parametros', f'#/s/vaga/{jid}/financeiro']:
            app.go(h); app.ev(f"() => {{ document.documentElement.setAttribute('data-theme', '{theme}'); document.documentElement.style.colorScheme = '{theme}'; }}")
            app.page.wait_for_timeout(150)
            bad = app.ev(CONTRAST); assert bad == [], (theme, h, bad[:6])
