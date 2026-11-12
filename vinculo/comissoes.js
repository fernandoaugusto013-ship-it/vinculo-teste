/* Motor de cálculo de comissões e metas financeiras dos recrutadores.
   Funções puras: não leem db, DOM nem relógio. Datas 'YYYY-MM-DD' (dia local). */
(function (root) {
  'use strict';
  const C = {};
  C.defaultParams = () => ({
    impostos: 0.10, despesas: 0.20, gupy: 100, metaBase: 4200, metaAdaptacao: 2100, faixaMinima: 0.75, valorBase: 1500,
    ajudaCusto: 500, das: 86.05, origPct: 0.10, carteiraMeses: 6, clienteNovoMeses: 12, carenciaDias: 8,
    diaPagamento: 15, diaPlanilha: 5, diaConferencia: 10, toleranciaDiasUteis: 3, adaptacaoMeses: 2, alertaDias: 3,
    tabelas: {
      geral: [{ ate: 10, pct: 0.20 }, { ate: 20, pct: 0.10 }, { ate: null, pct: 0.05 }],
      contabil: [{ ate: 30, pct: 0.20 }, { ate: 40, pct: 0.10 }, { ate: null, pct: 0.05 }]
    }
  });
  const num = n => typeof n === 'number' && isFinite(n);
  C.round2 = n => { if (!num(n)) return 0; const r = Math.round((Math.abs(n) + 1e-9) * 100) / 100; return n < 0 ? -r : r; };

  /* datas */
  const RX = /^(\d{4})-(\d{2})-(\d{2})$/;
  const parse = s => { const m = RX.exec(s || ''); if (!m) return null; const y = +m[1], mo = +m[2], d = +m[3], t = Date.UTC(y, mo - 1, d), x = new Date(t); return x.getUTCFullYear() === y && x.getUTCMonth() === mo - 1 && x.getUTCDate() === d ? t : null; };
  const fmt = t => { const x = new Date(t); return x.getUTCFullYear() + '-' + String(x.getUTCMonth() + 1).padStart(2, '0') + '-' + String(x.getUTCDate()).padStart(2, '0'); };
  C.isDate = s => parse(s) !== null;
  C.diffDays = (a, b) => { const x = parse(a), y = parse(b); return x === null || y === null ? null : Math.round((y - x) / 864e5); };
  C.addDays = (d, n) => { const t = parse(d); return t === null ? null : fmt(t + n * 864e5); };
  C.addMonths = (d, n) => { const t = parse(d); if (t === null) return null; const x = new Date(t), y = x.getUTCFullYear(), m = x.getUTCMonth() + n, last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return fmt(Date.UTC(y, m, Math.min(x.getUTCDate(), last))); };
  C.monthOf = d => (d || '').slice(0, 7);
  C.nextMonth = (m, n) => { n = n === undefined ? 1 : n; const [y, mo] = m.split('-').map(Number), t = new Date(Date.UTC(y, mo - 1 + n, 1)); return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0'); };

  C.liquido = (valor, gupy, p) => { if (!num(valor) || valor <= 0) return 0; return Math.max(0, C.round2(valor * (1 - p.impostos - p.despesas) - (gupy ? p.gupy : 0))); };
  C.prazo = fin => {
    if (!fin) return null; const d = C.diffDays(fin.alinhamento, fin.aprovacao); if (d === null || d < 0) return null;
    const s = num(+fin.diasSuspensos) ? Math.max(0, +fin.diasSuspensos) : 0; return Math.max(0, d - s);
  };
  C.faixa = (tipo, prazo, p) => {
    const t = p.tabelas[tipo] || p.tabelas.geral;
    for (let i = 0; i < t.length; i++) if (t[i].ate === null || prazo <= t[i].ate) return { pct: t[i].pct, ate: t[i].ate, idx: i };
    return { pct: t[t.length - 1].pct, ate: null, idx: t.length - 1 };
  };
  C.diasParaMudar = (tipo, prazoAtual, p) => { const f = C.faixa(tipo, prazoAtual, p); return f.ate === null ? null : f.ate - prazoAtual + 1; };
  C.validateParams = p => {
    const e = [], pctKeys = ['impostos', 'despesas', 'faixaMinima', 'origPct'], valKeys = ['gupy', 'metaBase', 'metaAdaptacao', 'valorBase', 'ajudaCusto', 'das', 'carteiraMeses', 'clienteNovoMeses', 'carenciaDias', 'diaPagamento', 'diaPlanilha', 'diaConferencia', 'toleranciaDiasUteis', 'adaptacaoMeses', 'alertaDias'];
    pctKeys.forEach(k => { if (!num(p[k]) || p[k] < 0 || p[k] > 1) e.push(`"${k}" deve ser um percentual entre 0% e 100%.`); });
    valKeys.forEach(k => { if (!num(p[k]) || p[k] < 0) e.push(`"${k}" deve ser um número maior ou igual a zero.`); });
    if (num(p.impostos) && num(p.despesas) && p.impostos + p.despesas >= 1) e.push('Impostos e despesas somados devem ficar abaixo de 100%.');
    ['geral', 'contabil'].forEach(tp => {
      const t = p.tabelas && p.tabelas[tp];
      if (!Array.isArray(t) || t.length < 1 || t[t.length - 1].ate !== null) return e.push(`A tabela "${tp}" precisa terminar com uma faixa sem limite ("acima de").`);
      let prev = -1;
      t.forEach((r, i) => { if (!num(r.pct) || r.pct < 0 || r.pct > 1) e.push(`Tabela "${tp}", faixa ${i + 1}: percentual inválido.`); if (i < t.length - 1) { if (!num(r.ate) || r.ate <= prev) e.push(`Tabela "${tp}": os limites de dias devem ser crescentes.`); prev = num(r.ate) ? r.ate : prev; } });
    });
    return { ok: e.length === 0, errors: e };
  };

  /* ---- vagas, comissão, originação, meta e extrato ---- */
  const EXCL = ['reposicao', 'cancelada', 'congelada'];
  const finOk = f => !!f && num(+f.valor) && +f.valor > 0 && EXCL.indexOf(f.status) < 0;
  const refDate = f => (f && (f.admissao || f.contratoInicio)) || null;
  const partOf = (fin, userId) => { const ps = fin.parts || []; const x = ps.find(q => q.userId === userId); return x ? +x.pct : null; };
  const partsOk = fin => { const ps = fin.parts; if (!Array.isArray(ps) || !ps.length) return false; return Math.abs(ps.reduce((a, q) => a + (+q.pct || 0), 0) - 100) < 0.001; };
  C.competencia = (fin, p) => {
    if (!fin || !fin.fatura || fin.fatura.status !== 'recebida' || !C.isDate(fin.fatura.recebimento)) return null;
    const ref = refDate(fin); if (!C.isDate(ref)) return null;
    const lib = C.addDays(ref, p.carenciaDias), rec = fin.fatura.recebimento;
    return C.monthOf(rec > lib ? rec : lib);
  };
  C.comissaoVaga = (job, userId, p) => {
    const f = job && job.fin, no = motivo => ({ ok: false, motivo, liquido: 0, prazo: null, pct: 0, valor: 0 });
    if (!f) return no('sem financeiro'); if (EXCL.indexOf(f.status) >= 0) return no('status');
    if (!num(+f.valor) || +f.valor <= 0) return no('dados incompletos');
    if (!partsOk(f)) return no('participação');
    const part = partOf(f, userId); if (part === null) return no('não participa');
    const pr = C.prazo(f); if (pr === null) return no('dados incompletos');
    const liq = C.liquido(+f.valor, f.gupy, p), fx = C.faixa(f.tipo, pr, p);
    return { ok: true, liquido: liq, prazo: pr, pct: fx.pct, valor: C.round2(liq * fx.pct * part / 100) };
  };
  const carteiraOk = (f, p) => f.origTipo !== 'cliente_novo' || (C.isDate(f.contratoInicio) && C.isDate(f.fatura && f.fatura.recebimento) && f.fatura.recebimento <= C.addMonths(f.contratoInicio, p.carteiraMeses));
  C.originacao = (jobs, userId, p) => jobs.filter(j => j.fin && finOk(j.fin) && j.fin.originadaPor === userId && j.fin.origTipo && carteiraOk(j.fin, p)).map(j => {
    const base = C.liquido(+j.fin.valor, j.fin.gupy, p);
    return { jobId: j.id, tipo: j.fin.origTipo, base, valor: C.round2(base * p.origPct), competencia: C.competencia(j.fin, p), ref: refDate(j.fin) };
  });
  C.valorBase = (pct, p) => !num(pct) || pct < p.faixaMinima ? 0 : pct >= 1 ? p.valorBase : C.round2(p.valorBase * pct);
  C.metaDoMes = (month, user, jobs, p) => {
    const ini = C.monthOf(user.startDate || ''), meta = ini && month >= ini && month < C.nextMonth(ini, p.adaptacaoMeses) ? p.metaAdaptacao : p.metaBase;
    const seen = {}; let real = 0;
    jobs.forEach(j => { const f = j.fin; if (!f || !finOk(f) || seen[j.id]) return;
      const ref = refDate(f); if (!C.isDate(ref) || C.monthOf(ref) !== month) return;
      const part = partsOk(f) ? partOf(f, user.id) : null;
      if (part !== null) { seen[j.id] = 1; real += C.liquido(+f.valor, f.gupy, p) * part / 100; }
      else if (f.originadaPor === user.id && f.origTipo && carteiraOk(f, p)) { seen[j.id] = 1; real += C.liquido(+f.valor, f.gupy, p); }
    });
    real = C.round2(real); return { meta, realizado: real, pct: meta > 0 ? Math.round(real / meta * 10000) / 10000 : 0 };
  };
  C.extrato = (month, user, jobs, ajustes, p) => {
    const linhas = [], previstas = [], name = j => (j.cliente || '—') + ' — ' + (j.cargo || '—');
    (jobs || []).forEach(j => { const c = C.comissaoVaga(j, user.id, p); if (!c.ok) return; const comp = C.competencia(j.fin, p);
      if (comp === month) linhas.push({ jobId: j.id, tipo: 'comissao', descricao: name(j), valor: c.valor });
      else if (comp === null || comp > month) previstas.push({ jobId: j.id, tipo: 'comissao', valor: c.valor }); });
    C.originacao(jobs || [], user.id, p).forEach(o => { const j = jobs.find(x => x.id === o.jobId);
      if (o.competencia === month) linhas.push({ jobId: o.jobId, tipo: 'originacao', descricao: 'Originação (' + o.tipo.replace('_', ' ') + ') — ' + name(j), valor: o.valor });
      else if (o.competencia === null || o.competencia > month) previstas.push({ jobId: o.jobId, tipo: 'originacao', valor: o.valor }); });
    (ajustes || []).filter(a => a.userId === user.id && a.month === month).forEach(a => linhas.push({ jobId: null, tipo: 'ajuste', descricao: a.motivo || 'Ajuste', valor: C.round2(+a.valor) }));
    const meta = C.metaDoMes(month, user, jobs || [], p), vb = C.valorBase(meta.pct, p);
    const total = C.round2(p.ajudaCusto + p.das + vb + linhas.reduce((a, l) => a + l.valor, 0));
    return { month, pagamentoEm: C.nextMonth(month) + '-' + String(p.diaPagamento).padStart(2, '0'), ajudaCusto: p.ajudaCusto, das: p.das, valorBase: vb, meta, linhas, previstas, total };
  };
  root.Comissoes = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
