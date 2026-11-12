U = lambda i: f"__V.db.users.find(x => x.id === '{i}')"
SETUP = """([who, other]) => {
  const p2 = n => String(n).padStart(2, '0'), d = k => { const t = new Date(); t.setDate(t.getDate() + k); return t.getFullYear() + '-' + p2(t.getMonth() + 1) + '-' + p2(t.getDate()); };
  const m = __V.metas.monthKey(new Date()), J = __V.db.jobs;
  const base = (x) => Object.assign({ tipo: 'geral', valor: 1320, gupy: false, alinhamento: null, aprovacao: null, diasSuspensos: 0, admissao: null, status: 'aberta', garantia: null,
    fatura: { emissao: null, status: 'aberta', recebimento: null }, parts: [{ userId: who, pct: 100 }], originadaPor: null, origTipo: null, contratoInicio: null }, x);
  J[0].fin = base({ alinhamento: d(-5) });
  J[1].fin = base({ alinhamento: m + '-01', aprovacao: m + '-02', admissao: m + '-02', status: 'fechada', fatura: { emissao: m + '-03', status: 'recebida', recebimento: m + '-04' } });
  J[2].fin = base({ valor: 1800, gupy: true, alinhamento: m + '-01', aprovacao: m + '-02', admissao: m + '-03', status: 'fechada' });
  J[3].fin = base({ alinhamento: d(-3), valor: 9999, parts: [{ userId: other, pct: 100 }] });
  return [J[0].title, J[3].title]; }"""

def test_panel_recruiter(app):
    app.login('u_rec1'); t0, t3 = app.ev(SETUP, ['u_rec1', 'u_rec2']); app.go('#/s/comissoes'); t = app.main()
    assert 'Meta do mês' in t and 'Meta de adaptação' not in t and app.page.locator('.fin-bar').count() == 1
    assert 'R$ 2.084,00' in t and '50%' in t
    assert 'Vagas em andamento' in t and t0 in t and 'Muda de faixa em 6 dias' in t and 'R$ 184,80' in t and 'R$ 92,40' in t
    assert t3 not in app.page.inner_text('#fin-and') and '9.999' not in t
    assert 'Liberadas neste mês' in t and 'Previstas' in t and 'R$ 232,00' in app.page.inner_text('#fin-prev-list')
    assert app.page.locator('[name=payUser]').count() == 0 and 'NaN' not in t and app.errors == []

def test_adaptation_label(app):
    app.login('u_rec1'); app.ev(SETUP, ['u_rec1', 'u_rec2'])
    app.ev("() => { const m = __V.metas.monthKey(new Date()); __V.db.users.find(x => x.id === 'u_rec1').startDate = m + '-01'; }")
    app.go('#/s/comissoes'); t = app.main(); assert 'Meta de adaptação' in t and 'R$ 2.100,00' in t

def test_empty_state(app):
    app.login('u_rec2'); app.go('#/s/comissoes'); t = app.main()
    assert 'Nenhuma vaga em andamento' in t and '0%' in t and 'NaN' not in t and 'Infinity' not in t and app.errors == []

def test_admin_sees_any_recruiter_panel(app):
    app.login('u_admin'); t0, t3 = app.ev(SETUP, ['u_rec1', 'u_rec2']); app.go('#/s/comissoes/extratos')
    app.page.select_option('[name=payUser]', 'u_rec2'); app.page.wait_for_timeout(150)
    assert t3 in app.page.inner_text('#fin-and') and t0 not in app.page.inner_text('#fin-and')
    app.page.select_option('[name=payUser]', 'u_rec1'); app.page.wait_for_timeout(150)
    assert t0 in app.page.inner_text('#fin-and') and 'Meta do mês' in app.main() and app.errors == []

def test_recruiter_tabs(app):
    app.login('u_rec1'); app.go('#/s/comissoes')
    labels = [x.strip() for x in app.page.eval_on_selector_all('.fin-rtabs a', 'els => els.map(e => e.textContent)')]
    assert labels == ['Meu painel', 'Meu extrato', 'Minhas oportunidades']
    app.go('#/s/comissoes/extrato'); assert 'Ajuda de custo' in app.main() and 'Vagas em andamento' not in app.main()
