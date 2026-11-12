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
  root.Comissoes = C;
  if (typeof module !== 'undefined' && module.exports) module.exports = C;
})(typeof window !== 'undefined' ? window : globalThis);
