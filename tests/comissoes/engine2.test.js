const test = require('node:test'), assert = require('node:assert/strict');
const C = require('../../vinculo/comissoes.js'), p = C.defaultParams(), M = '2026-12';
let n = 0;
function vaga(o) { // o: {valor, prazo, gupy, tipo, user, parts, orig, origTipo, status, fat, cliente, contrato}
  const prazo = o.prazo === undefined ? 10 : o.prazo; n++;
  return { id: 'j' + n, cliente: o.cliente || 'Cli' + n, cargo: 'Cargo' + n, fin: {
    tipo: o.tipo || 'geral', parts: o.parts || [{ userId: o.user || 'u1', pct: 100 }], valor: o.valor, gupy: !!o.gupy,
    alinhamento: '2026-11-01', aprovacao: C.addDays('2026-11-01', prazo), diasSuspensos: 0, admissao: o.adm || '2026-12-10',
    status: o.status || 'fechada', garantia: 30, fatura: o.fat || { emissao: '2026-12-05', status: 'recebida', recebimento: '2026-12-12' },
    originadaPor: o.orig || null, origTipo: o.origTipo || null, contratoInicio: o.contrato || null } };
}
const U = { id: 'u1', startDate: '2025-01-10' };
const mk = (list) => list.flatMap(([q, o]) => Array.from({ length: q }, () => vaga(o)));
const soma = (ex, t) => C.round2(ex.linhas.filter(l => l.tipo === t).reduce((a, l) => a + l.valor, 0));

