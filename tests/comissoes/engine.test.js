const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../../vinculo/comissoes.js'), p = C.defaultParams();

test('defaultParams segue a spec', () => {
  assert.deepEqual([p.impostos, p.despesas, p.gupy, p.metaBase, p.metaAdaptacao, p.faixaMinima, p.valorBase, p.ajudaCusto, p.das, p.origPct, p.carteiraMeses, p.clienteNovoMeses, p.carenciaDias, p.diaPagamento, p.adaptacaoMeses, p.alertaDias],
    [.1, .2, 100, 4200, 2100, .75, 1500, 500, 86.05, .1, 6, 12, 8, 15, 2, 3]);
  assert.deepEqual(p.tabelas.geral, [{ ate: 10, pct: .2 }, { ate: 20, pct: .1 }, { ate: null, pct: .05 }]);
  assert.deepEqual(p.tabelas.contabil, [{ ate: 30, pct: .2 }, { ate: 40, pct: .1 }, { ate: null, pct: .05 }]);
});
test('liquido', () => {
  assert.equal(C.liquido(1320, false, p), 924); assert.equal(C.liquido(1800, true, p), 1160);
  assert.equal(C.liquido(0, false, p), 0); assert.equal(C.liquido(100, true, p), 0);
});
test('round2 meio centavo para cima', () => {
  assert.equal(C.round2(0.005), 0.01); assert.equal(C.round2(1.005), 1.01); assert.equal(C.round2(2.675), 2.68); assert.equal(C.round2(-0.005), -0.01);
});
test('faixa e limites', () => {
  for (const [n, pct] of [[0, .2], [10, .2], [11, .1], [20, .1], [21, .05], [999, .05]]) assert.equal(C.faixa('geral', n, p).pct, pct, 'geral ' + n);
  for (const [n, pct] of [[30, .2], [31, .1], [40, .1], [41, .05]]) assert.equal(C.faixa('contabil', n, p).pct, pct, 'contabil ' + n);
});
test('prazo', () => {
  const f = (a, b, s) => C.prazo({ alinhamento: a, aprovacao: b, diasSuspensos: s });
  assert.equal(f('2026-12-01', '2026-12-11', 0), 10); assert.equal(f('2026-12-01', '2026-12-11', 3), 7);
  assert.equal(f('2026-12-11', '2026-12-01', 0), null); assert.equal(f('', '2026-12-01', 0), null); assert.equal(f('2026-02-30', '2026-03-05', 0), null);
  assert.equal(f('2026-12-01', '2026-12-03', 9), 0);
});
test('diasParaMudar', () => {
  assert.equal(C.diasParaMudar('geral', 8, p), 3); assert.equal(C.diasParaMudar('geral', 10, p), 1);
  assert.equal(C.diasParaMudar('geral', 25, p), null); assert.equal(C.diasParaMudar('contabil', 28, p), 3);
});
test('validateParams', () => {
  assert.equal(C.validateParams(p).ok, true);
  const bad = (m) => { const q = JSON.parse(JSON.stringify(p)); m(q); return C.validateParams(q); };
  assert.equal(bad(q => q.impostos = 1.5).ok, false); assert.equal(bad(q => q.despesas = -.1).ok, false); assert.equal(bad(q => q.metaBase = -1).ok, false);
  assert.equal(bad(q => q.tabelas.geral = [{ ate: 20, pct: .2 }, { ate: 10, pct: .1 }, { ate: null, pct: .05 }]).ok, false);
  assert.equal(bad(q => q.tabelas.geral = [{ ate: 10, pct: .2 }]).ok, false);
  assert.ok(bad(q => q.impostos = 1.5).errors[0].length > 5);
});
test('datas', () => {
  assert.equal(C.addMonths('2026-01-31', 1), '2026-02-28'); assert.equal(C.addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(C.nextMonth('2026-12'), '2027-01'); assert.equal(C.diffDays('2026-12-31', '2027-01-02'), 2); assert.equal(C.monthOf('2026-12-31'), '2026-12'); assert.equal(C.addDays('2026-12-28', 8), '2027-01-05');
});