test('Caso 1 — meta atingida', () => {
  const jobs = mk([[3, { valor: 1320, prazo: 15 }], [2, { valor: 1800, gupy: true, prazo: 8 }]]);
  const ex = C.extrato(M, U, jobs, [], p);
  assert.equal(ex.meta.realizado, 5092); assert.equal(soma(ex, 'comissao'), 741.2); assert.equal(ex.valorBase, 1500); assert.equal(ex.total, 2827.25);
  assert.equal(ex.pagamentoEm, '2027-01-15');
});
test('Caso 2 — crescimento com originação', () => {
  const jobs = mk([[4, { valor: 1320, prazo: 8 }], [2, { valor: 1800, gupy: true, prazo: 15 }], [2, { valor: 2500, gupy: true, prazo: 25, tipo: 'contabil' }],
    [2, { valor: 1320, user: 'u9', orig: 'u1', origTipo: 'cliente_novo', contrato: '2026-12-01', cliente: 'Novo SA' }]]);
  jobs.push({ id: 'palestra', cliente: 'Y', cargo: 'Palestra', fin: { origTipo: 'outro', valor: 1100, gupy: false, originadaPor: 'u1', contratoInicio: '2026-12-01', fatura: { emissao: '2026-12-05', status: 'recebida', recebimento: '2026-12-12' }, status: 'fechada' } });
  const ex = C.extrato(M, U, jobs, [], p);
  assert.equal(soma(ex, 'comissao'), 1631.2); assert.equal(soma(ex, 'originacao'), 261.8); assert.equal(ex.total, 3979.05);
  const conduzidas = jobs.filter(j => j.fin.parts && j.fin.parts[0].userId === 'u1').reduce((a, j) => a + C.liquido(j.fin.valor, j.fin.gupy, p), 0);
  assert.equal(C.round2(conduzidas), 9316);
});
test('Caso 3 — abaixo da meta', () => {
  const ex = C.extrato(M, U, mk([[3, { valor: 1320, prazo: 15 }]]), [], p);
  assert.equal(ex.meta.realizado, 2772); assert.equal(ex.meta.pct, 0.66); assert.equal(soma(ex, 'comissao'), 277.2); assert.equal(ex.valorBase, 0); assert.equal(ex.total, 863.25);
});
test('sem vagas: só ajuda de custo e DAS', () => {
  const ex = C.extrato(M, U, [], [], p); assert.equal(ex.total, 586.05); assert.equal(ex.valorBase, 0); assert.ok(Object.values(ex.meta).every(Number.isFinite));
});
test('valorBase', () => {
  for (const [x, v] of [[0.7499, 0], [0.75, 1125], [0.9999, 1499.85], [1, 1500], [1.8, 1500], [0, 0]]) assert.equal(C.valorBase(x, p), v, String(x));
});
test('participação 50/50 e soma inválida', () => {
  const j = vaga({ valor: 1320, prazo: 5, parts: [{ userId: 'u1', pct: 50 }, { userId: 'u2', pct: 50 }] });
  assert.equal(C.comissaoVaga(j, 'u1', p).valor, 92.4); assert.equal(C.comissaoVaga(j, 'u2', p).valor, 92.4);
  assert.equal(C.extrato(M, U, [j], [], p).meta.realizado, 462);
  const bad = vaga({ valor: 1320, parts: [{ userId: 'u1', pct: 60 }, { userId: 'u2', pct: 60 }] });
  const r = C.comissaoVaga(bad, 'u1', p); assert.equal(r.ok, false); assert.equal(r.motivo, 'participação');
  assert.equal(C.comissaoVaga(j, 'u7', p).ok, false);
});
test('status reposição/cancelada/congelada fora de comissão e meta', () => {
  for (const s of ['reposicao', 'cancelada', 'congelada']) { const ex = C.extrato(M, U, [vaga({ valor: 1320, status: s })], [], p); assert.equal(ex.meta.realizado, 0); assert.equal(ex.linhas.length, 0); }
});
test('fatura em aberto: prevista, não liberada', () => {
  const j = vaga({ valor: 1320, fat: { emissao: '2026-12-05', status: 'aberta', recebimento: null } });
  assert.equal(C.competencia(j.fin, p), null);
  const ex = C.extrato(M, U, [j], [], p); assert.equal(ex.linhas.length, 0); assert.equal(ex.previstas.length, 1); assert.equal(ex.previstas[0].valor, 184.8);
});
test('carência e virada de ano', () => {
  const j = vaga({ valor: 1320, adm: '2026-12-28', fat: { emissao: '2026-12-20', status: 'recebida', recebimento: '2026-12-30' } });
  assert.equal(C.competencia(j.fin, p), '2027-01');
  assert.equal(C.extrato('2027-01', U, [j], [], p).pagamentoEm, '2027-02-15'); assert.equal(C.extrato('2026-12', U, [j], [], p).pagamentoEm, '2027-01-15');
  assert.equal(C.extrato('2026-12', U, [j], [], p).linhas.length, 0); assert.equal(C.extrato('2027-01', U, [j], [], p).linhas.length, 1);
});
test('meta de adaptação', () => {
  const u = { id: 'u1', startDate: '2026-12-10' };
  assert.equal(C.metaDoMes('2026-12', u, [], p).meta, 2100); assert.equal(C.metaDoMes('2027-01', u, [], p).meta, 2100); assert.equal(C.metaDoMes('2027-02', u, [], p).meta, 4200);
});
test('mesmo recrutador vendeu e conduziu: meta uma vez, duas comissões', () => {
  const j = vaga({ valor: 1320, prazo: 5, orig: 'u1', origTipo: 'vaga_extra', contrato: '2026-12-01' });
  const ex = C.extrato(M, U, [j], [], p);
  assert.equal(ex.meta.realizado, 924); assert.equal(soma(ex, 'comissao'), 184.8); assert.equal(soma(ex, 'originacao'), 92.4);
});
test('ajustes entram no total', () => {
  const ex = C.extrato(M, U, [], [{ userId: 'u1', month: M, valor: -50, motivo: 'a' }, { userId: 'u1', month: M, valor: 30, motivo: 'b' }, { userId: 'u2', month: M, valor: 999, motivo: 'c' }], p);
  assert.equal(ex.total, 566.05); assert.equal(ex.linhas.filter(l => l.tipo === 'ajuste').length, 2);
});
test('parâmetros mudam o resultado', () => {
  const jobs = mk([[3, { valor: 1320, prazo: 15 }]]), q = { ...p, metaBase: 3000 };
  assert.equal(C.extrato(M, U, jobs, [], q).valorBase, 1386); assert.equal(C.extrato(M, U, jobs, [], { ...p, faixaMinima: 0.5 }).valorBase, 990);
});
test('cliente novo fora da carteira de 6 meses não gera originação', () => {
  const j = vaga({ valor: 1320, user: 'u9', orig: 'u1', origTipo: 'cliente_novo', contrato: '2026-05-01' });
  assert.equal(C.originacao([j], 'u1', p).length, 0);
  assert.equal(C.originacao([vaga({ valor: 1320, user: 'u9', orig: 'u1', origTipo: 'cliente_novo', contrato: '2026-07-01' })], 'u1', p).length, 1);
});
test('dados ruins não geram NaN', () => {
  const j = { id: 'x', cliente: 'c', cargo: 'k', fin: { tipo: 'geral', parts: [{ userId: 'u1', pct: 100 }], valor: 'abc', alinhamento: '', aprovacao: 'x', status: 'fechada' } };
  const ex = C.extrato(M, U, [j, { id: 'y', cliente: 'c', cargo: 'k', fin: null }], [], p);
  assert.equal(ex.total, 586.05); assert.equal(C.comissaoVaga(j, 'u1', p).ok, false);
});
test('carência atravessando o ano: admissão 28/12 → competência janeiro, pagamento 15/02', () => {
  const f = { valor: 1320, gupy: false, tipo: 'geral', alinhamento: '2026-12-01', aprovacao: '2026-12-05', diasSuspensos: 0, admissao: '2026-12-28', status: 'fechada',
    fatura: { emissao: '2026-12-29', status: 'recebida', recebimento: '2026-12-30' }, parts: [{ userId: 'u1', pct: 100 }] };
  assert.equal(C.competencia(f, p), '2027-01');
  const ex = C.extrato('2027-01', U, [{ id: 'x', cliente: 'A', cargo: 'B', fin: f }], [], p);
  assert.equal(ex.linhas.length, 1); assert.equal(ex.pagamentoEm, '2027-02-15');
  assert.equal(C.extrato('2026-12', U, [{ id: 'x', cliente: 'A', cargo: 'B', fin: f }], [], p).linhas.length, 0);
});
test('cliente novo: vaga faturada antes do início do contrato não gera originação', () => {
  const f = { valor: 1320, gupy: false, tipo: 'geral', alinhamento: '2026-01-01', aprovacao: '2026-01-05', diasSuspensos: 0, admissao: '2026-01-06', status: 'fechada',
    fatura: { emissao: '2026-01-07', status: 'recebida', recebimento: '2026-01-10' }, parts: [{ userId: 'u9', pct: 100 }], originadaPor: 'u1', origTipo: 'cliente_novo', contratoInicio: '2026-03-01' };
  assert.equal(C.originacao([{ id: 'x', fin: f }], 'u1', p).length, 0);
  assert.equal(C.originacao([{ id: 'y', fin: Object.assign({}, f, { fatura: { emissao: '2026-03-05', status: 'recebida', recebimento: '2026-03-10' } }) }], 'u1', p).length, 1);
});
