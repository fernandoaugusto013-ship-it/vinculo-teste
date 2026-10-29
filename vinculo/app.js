(() => {
'use strict';
/* =====================================================================
   VÍNCULO — MVP de recrutamento e banco de talentos
   Arquitetura em camadas (tudo no navegador, pronto para trocar por backend):
   1. Utilidades
   2. Domínio (constantes, regras)
   3. Persistência  -> trocar por API + banco (Postgres/Supabase)
   4. Serviços mock -> Auth, Mailer, WhatsApp, Calendar, FileStore, AI, Billing
   5. Seed de demonstração
   6. Views  7. Ações  8. Roteador
   ===================================================================== */

/* ---------- 1. Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + Math.random().toString(36).slice(2, 9);
const nowISO = () => new Date().toISOString();
const dAgo = n => new Date(Date.now() - n * 864e5).toISOString();
const dAhead = (n, h = 10) => { const d = new Date(Date.now() + n * 864e5); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const brl = n => (n === '' || n == null || isNaN(n)) ? '—' : 'R$ ' + Number(n).toLocaleString('pt-BR');
const fdate = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fdt = d => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const ago = d => { const n = Math.floor((Date.now() - new Date(d)) / 864e5); return n <= 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`; };
const strip = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const initials = n => String(n).split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const hue = s => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const avatar = (name, size) => `<span class="av" style="--h:${hue(name)}${size ? `;width:${size}px;height:${size}px;font-size:${Math.round(size * .38)}px` : ''}">${esc(initials(name))}</span>`;
const uniq = a => [...new Set(a)];
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const IC = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2 .6 3.5 2.5 3.5 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/>',
  board: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  bell: '<path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  out: '<path d="M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  right: '<path d="M9 5l7 7-7 7"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  edit: '<path d="M4 20l1-4L16 5l3 3L8 19z"/>',
  dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1 3h6l1-3h5"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.4"/>',
  kanban: '<rect x="3" y="4" width="5" height="16" rx="1.2"/><rect x="9.5" y="4" width="5" height="10" rx="1.2"/><rect x="16" y="4" width="5" height="13" rx="1.2"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16v-5M13 16V8M18 16v-8"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>',
  refresh: '<path d="M20 11a8 8 0 00-14-4L4 9M4 4v5h5M4 13a8 8 0 0014 4l2-2M20 20v-5h-5"/>'
};
const Theme = {
  mem: null, key: 'vinculo_theme',
  get() { let v = null; try { v = localStorage.getItem(this.key); } catch (e) { } v = v || this.mem; return v === 'light' || v === 'dark' ? v : 'auto'; },
  eff() { const t = this.get(); if (t !== 'auto') return t; return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; },
  apply() { const r = document.documentElement, t = this.get(); if (t === 'auto') { r.removeAttribute('data-theme'); r.style.colorScheme = ''; } else { r.setAttribute('data-theme', t); r.style.colorScheme = t; } },
  set(v) { this.mem = v === 'auto' ? null : v; try { v === 'auto' ? localStorage.removeItem(this.key) : localStorage.setItem(this.key, v); } catch (e) { } this.apply(); }
};
Theme.apply();
const ico = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ''}</svg>`;
const LOGO = `<svg viewBox="0 0 34 24" width="34" height="24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" fill="none" stroke="var(--pri)" stroke-width="3.2"/><circle cx="22" cy="12" r="8.2" fill="none" stroke="var(--sun)" stroke-width="3.2"/></svg>`;

/* ---------- 2. Domínio ---------- */
const STAGES = [
  { id: 'novo', name: 'Novos candidatos', short: 'Novo', c: '#3A6FD8' },
  { id: 'triagem', name: 'Triagem', short: 'Triagem', c: '#7A5BD0' },
  { id: 'entrevista_rh', name: 'Entrevista RH', short: 'Entrevista RH', c: '#D98A0B' },
  { id: 'entrevista_cliente', name: 'Entrevista cliente', short: 'Entrevista cliente', c: '#C4487D' },
  { id: 'aprovado', name: 'Aprovado', short: 'Aprovado', c: '#2E9E5B' },
  { id: 'contratado', name: 'Contratado', short: 'Contratado', c: '#0E8080' },
  { id: 'reprovado', name: 'Reprovado', short: 'Reprovado', c: '#D8493E' },
  { id: 'desistiu', name: 'Desistiu', short: 'Desistiu', c: '#7B8794' }
];
const ST = Object.fromEntries(STAGES.map(s => [s.id, s]));
const REASONS = {
  reprovado: ['Perfil técnico incompatível', 'Pretensão salarial acima da faixa', 'Perfil comportamental', 'Reprovado pelo cliente', 'Requisito obrigatório não atendido', 'Outro motivo'],
  desistiu: ['Salário abaixo da pretensão', 'Sem retorno / não compareceu', 'Modelo de trabalho (presencial/híbrido)', 'Aceitou outra proposta', 'Motivos pessoais ou familiares', 'Distância / localização', 'Outro motivo']
};

const SIDE = ['reprovado', 'desistiu'];
const CLOSED = ['reprovado', 'desistiu', 'contratado'];
const NEXT = { novo: 'triagem', triagem: 'entrevista_rh', entrevista_rh: 'entrevista_cliente', entrevista_cliente: 'aprovado', aprovado: 'contratado' };
const CAND_LABEL = { novo: 'Candidatura enviada', triagem: 'Em análise', entrevista_rh: 'Entrevista com RH', entrevista_cliente: 'Entrevista com a empresa', aprovado: 'Aprovado(a)', contratado: 'Contratado(a)', reprovado: 'Processo encerrado', desistiu: 'Processo encerrado' };
const CAND_HINT = {
  novo: 'Recebemos sua candidatura. Em breve nossa equipe fará a primeira análise.',
  triagem: 'Nosso time está analisando seu perfil em relação à vaga.',
  entrevista_rh: 'Você foi selecionado(a) para conversar com o RH. Fique atento(a) ao horário combinado.',
  entrevista_cliente: 'Seu perfil foi encaminhado à empresa, que vai conversar com você.',
  aprovado: 'Você foi aprovado(a)! Nossa equipe entrará em contato com os próximos passos.',
  contratado: 'Parabéns pela contratação! Seu perfil segue no banco de talentos se você autorizar contatos futuros.',
  reprovado: 'Neste momento seguiremos com outros perfis. Seu cadastro continua no banco de talentos para novas oportunidades.',
  desistiu: 'Registramos sua desistência neste processo. Seu cadastro continua ativo no banco de talentos.'
};
const CAND_MSG = {
  novo: 'Recebemos sua candidatura para {job}.', triagem: 'Você avançou para a Triagem na vaga {job}.',
  entrevista_rh: 'Você avançou para a Entrevista com o RH ({job}).', entrevista_cliente: 'Você avançou para a entrevista com a empresa ({job}).',
  aprovado: 'Boas notícias! Você foi aprovado(a) em {job}.', contratado: 'Parabéns! Você foi contratado(a) para {job}.',
  reprovado: 'Seu processo seletivo para {job} foi encerrado.', desistiu: 'Registramos sua desistência em {job}.'
};
const UF = ['AL', 'BA', 'CE', 'DF', 'MA', 'MG', 'PB', 'PE', 'PI', 'RJ', 'RN', 'SE', 'SP'];
const MODES = ['Presencial', 'Híbrido', 'Remoto'];
const CONTRACTS = ['CLT', 'PJ', 'Estágio', 'Temporário', 'Freelancer'];
const AVAIL = ['Imediata', '15 dias', '30 dias', '60 dias'];
const EDU = ['Ensino médio', 'Técnico', 'Graduação', 'Pós-graduação', 'Mestrado/Doutorado'];
const LVL = ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo'];
const LANGS = ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Libras', 'Português'];
const TAGS = ['Boa comunicação', 'Perfil comercial', 'Liderança', 'Disponibilidade imediata', 'Experiência em indústria', 'Perfil analítico', 'Proativo', 'Potencial de crescimento'];
const AREAS = {
  'Recursos Humanos': { titles: ['Analista de RH', 'Assistente de RH', 'Analista de Recrutamento e Seleção', 'Business Partner de RH'], skills: ['Recrutamento e seleção', 'Legislação trabalhista', 'Folha de pagamento', 'Treinamento e desenvolvimento', 'Excel', 'Departamento pessoal', 'Entrevista por competências'], base: 2600, courses: ['Psicologia', 'Administração', 'Gestão de Recursos Humanos'], certs: ['Certificação eSocial', 'Pós em Gestão de Pessoas'], desc: ['Condução de processos seletivos completos, da abertura da vaga ao onboarding.', 'Apoio às rotinas de departamento pessoal e acompanhamento de indicadores de RH.', 'Aplicação de entrevistas por competências e testes comportamentais.'] },
  'Comercial': { titles: ['Executivo Comercial', 'Vendedor Interno', 'Gerente Comercial', 'Analista Comercial', 'Coordenador Comercial'], skills: ['Vendas B2B', 'CRM', 'Negociação', 'Prospecção', 'Excel', 'Gestão de carteira', 'Gestão de equipe'], base: 2800, courses: ['Administração', 'Marketing', 'Gestão Comercial'], certs: ['Negociação Estratégica', 'SPIN Selling'], desc: ['Prospecção ativa e gestão de carteira de clientes corporativos.', 'Condução de negociações e fechamento de contratos recorrentes.', 'Acompanhamento de metas e pipeline de vendas no CRM.'] },
  'Administrativo': { titles: ['Assistente Administrativo', 'Analista Administrativo', 'Auxiliar Administrativo'], skills: ['Excel', 'Rotinas administrativas', 'Atendimento', 'Organização', 'Contas a pagar', 'Pacote Office'], base: 1900, courses: ['Administração', 'Gestão Financeira', 'Secretariado'], certs: ['Excel Avançado'], desc: ['Controle de documentos, contratos e agenda da diretoria.', 'Apoio às rotinas financeiras e emissão de relatórios.', 'Atendimento a fornecedores e organização de arquivos.'] },
  'Tecnologia': { titles: ['Desenvolvedor Full Stack', 'Analista de Suporte', 'Analista de Dados', 'Analista de QA'], skills: ['JavaScript', 'React', 'SQL', 'Node.js', 'Python', 'Git', 'APIs REST'], base: 3800, courses: ['Ciência da Computação', 'Sistemas de Informação', 'Análise e Desenvolvimento de Sistemas'], certs: ['AWS Cloud Practitioner', 'Scrum Foundation'], desc: ['Desenvolvimento de funcionalidades web e integrações via API.', 'Manutenção de banco de dados e melhoria de desempenho.', 'Participação em cerimônias ágeis e revisão de código.'] },
  'Financeiro': { titles: ['Analista Financeiro', 'Assistente Financeiro', 'Analista Contábil'], skills: ['Excel', 'Fluxo de caixa', 'Conciliação bancária', 'ERP', 'Contas a receber', 'Contabilidade'], base: 2900, courses: ['Ciências Contábeis', 'Administração', 'Economia'], certs: ['CPC-20', 'Excel para finanças'], desc: ['Fechamento mensal, conciliações e projeção de fluxo de caixa.', 'Controle de contas a pagar e a receber no ERP.', 'Elaboração de relatórios gerenciais para a diretoria.'] },
  'Logística': { titles: ['Analista de Logística', 'Supervisor de Operações', 'Assistente de Logística'], skills: ['WMS', 'Gestão de estoque', 'Indicadores', 'Excel', 'Transporte', 'Lean'], base: 2700, courses: ['Logística', 'Engenharia de Produção', 'Administração'], certs: ['Lean Six Sigma Yellow Belt'], desc: ['Gestão de estoque, inventários cíclicos e acuracidade.', 'Roteirização e acompanhamento de indicadores de entrega.', 'Coordenação de equipe de expedição e recebimento.'] },
  'Marketing': { titles: ['Analista de Marketing', 'Social Media', 'Designer Gráfico'], skills: ['Google Analytics', 'SEO', 'Redes sociais', 'Copywriting', 'Canva', 'Photoshop'], base: 2500, courses: ['Publicidade e Propaganda', 'Marketing', 'Design'], certs: ['Google Analytics 4', 'Meta Blueprint'], desc: ['Planejamento de conteúdo e gestão de redes sociais.', 'Análise de métricas de campanhas e relatórios de resultado.', 'Produção de peças gráficas e apoio a eventos.'] },
  'Atendimento': { titles: ['Atendente', 'Recepcionista', 'Analista de Atendimento', 'Operador de SAC'], skills: ['Atendimento', 'Organização', 'CRM', 'Comunicação', 'Excel', 'Resolução de conflitos'], base: 1700, courses: ['Administração', 'Gestão Comercial'], certs: ['Atendimento ao cliente'], desc: ['Recepção e triagem de clientes presencialmente e por telefone.', 'Registro de chamados e acompanhamento de pendências.'] }
};
const AREA_LIST = Object.keys(AREAS);
const ALL_SKILLS = uniq(Object.values(AREAS).flatMap(a => a.skills)).sort();
const STAFF_ROLES = ['admin', 'recruiter'];
const ROLE_NAME = { admin: 'Administrador', recruiter: 'Recrutador', client: 'Empresa cliente', candidate: 'Candidato' };

/* ---------- 3. Persistência (trocar por API/banco real) ---------- */
let db = null;
const Persist = {
  key: 'vinculo_mvp_v1', mem: null,
  load() { try { const r = localStorage.getItem(this.key); if (r) return JSON.parse(r); } catch (e) { } return this.mem; },
  save(d) { this.mem = d; try { localStorage.setItem(this.key, JSON.stringify(d)); } catch (e) { } },
  clear() { this.mem = null; try { localStorage.removeItem(this.key); localStorage.removeItem('vinculo_sess'); } catch (e) { } }
};
const save = () => Persist.save(db);
const by = (t, id) => db[t].find(x => x.id === id);

/* ---------- 4. Serviços (mocks substituíveis) ---------- */
const Sess = { mem: null, get() { try { return localStorage.getItem('vinculo_sess') || this.mem; } catch (e) { return this.mem; } }, set(v) { this.mem = v; try { v ? localStorage.setItem('vinculo_sess', v) : localStorage.removeItem('vinculo_sess'); } catch (e) { } } };
// Auth: MOCK. Produção -> provedor real (Supabase Auth/Auth0), senha com hash, sessões e 2FA.
const Auth = {
  login(email, pass) { const u = db.users.find(x => x.email.toLowerCase() === String(email).trim().toLowerCase() && x.pass === pass && x.active !== false); if (u) Sess.set(u.id); return u; },
  logout() { Sess.set(null); },
  user() { const id = Sess.get(); return id && db ? by('users', id) || null : null; }
};
// Mailer/WhatsApp: MOCK. Produção -> SendGrid/Resend e API oficial do WhatsApp Business.
const Mailer = { send(to, subject, body) { db.outbox.unshift({ id: uid('m'), channel: 'email', to, subject, body, date: nowISO() }); db.outbox.length = Math.min(db.outbox.length, 200); } };
const WhatsApp = { send(to, body) { db.outbox.unshift({ id: uid('m'), channel: 'whatsapp', to, subject: 'Mensagem de WhatsApp', body, date: nowISO() }); } };
// Calendar: MOCK. Produção -> Google Calendar / Microsoft Graph (gerar evento + link de reunião).
const Calendar = { schedule(app, when, type) { return { id: uid('ev'), date: when, type, link: type === 'Online' ? 'https://meet.exemplo.demo/' + uid('') : '' }; } };
// FileStore: MOCK (guarda só metadados). Produção -> S3/Supabase Storage com URL assinada.
const FileStore = { put(file) { return file ? { name: file.name, size: file.size || 0, date: nowISO() } : null; } };
// Billing: MOCK. Produção -> Stripe/Asaas para cobrança das empresas clientes.
const Billing = { plan: 'Piloto gratuito', invoices: [] };

const hasSkill = (c, sk) => {
  const k = strip(sk);
  return c.skills.some(s => strip(s) === k) || strip((c.title || '') + ' ' + c.exps.map(e => e.role + ' ' + e.desc).join(' ')).includes(k);
};
const ymNum = s => { const [y, m] = s.split('-').map(Number); return y * 12 + (m - 1); };
function candYears(c) {
  const n = new Date(), cur = n.getFullYear() * 12 + n.getMonth(); let m = 0;
  (c.exps || []).forEach(e => { if (!e.from) return; const f = ymNum(e.from), t = e.to ? ymNum(e.to) : cur; m += Math.max(0, t - f); });
  return Math.round(m / 12 * 10) / 10;
}
const yTxt = y => y < 1 ? `${Math.round(y * 12)} meses` : `${Math.floor(y)} ${Math.floor(y) === 1 ? 'ano' : 'anos'}`;
const eduRank = c => Math.max(-1, ...(c.education || []).map(e => EDU.indexOf(e.level)));
const langLvl = (c, l) => { const x = (c.languages || []).find(y => y.lang === l); return x ? LVL.indexOf(x.level) : -1; };
const koFails = (a, job) => (job.screening || []).filter(q => q.ko && q.type === 'yn' && a.answers && a.answers[q.id] !== q.expected);

// IA: MOCK determinístico. Produção -> trocar `provider` por chamada à API do Claude/OpenAI no backend.
const AI = {
  provider: 'mock',
  parseResume(fileName) {
    const h = [...fileName].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const area = AREA_LIST[h % AREA_LIST.length], A = AREAS[area], years = 2 + h % 7;
    const n = new Date(), ym = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const e1 = new Date(n); e1.setMonth(e1.getMonth() - Math.round(years * 6)); const e2 = new Date(e1); e2.setMonth(e2.getMonth() - Math.round(years * 6));
    const level = EDU[2 + h % 2];
    const eng = LVL[h % 3];
    return {
      area, title: A.titles[h % A.titles.length], years,
      skills: A.skills.slice(0, 4 + h % 2),
      languages: [{ lang: 'Português', level: 'Nativo' }, { lang: 'Inglês', level: eng }],
      education: [{ level, course: A.courses[h % A.courses.length], inst: ['UFPE', 'UNICAP', 'UPE', 'Estácio'][h % 4], year: String(n.getFullYear() - years - 2) }],
      exps: [
        { role: A.titles[h % A.titles.length], company: 'Empresa atual (extraída)', from: ym(e1), to: '', desc: A.desc[0] },
        { role: A.titles[(h + 1) % A.titles.length], company: 'Empresa anterior (extraída)', from: ym(e2), to: ym(e1), desc: A.desc[1 % A.desc.length] }
      ],
      certs: A.certs.slice(0, 1)
    };
  },
  compare(c, j) {
    let s = 0; const met = [], check = [];
    const yrs = candYears(c);
    if (!j.minExp || yrs >= j.minExp) { s += 30; met.push(`${yTxt(yrs)} de experiência (mínimo: ${j.minExp || 0})`); }
    else { s += Math.round(30 * yrs / j.minExp); check.push(`Experiência de ${yTxt(yrs)}, abaixo do mínimo de ${j.minExp} anos`); }
    const have = (j.skills || []).filter(k => hasSkill(c, k)), miss = (j.skills || []).filter(k => !have.includes(k));
    s += (j.skills || []).length ? Math.round(30 * have.length / j.skills.length) : 30;
    have.forEach(k => met.push(k)); if (miss.length) check.push('Sem menção a: ' + miss.join(', '));
    if (j.degree) { if (eduRank(c) >= 2) { s += 10; met.push('Ensino superior'); } else check.push('Ensino superior não identificado'); } else s += 10;
    if (j.lang && j.lang.name) {
      const need = LVL.indexOf(j.lang.level), got = langLvl(c, j.lang.name);
      if (got >= need && got >= 0) { s += 10; met.push(`${j.lang.name} ${LVL[got].toLowerCase()}`); }
      else if (got >= 0) check.push(`${j.lang.name} em nível ${LVL[got].toLowerCase()} (desejado: ${j.lang.level.toLowerCase()})`);
      else check.push(`${j.lang.name} não informado`);
    } else s += 10;
    if (!c.salary) { s += 5; check.push('Pretensão salarial não informada'); }
    else if (!j.salMax || c.salary <= j.salMax) { s += 10; met.push('Pretensão dentro da faixa'); }
    else check.push(`Pretensão salarial acima da faixa (${brl(c.salary)} × teto ${brl(j.salMax)})`);
    if (j.mode === 'Remoto') { s += 10; met.push('Vaga remota'); }
    else if (c.city === j.city) { s += 10; met.push(`Reside em ${c.city}`); }
    else check.push(`Reside em ${c.city}/${c.state}; vaga em ${j.city}/${j.state} (${j.mode.toLowerCase()})`);
    return { score: Math.max(0, Math.min(100, s)), met, check };
  }
};

/* ---------- 5. Seed de demonstração ---------- */
function seedDB() {
  const R = rng(11);
  const pick = a => a[Math.floor(R() * a.length)], int = (a, b) => a + Math.floor(R() * (b - a + 1)), chance = p => R() < p;
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const d = { users: [], companies: [], jobs: [], cands: [], apps: [], evals: [], notifs: [], outbox: [], invites: [], requests: [], delReqs: [], audit: [], ver: 1, cargos: defaultCargos() };
  const ym = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  const slug = s => strip(s).replace(/[^a-z0-9]+/g, '');

  d.companies = [
    { id: 'co1', name: 'Grupo Maré Alimentos', cnpj: '11222333000181', phone: '8133334444', sector: 'Indústria de alimentos', city: 'Jaboatão dos Guararapes', state: 'PE', contact: 'Sônia Maré', email: 'empresa@grupomare.demo' },
    { id: 'co2', name: 'Atlântico Distribuidora', cnpj: '45012036000123', phone: '8134445555', sector: 'Distribuição e logística', city: 'Recife', state: 'PE', contact: 'Paulo Atlântico', email: 'rh@atlantico.demo' },
    { id: 'co3', name: 'NordesteTech Soluções', cnpj: '78345678000101', phone: '8135556666', sector: 'Tecnologia', city: 'Recife', state: 'PE', contact: 'Ana Beltrão', email: 'talentos@nordestetech.demo' },
    { id: 'co4', name: 'Casa Vértice Engenharia', cnpj: '90567123000100', phone: '7132227777', sector: 'Construção civil', city: 'Salvador', state: 'BA', contact: 'Marcos Vértice', email: 'rh@casavertice.demo' },
    { id: 'co5', name: 'Clínica Bem Viver', cnpj: '12654987000147', phone: '8532228888', sector: 'Saúde', city: 'Fortaleza', state: 'CE', contact: 'Lívia Torres', email: 'gestao@bemviver.demo' }
  ];
  d.users.push(
    { id: 'u_admin', role: 'admin', name: 'Helena Prado', email: 'admin@vinculo.demo', pass: 'demo123', active: true },
    { id: 'u_rec1', role: 'recruiter', name: 'Camila Duarte', email: 'recrutador@vinculo.demo', pass: 'demo123', active: true },
    { id: 'u_rec2', role: 'recruiter', name: 'Rafael Lima', email: 'rafael@vinculo.demo', pass: 'demo123', active: true }
  );
  d.companies.forEach(c => d.users.push({ id: 'u_' + c.id, role: 'client', name: c.contact, email: c.email, pass: 'demo123', companyId: c.id, active: true }));

  // Vagas
  const benPool = ['Vale-refeição', 'Plano de saúde', 'Vale-transporte', 'Plano odontológico', 'Bônus por metas', 'Home office parcial', 'Gympass', 'Seguro de vida'];
  const SQ = (q, type, expected, ko) => ({ id: uid('q'), q, type, expected: expected || '', ko: !!ko });
  const mkJob = (id, co, title, area, city, state, mode, salMin, salMax, contract, minExp, degree, skills, lang, rec, status, pub, deadline, screening, qty) => {
    const A = AREAS[area], comp = d.companies.find(x => x.id === co);
    return {
      id, companyId: co, title, area, city, state, mode, salMin, salMax, contract, minExp, degree, skills, lang, recruiterId: rec, status, qty: qty || 1,
      pubDate: pub == null ? null : dAgo(pub), deadline: deadline == null ? '' : dAhead(deadline).slice(0, 10),
      desc: `${comp.name} busca ${title} para fortalecer o time de ${area.toLowerCase()} em ${city}. Você atuará em contato direto com a liderança, com autonomia para propor melhorias e acompanhar resultados.`,
      resp: A.desc.concat(['Registrar informações e indicadores no sistema da empresa.']),
      reqMand: [`Experiência mínima de ${minExp} ${minExp === 1 ? 'ano' : 'anos'} na área`, ...(degree ? ['Ensino superior completo ou em andamento'] : ['Ensino médio completo']), ...skills.slice(0, 3)],
      reqDesir: A.certs.concat(lang ? [`${lang.name} ${lang.level.toLowerCase()}`] : ['Boa comunicação escrita']),
      benefits: shuffle(benPool).slice(0, 4), screening: screening || []
    };
  };
  const genQ = (minExp, local, rem) => [SQ(`Você possui experiência mínima de ${minExp} anos na área?`, 'yn', 'Sim', true), SQ('Você já utilizou as ferramentas citadas nos requisitos?', 'yn', 'Sim', false), ...(rem ? [] : [SQ(`Você tem disponibilidade para trabalhar presencialmente em ${local}?`, 'yn', 'Sim', true)]), SQ('Qual sua pretensão salarial?', 'number')];
  d.jobs = [
    mkJob('j1', 'co1', 'Analista de RH', 'Recursos Humanos', 'Recife', 'PE', 'Híbrido', 4500, 6000, 'CLT', 2, true, ['Recrutamento e seleção', 'Legislação trabalhista', 'Excel'], { name: 'Inglês', level: 'Intermediário' }, 'u_rec1', 'open', 14, 20, [SQ('Você possui experiência mínima de 2 anos em recrutamento e seleção?', 'yn', 'Sim', true), SQ('Você possui conhecimento em legislação trabalhista (CLT)?', 'yn', 'Sim', false), SQ('Você possui disponibilidade para trabalhar presencialmente em Recife?', 'yn', 'Sim', true), SQ('Qual sua pretensão salarial?', 'number')]),
    mkJob('j2', 'co2', 'Executivo Comercial', 'Comercial', 'Recife', 'PE', 'Presencial', 3500, 5500, 'CLT', 2, false, ['Vendas B2B', 'CRM', 'Negociação'], null, 'u_rec1', 'open', 9, 25, [SQ('Você possui experiência mínima de 2 anos com vendas B2B?', 'yn', 'Sim', true), SQ('Você possui conhecimento em CRM?', 'yn', 'Sim', false), SQ('Você possui CNH B?', 'yn', 'Sim', true), SQ('Qual sua pretensão salarial?', 'number')], 2),
    mkJob('j3', 'co2', 'Gerente Comercial', 'Comercial', 'Recife', 'PE', 'Presencial', 9000, 13000, 'CLT', 5, true, ['Vendas B2B', 'Gestão de carteira', 'Gestão de equipe', 'CRM'], { name: 'Inglês', level: 'Intermediário' }, 'u_rec1', 'open', 21, 15, [SQ('Você possui 5 anos ou mais de experiência comercial?', 'yn', 'Sim', true), SQ('Já liderou equipes de vendas com 5 ou mais pessoas?', 'yn', 'Sim', true), SQ('Tem disponibilidade para viagens?', 'yn', 'Sim', false), SQ('Qual sua pretensão salarial?', 'number')]),
    mkJob('j4', 'co4', 'Assistente Administrativo', 'Administrativo', 'Salvador', 'BA', 'Presencial', 2200, 2800, 'CLT', 1, false, ['Excel', 'Rotinas administrativas', 'Atendimento'], null, 'u_rec2', 'open', 6, 12, genQ(1, 'Salvador')),
    mkJob('j5', 'co3', 'Desenvolvedor Full Stack', 'Tecnologia', 'Recife', 'PE', 'Remoto', 8000, 12000, 'PJ', 3, false, ['JavaScript', 'React', 'SQL', 'Node.js'], { name: 'Inglês', level: 'Intermediário' }, 'u_rec2', 'open', 18, 30, genQ(3, 'Recife', true)),
    mkJob('j6', 'co1', 'Analista Financeiro', 'Financeiro', 'Jaboatão dos Guararapes', 'PE', 'Híbrido', 5000, 6500, 'CLT', 3, true, ['Excel', 'Fluxo de caixa', 'Conciliação bancária', 'ERP'], null, 'u_rec1', 'open', 11, 18, genQ(3, 'Jaboatão dos Guararapes')),
    mkJob('j7', 'co2', 'Analista de Logística', 'Logística', 'Recife', 'PE', 'Presencial', 3800, 5000, 'CLT', 2, false, ['WMS', 'Gestão de estoque', 'Indicadores', 'Excel'], null, 'u_rec2', 'open', 4, 22, genQ(2, 'Recife')),
    mkJob('j8', 'co3', 'Analista de Marketing', 'Marketing', 'Recife', 'PE', 'Híbrido', 4000, 5500, 'CLT', 2, true, ['Google Analytics', 'SEO', 'Redes sociais'], null, 'u_rec2', 'open', 2, 28, genQ(2, 'Recife')),
    mkJob('j9', 'co5', 'Recepcionista', 'Atendimento', 'Fortaleza', 'CE', 'Presencial', 1800, 2200, 'CLT', 1, false, ['Atendimento', 'Organização'], null, 'u_rec2', 'closed', 50, -10, genQ(1, 'Fortaleza')),
    mkJob('j10', 'co5', 'Assistente Financeiro', 'Financeiro', 'Fortaleza', 'CE', 'Presencial', 2600, 3200, 'CLT', 1, false, ['Excel', 'Contas a receber'], null, 'u_rec2', 'paused', 30, 10, genQ(1, 'Fortaleza'))
  ];

  // Candidatos
  const FIRST = ['Lucas', 'Beatriz', 'Rafael', 'Juliana', 'Thiago', 'Camila', 'Gabriel', 'Larissa', 'Mateus', 'Amanda', 'Felipe', 'Renata', 'Bruno', 'Patrícia', 'Diego', 'Fernanda', 'Eduardo', 'Carolina', 'André', 'Natália', 'Rodrigo', 'Bianca', 'Leonardo', 'Vanessa', 'Gustavo', 'Aline', 'Pedro', 'Tatiane', 'Henrique', 'Isabela', 'Caio', 'Priscila', 'Vinícius', 'Débora', 'Ricardo', 'Mariana', 'João', 'Letícia', 'Samuel'];
  const LAST = ['Souza', 'Lima', 'Oliveira', 'Santos', 'Pereira', 'Albuquerque', 'Carvalho', 'Ferreira', 'Barbosa', 'Cavalcanti', 'Machado', 'Ribeiro', 'Moura', 'Nascimento', 'Freitas', 'Araújo', 'Campos', 'Teixeira', 'Monteiro', 'Vasconcelos', 'Rocha', 'Mendes', 'Barros', 'Gomes', 'Correia'];
  const CITIES = [['Recife', 'PE'], ['Recife', 'PE'], ['Recife', 'PE'], ['Recife', 'PE'], ['Olinda', 'PE'], ['Jaboatão dos Guararapes', 'PE'], ['Caruaru', 'PE'], ['Salvador', 'BA'], ['Fortaleza', 'CE'], ['São Paulo', 'SP'], ['Natal', 'RN'], ['João Pessoa', 'PB']];
  const EMPR = ['Grupo Ibirapitanga', 'Distribuidora Capibaribe', 'Supermercados Boa Viagem', 'Indústria Rio Doce', 'Construtora Horizonte', 'Banco Litoral', 'Loja Mundo Novo', 'Hospital Santa Rita', 'Agência Pixel', 'Transportes Sertão'];
  const INST = ['UFPE', 'UNICAP', 'UFRPE', 'UPE', 'Estácio', 'UNINASSAU', 'FBV', 'UFBA', 'UNIFOR'];
  const areaPlan = [...Array(5).fill('Recursos Humanos'), ...Array(8).fill('Comercial'), ...Array(5).fill('Administrativo'), ...Array(5).fill('Tecnologia'), ...Array(5).fill('Financeiro'), ...Array(5).fill('Logística'), ...Array(4).fill('Marketing'), ...Array(2).fill('Atendimento')];
  const mkExps = (A, title, years, employed) => {
    const exps = []; let end = new Date(); if (!employed) end.setMonth(end.getMonth() - int(1, 4));
    const n = years < 1.5 ? 1 : years < 4 ? 2 : 3; let rem = Math.max(6, Math.round(years * 12));
    for (let k = 0; k < n; k++) {
      const dur = k === n - 1 ? Math.max(rem, 6) : Math.max(6, Math.round(rem / (n - k) * (0.7 + R() * 0.6)));
      const from = new Date(end); from.setMonth(from.getMonth() - dur);
      exps.push({ role: k === 0 ? title : pick(A.titles), company: pick(EMPR), from: ym(from), to: k === 0 && employed ? '' : ym(end), desc: A.desc[k % A.desc.length] });
      end = new Date(from); end.setMonth(end.getMonth() - 1); rem -= dur;
    }
    return exps;
  };
  const mkCand = (i, spec = {}) => {
    const area = spec.area || areaPlan[i], A = AREAS[area], [city, state] = spec.city || pick(CITIES);
    const fn = spec.first || FIRST[i % FIRST.length], ln = spec.last || (pick(LAST) + (chance(.4) ? ' ' + pick(LAST) : ''));
    const name = `${fn} ${ln}`, years = spec.years ?? Math.round((chance(.15) ? R() * 1.4 : 1.5 + R() * 10) * 2) / 2;
    const title = spec.title || pick(A.titles);
    const lv = R(); const eduLevel = lv < .1 ? 0 : lv < .2 ? 1 : lv < .72 ? 2 : lv < .93 ? 3 : 4;
    const yr = new Date().getFullYear() - Math.round(years) - int(1, 4);
    const education = spec.education || [{ level: EDU[eduLevel], course: eduLevel === 0 ? 'Ensino médio regular' : pick(A.courses), inst: eduLevel === 0 ? 'Colégio estadual' : pick(INST), year: String(yr) }];
    const eng = R(); const languages = spec.languages || [{ lang: 'Português', level: 'Nativo' }, ...(eng < .2 ? [] : [{ lang: 'Inglês', level: eng < .4 ? 'Básico' : eng < .7 ? 'Intermediário' : eng < .9 ? 'Avançado' : 'Fluente' }]), ...(chance(.15) ? [{ lang: 'Espanhol', level: 'Básico' }] : [])];
    const skills = spec.skills || shuffle(A.skills).slice(0, int(4, 5));
    const salary = spec.salary || Math.round((A.base + years * 480 + R() * 700) / 100) * 100;
    const modes = spec.modes || shuffle(MODES).slice(0, int(1, 3));
    const email = strip(fn) + '.' + strip(ln.split(' ')[0]) + '@email.demo';
    return {
      id: 'ca' + (spec.id || i), name, email: spec.email || email, phone: `(${state === 'PE' ? 81 : 71}) 9${int(8000, 9999)}-${int(1000, 9999)}`,
      city, state, birth: `${int(1980, 2003)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      linkedin: chance(.7) ? 'https://linkedin.com/in/' + slug(name) : '', portfolio: area === 'Tecnologia' || area === 'Marketing' ? 'https://' + slug(fn) + '.dev' : '',
      title, area, salary, avail: spec.avail || pick(['Imediata', 'Imediata', '15 dias', '30 dias', '30 dias', '60 dias']), modes,
      travel: pick(['Sim', 'Não', 'Sim']), education, courses: chance(.6) ? A.certs.slice(0, 1) : [], languages, skills,
      exps: spec.exps || mkExps(A, title, years, chance(.8)),
      summary: spec.summary || `${title} com cerca de ${Math.round(years)} anos de experiência em ${area.toLowerCase()}. Perfil com foco em ${skills.slice(0, 2).join(' e ').toLowerCase()}, comprometido com resultados e trabalho em equipe.`,
      resume: chance(.9) ? { name: `curriculo_${slug(fn)}_${slug(ln.split(' ')[0])}.pdf`, size: int(90, 420) * 1024, date: dAgo(int(5, 200)) } : null,
      tags: spec.tags || (chance(.4) ? shuffle(TAGS).slice(0, int(1, 2)) : []), notes: '', pastHistory: spec.pastHistory || [],
      consent: { terms: true, storage: true, marketing: chance(.7), date: dAgo(int(10, 220)), version: '1.0' },
      createdAt: dAgo(int(2, 150)), deleted: false
    };
  };
  const marina = mkCand(0, {
    id: 'marina', first: 'Marina', last: 'Souza', email: 'marina.souza@email.demo', area: 'Recursos Humanos', title: 'Analista de RH Jr.', city: ['Recife', 'PE'], years: 3.2, salary: 4800, avail: 'Imediata', modes: ['Híbrido', 'Remoto'],
    skills: ['Recrutamento e seleção', 'Legislação trabalhista', 'Excel', 'Entrevista por competências', 'Departamento pessoal'],
    education: [{ level: 'Graduação', course: 'Psicologia', inst: 'UNICAP', year: '2022' }],
    languages: [{ lang: 'Português', level: 'Nativo' }, { lang: 'Inglês', level: 'Intermediário' }],
    summary: 'Analista de RH com mais de 3 anos de experiência em recrutamento e seleção para operações comerciais e industriais. Gosto de estruturar processos claros e de oferecer uma boa experiência ao candidato.',
    tags: ['Boa comunicação']
  });
  marina.phone = '(81) 98877-1234'; marina.linkedin = 'https://linkedin.com/in/marina-souza-rh'; marina.courses = ['Certificação eSocial'];
  marina.exps = [{ role: 'Analista de RH Jr.', company: 'Supermercados Boa Viagem', from: ym(new Date(Date.now() - 20 * 30 * 864e5)), to: '', desc: 'Condução de processos seletivos para lojas e centro de distribuição; apoio ao departamento pessoal.' }, { role: 'Assistente de RH', company: 'Agência Pixel', from: ym(new Date(Date.now() - 44 * 30 * 864e5)), to: ym(new Date(Date.now() - 21 * 30 * 864e5)), desc: 'Triagem de currículos, agendamento de entrevistas e onboarding.' }];
  const cands = [marina];
  for (let i = 1; i < 40; i++) cands.push(mkCand(i, { area: areaPlan[i - 1] }));
  // histórico anterior de exemplo (Banco de Talentos reutilizável)
  const bruno = cands.find(c => c.area === 'Comercial');
  bruno.name = 'Bruno Carvalho'; bruno.email = 'bruno.carvalho@email.demo'; bruno.city = 'Recife'; bruno.state = 'PE'; bruno.tags = ['Perfil comercial', 'Liderança'];
  bruno.pastHistory = [
    { job: 'Analista Comercial', company: 'Atlântico Distribuidora', date: '2026-08-15T12:00:00.000Z', result: 'Não avançou após entrevista' },
    { job: 'Coordenador Comercial', company: 'Grupo Maré Alimentos', date: '2026-05-04T12:00:00.000Z', result: 'Contratado' }
  ];
  d.cands = cands;
  cands.forEach(c => d.users.push({ id: 'u_' + c.id, role: 'candidate', name: c.name, email: c.email, pass: 'demo123', candId: c.id, active: true }));

  // Candidaturas
  const answersFor = (job, c, ok) => { const a = {}; job.screening.forEach(q => { a[q.id] = q.type === 'yn' ? (ok || chance(.86) ? q.expected : (q.expected === 'Sim' ? 'Não' : 'Sim')) : q.type === 'number' ? String(c.salary) : 'Tenho interesse na oportunidade.'; }); return a; };
  const PATH = ['novo', 'triagem', 'entrevista_rh', 'entrevista_cliente', 'aprovado', 'contratado'];
  const mkApp = (job, c, stage, daysOld, ok) => {
    const date = new Date(Date.now() - daysOld * 864e5);
    let path; if (stage === 'reprovado' || stage === 'desistiu') { path = PATH.slice(0, int(1, 4)).concat(stage); } else path = PATH.slice(0, PATH.indexOf(stage) + 1);
    const history = path.map((s, k) => ({ stage: s, date: new Date(Math.min(Date.now() - 3600e3, date.getTime() + k * int(1, 3) * 864e5)).toISOString(), by: k === 0 ? c.name : (job.recruiterId === 'u_rec2' ? 'Rafael Lima' : 'Camila Duarte') }));
    const a = { id: uid('ap'), jobId: job.id, candId: c.id, date: date.toISOString(), stage, answers: answersFor(job, c, ok), salary: c.salary, avail: c.avail, note: '', history, forwarded: path.includes('entrevista_cliente'), clientDecision: null, clientFeedback: [], interview: null, hiredDate: null };
    if (['aprovado', 'contratado'].includes(stage)) a.clientDecision = 'advance';
    if (stage === 'contratado') a.hiredDate = history[history.length - 1].date;
    if (stage === 'reprovado' || stage === 'desistiu') { const hi = (c.salary || 0) > (job.salMax || 1e9); a.reason = pick(stage === 'desistiu' ? (hi ? ['Salário abaixo da pretensão', 'Salário abaixo da pretensão', 'Sem retorno / não compareceu'] : ['Sem retorno / não compareceu', 'Aceitou outra proposta', 'Motivos pessoais ou familiares', 'Modelo de trabalho (presencial/híbrido)']) : (hi ? ['Pretensão salarial acima da faixa'] : ['Perfil técnico incompatível', 'Reprovado pelo cliente', 'Perfil comportamental'])); }
    if (stage === 'entrevista_rh') a.interview = { date: dAhead(int(1, 6), int(9, 16)), type: pick(['Online', 'Presencial']) };
    if (stage === 'entrevista_cliente') a.interview = { date: dAhead(int(2, 8), int(9, 16)), type: pick(['Online', 'Presencial']) };
    d.apps.push(a); return a;
  };
  const cyc = ['novo', 'novo', 'triagem', 'entrevista_rh', 'novo', 'entrevista_cliente', 'triagem', 'aprovado', 'reprovado', 'novo', 'contratado', 'desistiu', 'triagem', 'entrevista_rh'];
  d.jobs.filter(j => j.status !== 'draft').forEach((job, ji) => {
    const pool = shuffle(cands.filter(c => c.area === job.area && c.id !== 'camarina'));
    const others = shuffle(cands.filter(c => c.area !== job.area)).slice(0, 3);
    const cap = job.status === 'closed' ? 6 : 10;
    pool.concat(others).filter(c => c.id !== marina.id).slice(0, cap).forEach((c, k) => {
      const stage = job.status === 'closed' ? (k === 0 ? 'contratado' : pick(['reprovado', 'desistiu', 'reprovado'])) : cyc[(k + ji) % cyc.length];
      mkApp(job, c, stage, int(1, 52));
    });
  });
  // Marina: 3 candidaturas em estágios distintos
  const a1 = mkApp(d.jobs[0], marina, 'entrevista_rh', 9, true); a1.interview = { date: dAhead(2, 14), type: 'Online' };
  mkApp(d.jobs[3], marina, 'triagem', 4, true);
  mkApp(d.jobs[8], marina, 'reprovado', 45, true);
  const bapp = mkApp(d.jobs[1], bruno, 'triagem', 3, true);

  // Avaliações internas de exemplo
  d.apps.filter(a => ['entrevista_rh', 'entrevista_cliente', 'aprovado', 'contratado'].includes(a.stage)).forEach((a, k) => {
    if (k % 2) return; const c = cands.find(x => x.id === a.candId), job = d.jobs.find(x => x.id === a.jobId);
    d.evals.push({ id: uid('ev'), candId: c.id, appId: a.id, jobId: job.id, by: job.recruiterId === 'u_rec2' ? 'Rafael Lima' : 'Camila Duarte', date: dAgo(int(1, 20)), pos: 'Comunicação clara, boa aderência técnica e postura profissional.', attn: pick(['Pretensão no limite superior da faixa.', 'Pouca experiência com a ferramenta principal.', 'Disponibilidade sujeita a aviso prévio.']), salary: c.salary, avail: c.avail, notes: 'Entrevista conduzida por vídeo. Candidato(a) demonstrou interesse real pela vaga.', tech: int(3, 5), behav: int(3, 5), tags: c.tags.slice(0, 2) });
  });

  // Notificações
  const N = (userId, text, link, days, read) => d.notifs.push({ id: uid('n'), userId, text, link, date: dAgo(days), read: !!read });
  N('u_camarina', 'Recebemos sua candidatura para Analista de RH.', '/c/candidaturas', 9, true);
  N('u_camarina', 'Você avançou para a Entrevista com o RH (Analista de RH).', '/c/candidaturas', 5);
  N('u_camarina', 'Sua entrevista foi agendada para os próximos dias (Analista de RH).', '/c/candidaturas', 4);
  N('u_camarina', 'Seu processo seletivo para Recepcionista foi encerrado.', '/c/candidaturas', 30, true);
  N('u_rec1', 'Novo candidato para a vaga Analista de RH.', '/s/vaga/j1', 1);
  N('u_rec1', 'Novo candidato para a vaga Executivo Comercial.', '/s/vaga/j2', 2);
  N('u_rec1', 'Candidato respondeu à entrevista: confirmação recebida.', '/s/vaga/j1', 3, true);
  N('u_co1', '3 novos candidatos foram encaminhados para sua vaga Analista de RH.', '/e/vaga/j1', 2);
  N('u_co2', 'Um novo candidato foi encaminhado para a vaga Gerente Comercial.', '/e/vaga/j3', 3);
  d.requests.push({ id: 'rq1', companyId: 'co3', title: 'Analista de Suporte N2', area: 'Tecnologia', qty: 2, city: 'Recife', mode: 'Híbrido', salary: '4500 a 6000', notes: 'Atendimento a clientes corporativos, escala 8h às 17h.', date: dAgo(2), status: 'nova' });
  return d;
}

/* ---------- 6. Estado de UI e helpers de tela ---------- */
const ui = { jobs: {}, tb: { limit: 18 }, tri: { stage: 'novo' }, boardq: '', cmp: {}, side: false };
const curUser = () => Auth.user();
const isStaff = u => !!u && STAFF_ROLES.includes(u.role);
const homeOf = u => !u ? '/' : u.role === 'candidate' ? '/c/candidaturas' : u.role === 'client' ? '/e/painel' : '/s/dashboard';
const candOf = u => u && u.candId ? by('cands', u.candId) : null;
const compName = id => { const c = by('companies', id); return c ? c.name : '—'; };
const stageBadge = id => `<span class="badge dot" style="--c:${ST[id].c}">${ST[id].short}</span>`;
const salRange = j => (j.salMin || j.salMax) ? `${brl(j.salMin)} a ${brl(j.salMax)}` : 'A combinar';
const jobApps = id => db.apps.filter(a => a.jobId === id);
const candApps = id => db.apps.filter(a => a.candId === id);
const candUser = c => db.users.find(u => u.candId === c.id);
const pendingDel = id => db.delReqs.some(r => r.candId === id && r.status === 'pendente');
const clientsOf = co => db.users.filter(u => u.role === 'client' && u.companyId === co);
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ymTxt = s => { if (!s) return ''; const [y, m] = s.split('-'); return `${MONTHS[+m - 1]}/${y}`; };
const ul = a => a && a.length ? `<ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="mut">Não informado.</p>';
const chipsView = a => a && a.length ? `<div class="flex wrap" style="gap:6px">${a.map(x => `<span class="chip plain">${esc(x)}</span>`).join('')}</div>` : '<span class="mut">—</span>';
const opts = (arr, val, ph) => (ph != null ? `<option value="">${esc(ph)}</option>` : '') + arr.map(o => { const v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return `<option value="${esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${esc(l)}</option>`; }).join('');
const sel = (name, arr, val, ph, attrs = '') => `<select name="${name}" ${attrs}>${opts(arr, val, ph)}</select>`;
const fld = (label, inner, hint) => `<label class="field"><span>${label}${hint ? ` <small>${hint}</small>` : ''}</span>${inner}</label>`;
const inp = (name, val, o = {}) => `<input name="${name}" type="${o.type || 'text'}" value="${esc(val ?? '')}" ${o.req ? 'required' : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.attrs || ''}>`;

function audit(action, ref) {
  const u = curUser(), who = u ? `${u.name} (${ROLE_NAME[u.role]})` : '—', l = db.audit[0];
  if (l && l.user === who && l.action === action && l.ref === ref && Date.now() - new Date(l.date) < 60000) return;
  db.audit.unshift({ id: uid('au'), user: who, action, ref, date: nowISO() }); db.audit.length = Math.min(db.audit.length, 150); save();
}
function notify(userId, text, link) {
  if (!userId) return; db.notifs.unshift({ id: uid('n'), userId, text, link: link || '', date: nowISO(), read: false });
  const u = by('users', userId); if (u) Mailer.send(u.email, text.length > 60 ? text.slice(0, 57) + '…' : text, text);
}
const unreadOf = u => u ? db.notifs.filter(n => n.userId === u.id && !n.read).length : 0;

function completeness(c) {
  const it = [['Telefone/WhatsApp', !!c.phone, 5], ['Cidade e estado', !!(c.city && c.state), 5], ['Data de nascimento', !!c.birth, 4], ['Cargo atual', !!c.title, 7], ['Área profissional', !!c.area, 6], ['Pretensão salarial', !!c.salary, 6], ['Disponibilidade para início', !!c.avail, 5], ['Modalidade desejada', (c.modes || []).length > 0, 5], ['Resumo profissional (mínimo 40 caracteres)', (c.summary || '').length >= 40, 10], ['Formação acadêmica', (c.education || []).length > 0, 10], ['Ao menos 3 competências', (c.skills || []).length >= 3, 10], ['Idiomas', (c.languages || []).length > 0, 5], ['Experiência profissional', (c.exps || []).length > 0, 10], ['Currículo em PDF', !!c.resume, 8], ['Link do LinkedIn', !!c.linkedin, 2], ['Cursos e certificações', (c.courses || []).length > 0, 2]];
  return { pct: it.filter(x => x[1]).reduce((a, x) => a + x[2], 0), missing: it.filter(x => !x[1]).map(x => x[0]) };
}
function candStatus(c) {
  const apps = candApps(c.id);
  if (apps.some(a => !CLOSED.includes(a.stage))) return ['Em processo', 'var(--blue)'];
  const h = apps.filter(a => a.stage === 'contratado').sort((a, b) => new Date(b.hiredDate) - new Date(a.hiredDate))[0];
  if (h && Date.now() - new Date(h.hiredDate) < 90 * 864e5) return ['Contratado(a) recentemente', 'var(--pri)'];
  return ['Disponível no banco', 'var(--green)'];
}

/* ---------- Shells ---------- */
const themeBtn = () => { const d = Theme.eff() === 'dark', l = d ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'; return `<button type="button" class="iconbtn themebtn" data-act="themeToggle" aria-label="${l}" title="${l}">${ico(d ? 'sun' : 'moon', 18)}</button>`; };
const themeSeg = () => { const t = Theme.get(); return `<div class="seg" role="group" aria-label="Aparência do site">${[['light', 'sun', 'Claro'], ['dark', 'moon', 'Escuro'], ['auto', 'monitor', 'Auto']].map(([v, i, l]) => `<button type="button" data-act="theme" data-v="${v}" aria-pressed="${t === v}">${ico(i, 14)}${l}</button>`).join('')}</div>`; };
function pub(content) {
  const u = curUser(), n = unreadOf(u), cand = u && u.role === 'candidate', h = location.hash;
  let nav;
  if (!u) nav = `<a href="#/vagas">Vagas</a><a href="#/para-empresas">Para empresas</a><a class="btn sm" href="#/entrar">Entrar</a><a class="btn pri sm" href="#/cadastro">Cadastrar currículo</a>`;
  else if (cand) nav = `<a class="cand-only" href="#/vagas">Vagas</a><a class="cand-only" href="#/c/candidaturas">Minhas candidaturas</a><a class="cand-only" href="#/c/perfil">Meu perfil</a><a class="cand-only" href="#/c/notificacoes">Notificações${n ? ` <span class="cnt">${n}</span>` : ''}</a><button class="btn ghost sm" data-act="logout">Sair</button>`;
  else nav = `<a href="#/vagas">Vagas</a><a class="btn pri sm" href="#${homeOf(u)}">Ir para meu painel</a><button class="btn ghost sm" data-act="logout">Sair</button>`;
  const tab = (href, ic, label, badge) => `<a href="#${href}" class="${h.startsWith('#' + href) ? 'on' : ''}">${ico(ic, 22)}${label}${badge ? `<span class="cnt">${badge}</span>` : ''}</a>`;
  const bar = cand ? `<nav class="tabbar" aria-label="Menu do candidato">${tab('/vagas', 'search', 'Vagas')}${tab('/c/candidaturas', 'brief', 'Candidaturas')}${tab('/c/perfil', 'user', 'Perfil')}${tab('/c/notificacoes', 'bell', 'Avisos', n)}</nav>` : '';
  document.body.classList.toggle('hasbar', !!cand); document.body.classList.remove('inapp', 'lp');
  return `<header class="top"><div class="top-in"><a class="logo" href="#/">${LOGO}vínculo</a><nav>${nav}${themeBtn()}</nav></div></header>${content}<footer class="foot2"><div class="foot2-in"><div><a class="logo" href="#/">${LOGO}vínculo</a><p class="mut sm mt-s" style="max-width:320px">Uma ponte entre pessoas e oportunidades. Conectamos talentos às vagas certas e empresas às pessoas que precisam.</p><div class="mt">${themeSeg()}</div></div>
  <div><h4>Profissionais</h4><a href="#/vagas">Buscar vagas</a><a href="#/cadastro">Cadastrar currículo</a><a href="#/entrar">Área do candidato</a></div>
  <div><h4>Empresas</h4><a href="#/para-empresas">Recrutamento e seleção</a><a href="#/para-empresas">Banco de talentos</a><a href="#/entrar">Área da empresa</a></div>
  <div><h4>Vínculo</h4><a href="#/privacidade">Política de privacidade</a><a href="#/termos">Termos de uso</a><a href="#/entrar">Acesso de demonstração</a></div>
  <div class="bot"><span>© ${new Date().getFullYear()} Vínculo. Seus dados tratados conforme a LGPD.</span><button class="btn ghost sm" data-act="reset">Restaurar dados de demonstração</button></div></div></footer>${bar}`;
}
const NAVC = { chart: 'coral', trend: 'coral', brief: 'blue', kanban: 'lilac', users: 'green', search: 'sun', inbox: 'coral', spark: 'lilac', file: 'blue', mail: 'green', bell: 'sun', building: 'blue', user: 'green', tag: 'lilac', shield: 'green', home: 'coral', plus: 'coral' };
const SideMini = { get() { try { return localStorage.getItem('vinculo_side') === '1'; } catch (e) { return false; } }, set(v) { try { localStorage.setItem('vinculo_side', v ? '1' : '0'); } catch (e) { } } };
function shell(content) {
  const u = curUser(), n = unreadOf(u), h = location.hash.replace('#', ''); document.body.classList.remove('hasbar', 'lp');
  if (ui.sideMini === undefined) ui.sideMini = SideMini.get();
  const mini = !!ui.sideMini, tt = l => mini ? ` title="${l}"` : '', fresh = ui.navPrev !== h; ui.navPrev = h;
  const chip = ic => `<span class="ni" data-c="${NAVC[ic] || 'coral'}">${ico(ic, 18)}</span>`;
  const nl = (href, ic, label, badge) => { const on = h === href || (href.length > 4 && h.startsWith(href + '/')); return `<a class="nl ${on ? 'on' : ''} ${on && fresh ? 'pop' : ''}" data-c="${NAVC[ic] || 'coral'}" href="#${href}" data-act="closeSide" data-label="${label}"${tt(label)}>${chip(ic)}<span class="lbl grow">${label}</span>${badge ? `<span class="cnt">${badge}</span>` : ''}</a>`; };
  const grp = t => `<div class="grp"><span class="lbl">${t}</span></div>`;
  const inInd = h.startsWith('/s/indicadores'), indOpen = ui.indOpen === false ? false : (ui.indOpen || inInd);
  const indMenu = isStaff(u) ? `<button type="button" class="nl nlp ${inInd ? 'on' : ''} ${inInd && fresh ? 'pop' : ''}" data-c="coral" data-act="indToggle" aria-expanded="${indOpen}" data-label="Indicadores"${tt('Indicadores')}>${chip('trend')}<span class="lbl grow">Indicadores</span><span class="chev ${indOpen ? 'open' : ''}">${ico('right', 14)}</span></button>` + (indOpen ? `<div class="nlsub">${IND_SUBS.map(x => { const href = '/s/indicadores/' + x[0]; return `<a class="nl sub ${h === href || (x[0] === 'geral' && h === '/s/indicadores') ? 'on' : ''}" href="#${href}" data-act="closeSide">${x[0] === 'recrutadores' && u.role !== 'admin' ? 'Meus números' : x[1]}</a>`; }).join('')}</div>` : '') : '';
  let links, card;
  if (u.role === 'client') {
    links = nl('/e/painel', 'home', 'Meu painel') + nl('/e/solicitar', 'plus', 'Solicitar vaga') + nl('/e/notificacoes', 'bell', 'Notificações', n);
    card = `<div class="sidecard"><span class="sc-t">Precisa de um novo profissional?</span><a class="btn pri sm block" href="#/e/solicitar">${ico('plus', 14)} Solicitar vaga</a></div>`;
  } else {
    const reqs = db.requests.filter(r => r.status === 'nova').length;
    links = nl('/s/dashboard', 'chart', 'Tela Principal') + grp('Recrutamento') + nl('/s/vagas', 'brief', 'Vagas') + nl('/s/kanban', 'kanban', 'Kanban') + nl('/s/triagem', 'search', 'Triagem') + nl('/s/banco', 'users', 'Banco de Talentos') + nl('/s/solicitacoes', 'inbox', 'Solicitações', reqs)
      + grp('Análise') + indMenu + nl('/s/ia', 'spark', 'Análise com IA') + nl('/s/relatorios', 'file', 'Relatórios')
      + grp('Comunicação') + nl('/s/comunicacoes', 'mail', 'Comunicações') + nl('/s/notificacoes', 'bell', 'Notificações', n);
    if (u.role === 'admin') links += grp('Administração') + nl('/s/empresas', 'building', 'Empresas clientes') + nl('/s/usuarios', 'user', 'Usuários e acessos') + nl('/s/cargos', 'tag', 'Cargos') + nl('/s/lgpd', 'shield', 'Privacidade (LGPD)');
    const act = db.apps.filter(a => !CLOSED.includes(a.stage)), nw = act.filter(a => a.stage === 'novo').length, ok = act.length ? Math.round(100 * (act.length - nw) / act.length) : 100;
    card = `<div class="sidecard"><span class="sc-t">Para triar agora</span><b class="sc-n">${nw}</b><span class="sc-t">${nw === 1 ? 'candidatura nova' : 'candidaturas novas'}</span><div class="sc-bar" title="${ok}% das candidaturas em andamento já passaram da triagem"><i style="width:${ok}%"></i></div><a class="btn pri sm block" href="#/s/triagem">Ir para a triagem</a></div>`;
  }
  const search = isStaff(u) ? `<form class="srch" data-form="gsearch" role="search">${ico('search', 18)}<input name="q" placeholder="Buscar talento por nome, cargo ou competência" aria-label="Buscar talento"></form>` : '<div class="grow"></div>';
  document.body.classList.add('inapp');
  return `<div class="app ${ui.side ? 'open' : ''} ${mini ? 'mini' : ''}"><aside class="side" aria-label="Menu"><button type="button" class="sidetog" data-act="sideMini" aria-label="${mini ? 'Expandir menu' : 'Recolher menu'}" title="${mini ? 'Expandir menu' : 'Recolher menu'}">${ico('right', 16)}</button>
  <div class="side-scroll"><a class="logo" href="#${homeOf(u)}">${LOGO}<span class="lbl">vínculo</span></a>${links}</div>
  <div class="side-foot">${card}<div class="themerow">${themeSeg()}</div><div class="minitheme">${themeBtn()}</div><div class="me">${avatar(u.name, 38)}<div class="lbl grow"><div class="b sm">${esc(u.name)}</div><div class="xs mut">${ROLE_NAME[u.role]}${u.companyId ? ' — ' + esc(compName(u.companyId)) : ''}</div></div><button class="iconbtn" data-act="logout" aria-label="Sair" title="Sair">${ico('out')}</button></div></div></aside><div class="scrim" data-act="closeSide"></div>
  <div class="mainc"><div class="bar"><button class="iconbtn menub" data-act="openSide" aria-label="Abrir menu">${ico('menu')}</button>${search}${themeBtn()}<a class="iconbtn" href="#/${u.role === 'client' ? 'e' : 's'}/notificacoes" aria-label="Notificações">${ico('bell')}${n ? `<span class="cnt">${n}</span>` : ''}</a></div><main class="page">${content}</main></div></div>`;
}
const pageHead = (title, sub, actions) => `<div class="ph"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div><div class="flex gap wrap">${actions || ''}</div></div>`;
const notFound = () => pub(`<main class="wrapc narrow"><div class="empty">Página não encontrada. <a href="#/">Voltar ao início</a></div></main>`);
const denied = () => { const u = curUser(); const c = `<div class="empty"><b>Acesso restrito.</b><p class="mt-s">Seu perfil (${u ? ROLE_NAME[u.role] : 'visitante'}) não tem permissão para ver esta página.</p><p class="mt-s"><a class="btn sm" href="#${u ? homeOf(u) : '/entrar'}">Voltar</a></p></div>`; return u && u.role !== 'candidate' ? shell(c) : pub(`<main class="wrapc narrow">${c}</main>`); };

/* ---------- Vagas (públicas) ---------- */
const SAL_OPTS = [['0-3000', 'Até R$ 3.000'], ['3000-5000', 'R$ 3.000 a R$ 5.000'], ['5000-8000', 'R$ 5.000 a R$ 8.000'], ['8000-99999', 'Acima de R$ 8.000']];
function jobMatch(j, f) {
  if (f.q && !strip([j.title, compName(j.companyId), j.area, j.city, j.desc, j.skills.join(' ')].join(' ')).includes(strip(f.q))) return false;
  if (f.title && j.title !== f.title) return false; if (f.area && j.area !== f.area) return false;
  if (f.city && j.city !== f.city) return false; if (f.state && j.state !== f.state) return false;
  if (f.mode && j.mode !== f.mode) return false; if (f.contract && j.contract !== f.contract) return false;
  if (f.sal) { const [lo, hi] = f.sal.split('-').map(Number); if (!(j.salMax >= lo && j.salMin <= hi)) return false; }
  return true;
}
const jobCard = j => {
  const u = curUser(), applied = u && u.candId && db.apps.some(a => a.jobId === j.id && a.candId === u.candId);
  return `<article class="card jcard"><div><h3><a href="#/vaga/${j.id}" style="color:inherit">${esc(j.title)}</a></h3><div class="mut sm">${esc(compName(j.companyId))}</div></div>
  <div class="meta"><span class="badge" style="--c:var(--pri)">${j.mode}</span><span class="badge">${j.contract}</span><span class="badge">${ico('pin', 12)} ${esc(j.city)}/${j.state}</span></div>
  <div class="sal">${salRange(j)}</div><div class="sm mut">${esc(j.benefits.slice(0, 3).join(', '))}${j.benefits.length > 3 ? ' e mais' : ''}</div>
  <div class="flex between gap wrap" style="margin-top:auto"><span class="xs mut">Publicada ${ago(j.pubDate)}${j.deadline ? ' — até ' + fdate(j.deadline) : ''}</span>${applied ? `<a class="btn sm" href="#/c/candidaturas">Já candidatado(a)</a>` : `<a class="btn pri sm" href="#/candidatar/${j.id}">Candidatar-se</a>`}</div></article>`;
};
const jobsResults = () => { const l = db.jobs.filter(j => j.status === 'open' && jobMatch(j, ui.jobs)); return `<p class="mut sm mb">${l.length} ${l.length === 1 ? 'vaga encontrada' : 'vagas encontradas'}</p>${l.length ? `<div class="jgrid">${l.map(jobCard).join('')}</div>` : '<div class="empty">Nenhuma vaga com esses filtros. Tente ampliar a busca ou <a href="#" data-act="clearJobs">limpar filtros</a>.</div>'}`; };
function jobsPublic() {
  lpFont();
  const f = ui.jobs, open = db.jobs.filter(j => j.status === 'open');
  const L = (n, ph, arr) => `<label class="field"><span>${ph}</span><select name="${n}" data-live="jobs">${opts(arr, f[n], 'Todos')}</select></label>`;
  const html = pub(`<section class="lp-hero lp-ph"><div class="lp-bg"><img src="vinculo/img/humano.jpg" alt="" width="2400" height="1792"></div><div class="lp-in"><span class="lp-badge">${ico('brief', 14)} ${open.length} ${open.length === 1 ? 'vaga aberta' : 'vagas abertas'}</span><h1>Encontre sua próxima <span class="dim">oportunidade.</span></h1><p class="lp-lead">Escolha uma vaga e candidate-se em poucos minutos. Seu perfil fica guardado para as próximas oportunidades.</p>
  <label class="lp-kw">${ico('search', 18)}<input name="q" type="search" data-live="jobs" value="${esc(f.q || '')}" placeholder="Ex.: vendas, Excel, analista, Recife" aria-label="Buscar por palavra-chave"></label></div></section>
  <div class="lp-wrap"><main class="lp-sec">
  <details class="fx mb" ${Object.keys(f).some(k => k !== 'q' && f[k]) ? 'open' : ''}><summary>Filtros</summary><div class="filters">${L('title', 'Cargo', uniq(open.map(j => j.title)).sort())}${L('area', 'Área', uniq(open.map(j => j.area)).sort())}${L('city', 'Cidade', uniq(open.map(j => j.city)).sort())}${L('state', 'Estado', uniq(open.map(j => j.state)).sort())}${L('mode', 'Modalidade', MODES)}${L('sal', 'Faixa salarial', SAL_OPTS)}${L('contract', 'Tipo de contratação', CONTRACTS)}</div></details>
  <div id="jobs-res">${jobsResults()}</div></main></div>`);
  document.body.classList.add('lp'); return html;
}
/* ---------- Link público da vaga e divulgação ---------- */
const jobUrl = id => location.href.split('#')[0] + '#/vaga/' + id;
const jobShareText = j => `Vaga aberta: ${j.title}\n${compName(j.companyId)} · ${j.city}/${j.state} · ${j.mode} · ${j.contract}${(j.salMin || j.salMax) ? '\nSalário: ' + salRange(j) : ''}\n\nVeja os detalhes e candidate-se pelo link:`;
const shareNets = (j, url, txt) => { const e = encodeURIComponent, full = txt + '\n' + url; return [['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + e(url)], ['WhatsApp', 'https://wa.me/?text=' + e(full)], ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + e(url)], ['X', 'https://twitter.com/intent/tweet?text=' + e(txt) + '&url=' + e(url)], ['E-mail', 'mailto:?subject=' + e('Vaga: ' + j.title) + '&body=' + e(full)]]; };
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; }
  catch (e) { const el = document.createElement('textarea'); el.value = s; el.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(el); el.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { } el.remove(); return ok; }
}
function shareModal(j, fresh) {
  const url = jobUrl(j.id), txt = jobShareText(j), full = txt + '\n' + url, open = j.status === 'open';
  openModal(fresh ? 'Vaga publicada' : 'Divulgar vaga', `${fresh ? `<div class="sh-ok">${ico('check', 18)}<span><b>${esc(j.title)}</b> já está no ar. Copie o link abaixo e publique nas suas redes.</span></div>` : `<p class="sm mut mb"><b>${esc(j.title)}</b> · ${esc(compName(j.companyId))}</p>`}
  ${open ? '' : `<div class="note mb">Esta vaga não está aberta. Quem acessar o link verá a vaga, mas sem a opção de candidatura.</div>`}
  <label class="field"><span>Link da vaga</span><div class="sh-link"><input id="sh-url" readonly value="${esc(url)}" aria-label="Link da vaga"><button type="button" class="btn pri" data-act="copyFrom" data-src="#sh-url" data-msg="Link copiado.">${ico('link', 15)} Copiar link</button></div></label>
  <a class="btn block mt-s" href="${esc(url)}" target="_blank" rel="noopener">Abrir página da vaga em nova guia ${ico('right', 14)}</a>
  <div class="sh-sep"><span>Compartilhar direto</span></div>
  <div class="sh-nets">${shareNets(j, url, txt).map(n => `<a class="btn sm" href="${esc(n[1])}" target="_blank" rel="noopener">${n[0]}</a>`).join('')}</div>
  <label class="field mt"><span>Texto sugerido para a publicação <small>(pode editar antes de copiar)</small></span><textarea id="sh-txt" rows="6">${esc(full)}</textarea></label>
  <div class="flex gap wrap mt-s"><button type="button" class="btn" data-act="copyFrom" data-src="#sh-txt" data-msg="Texto copiado.">Copiar texto com link</button></div>
  <p class="xs mut mt">Instagram não aceita link clicável em publicações: coloque o link na bio ou use o adesivo de link nos stories.</p>
  <div class="note mt">Demonstração: os dados ficam neste navegador. Em outro aparelho o link só mostrará a vaga quando o sistema estiver com banco de dados online.</div>
  <div class="flex gap wrap mt" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Concluir</button></div>`);
  const i = $('#sh-url'); if (i) i.select();
}
function jobDetail(id) {
  const j = by('jobs', id), u = curUser(), staff = isStaff(u);
  if (!j || (j.status === 'draft' && !staff)) return notFound();
  const co = compName(j.companyId), open = j.status === 'open', applied = u && u.candId && db.apps.find(a => a.jobId === j.id && a.candId === u.candId);
  const url = jobUrl(j.id), txt = jobShareText(j), nets = shareNets(j, url, txt), stLbl = j.status === 'paused' ? 'pausada' : j.status === 'closed' ? 'encerrada' : 'em rascunho';
  ui.pageTitle = `${j.title} · ${co} | Vínculo`;
  const cta = staff ? `<button class="btn block" disabled>Candidatura disponível para candidatos</button>` : applied ? `<a class="btn block" href="#/c/candidaturas">Você já se candidatou. Acompanhar</a>` : !open ? `<button class="btn block" disabled>Vaga ${stLbl}</button>` : `<a class="btn pri lg block" href="#/candidatar/${j.id}">Candidatar-se</a>`;
  const hint = !staff && !applied && open && !u ? `<p class="jp-hint">Primeira vez aqui? <a href="#/cadastro?next=${encodeURIComponent('/candidatar/' + j.id)}">Crie seu perfil</a> em cerca de 5 minutos e candidate-se.</p>` : '';
  const fact = (ic, l, v) => `<div class="jp-fact"><span class="jp-fi">${ico(ic, 16)}</span><div><div class="xs mut">${l}</div><div class="b">${v}</div></div></div>`;
  const sec = (t, body) => `<section class="jp-sec"><h2>${t}</h2>${body}</section>`;
  const list = a => a && a.length ? `<ul class="jp-list">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const reqs = (j.reqMand && j.reqMand.length) || (j.reqDesir && j.reqDesir.length);
  return pub(`${staff ? `<div class="jp-prev">${ico('shield', 14)} Visualização da equipe: é assim que os candidatos veem esta vaga. <a href="#/s/vaga/${j.id}">Voltar ao Kanban</a>${open ? ` <button type="button" class="btn sm" data-act="shareJob" data-id="${j.id}">Divulgar</button>` : ''}</div>` : ''}
  <section class="jp-hero"><div class="wrapc jp-in"><a class="jp-back" href="#/vagas">← Todas as vagas</a>
    <span class="eyebrow">${esc(j.area)}</span><h1>${esc(j.title)}</h1>
    <div class="jp-co">${avatar(co, 36)}<span>${esc(co)}</span></div>
    <div class="jp-meta"><span>${ico('pin', 15)} ${esc(j.city)}/${j.state}</span><span>${ico('brief', 15)} ${j.mode}</span><span>${ico('file', 15)} ${j.contract}</span>${j.pubDate ? `<span>${ico('cal', 15)} Publicada ${ago(j.pubDate)}</span>` : ''}</div>
    ${open ? '' : `<div class="jp-closed">Esta vaga está ${stLbl} e não recebe candidaturas no momento. <a href="#/vagas">Ver outras vagas</a></div>`}
  </div></section>
  <main class="wrapc jp-wrap"><div class="jp-grid"><article class="jp-main">
    ${sec('Sobre a vaga', `<p class="jp-desc">${esc(j.desc)}</p>`)}
    ${j.resp && j.resp.length ? sec('Responsabilidades', list(j.resp)) : ''}
    ${reqs ? sec('Requisitos', `<div class="jp-two">${j.reqMand && j.reqMand.length ? `<div><h3>Obrigatórios</h3>${list(j.reqMand)}</div>` : ''}${j.reqDesir && j.reqDesir.length ? `<div><h3>Desejáveis</h3>${list(j.reqDesir)}</div>` : ''}</div>`) : ''}
    ${j.benefits && j.benefits.length ? sec('Benefícios', `<div class="jp-ben">${j.benefits.map(b => `<span>${ico('check', 15)}${esc(b)}</span>`).join('')}</div>`) : ''}
    ${sec('Como é o processo', `<ol class="jp-steps">${TL.slice(0, 4).map((t, i) => `<li><i>${i + 1}</i><span>${t}</span></li>`).join('')}<li><i>${ico('check', 13)}</i><span>Resultado</span></li></ol><p class="sm mut mt-s">Você acompanha cada etapa pela área do candidato e recebe aviso a cada mudança.</p>`)}
  </article>
  <aside class="jp-side"><div class="jp-card">
    <div class="xs mut">Faixa salarial</div><div class="jp-sal">${salRange(j)}</div>
    <div class="jp-facts">${fact('file', 'Contratação', esc(j.contract))}${fact('brief', 'Modalidade', esc(j.mode))}${fact('pin', 'Local', `${esc(j.city)}/${j.state}`)}${j.qty > 1 ? fact('users', 'Posições', j.qty) : ''}${fact('cal', 'Candidaturas até', j.deadline ? fdate(j.deadline) : 'sem prazo definido')}</div>
    <div class="jp-cta">${cta}${hint}</div>
    <div class="jp-share"><div class="xs mut mb-s">Compartilhar esta vaga</div><div class="jp-sh-row"><button type="button" class="btn sm" data-act="copyFrom" data-val="${esc(url)}" data-msg="Link copiado.">${ico('link', 14)} Copiar link</button>${nets.slice(0, 2).map(n => `<a class="btn sm" href="${esc(n[1])}" target="_blank" rel="noopener">${n[0]}</a>`).join('')}</div></div>
  </div><div class="jp-priv">${ico('shield', 14)} <span>Seus dados são usados apenas para processos seletivos. <a href="#/privacidade">Saiba mais</a></span></div></aside></div></main>
  ${!staff && !applied && open ? `<div class="jp-bar"><div><div class="xs mut">Faixa salarial</div><b>${salRange(j)}</b></div><a class="btn pri" href="#/candidatar/${j.id}">Candidatar-se</a></div>` : ''}`);
}

/* ---------- Landing, login, cadastro, textos legais ---------- */
const TESTIMONIALS = [
  ['Candidata', 0, 'Pela primeira vez eu soube em que etapa estava. Mesmo antes da resposta final, me senti respeitada.', 'Juliana C.', 'Analista de Marketing', ''],
  ['Empresa', 1, 'Recebemos poucos candidatos, mas todos certos para a vaga. Fechamos em menos de três semanas.', 'Grupo Maré Alimentos', 'Gerência de RH', 'c2'],
  ['Candidato', 0, 'Meu perfil ficou no banco e me chamaram meses depois para uma vaga ainda melhor.', 'Rafael A.', 'Coordenador de Logística', 'c3'],
  ['Candidata', 0, 'Me candidatei em poucos minutos e recebi aviso a cada etapa. Foi a primeira vez que não fiquei no escuro.', 'Camila R.', 'Assistente Administrativa', ''],
  ['Empresa', 1, 'O banco de talentos nos poupou semanas: já havia gente qualificada pronta para a vaga de desenvolvedor.', 'NordesteTech Soluções', 'Gerência de Pessoas', 'c2'],
  ['Candidato', 0, 'Não passei na primeira vaga, mas fui chamado para outra. Meu perfil ficou guardado e ninguém me esqueceu.', 'Thiago B.', 'Analista Comercial', 'c3'],
  ['Empresa', 1, 'Acompanhar os candidatos em um quadro, em tempo real, deu muita tranquilidade para o nosso time.', 'Casa Vértice Engenharia', 'Departamento de RH', ''],
  ['Candidata', 0, 'Gostei de ver meus dados protegidos e de poder pedir a exclusão quando quisesse. Passa confiança.', 'Beatriz M.', 'Analista Financeira', 'c2']
];
const testimonials = dup => TESTIMONIALS.map(([tag, co, txt, name, role, cls]) => `<div class="quote ${cls}"${dup ? ' aria-hidden="true"' : ''}><span class="tagc ${co ? 'co' : ''}">${tag}</span><p>“${txt}”</p><div class="flex gap">${avatar(name, 36)}<div><b class="sm">${name}</b><div class="xs mut">${role}</div></div></div></div>`).join('');
function lpFont() { if (document.getElementById('lp-font')) return; const l = document.createElement('link'); l.id = 'lp-font'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600&display=swap'; document.head.appendChild(l); }
const WA_SVG = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4c-1-1.6-1.5-3.3-1.5-5.2C2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8zm8.4-18.2C18.1 1.3 15.2.1 12 .1 5.5.1.1 5.5.1 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.5 0 11.9-5.4 11.9-11.9 0-3.2-1.2-6.2-3.5-8.3z"/></svg>';
const LP_FAQ = [
  ['Como meus dados são protegidos?', 'Seguimos a LGPD: você controla seus dados e pode pedir a exclusão quando quiser. Seu contato fica protegido até a contratação.'],
  ['A IA decide quem é aprovado?', 'Não. A análise com IA apoia a triagem e organiza os perfis, mas toda decisão passa por recrutadores, que conversam com os candidatos e dão retorno.'],
  ['E se eu não for aprovado(a) na vaga?', 'Seu perfil continua guardado no banco de talentos e pode ser lembrado em novas oportunidades compatíveis.'],
  ['Como acompanho minha candidatura?', 'Na sua área você vê a linha do tempo de cada processo e recebe avisos a cada mudança de etapa.'],
  ['Como uma empresa pede uma vaga?', 'Pela página Para empresas: a empresa cliente acessa sua área, solicita a vaga e acompanha os candidatos em um quadro, em tempo real.']
];
function landing() {
  lpFont();
  const open = db.jobs.filter(j => j.status === 'open'), talents = db.cands.filter(c => !c.deleted).length, cos = db.companies ? db.companies.length : 0, hired = db.apps.filter(a => a.stage === 'contratado').length;
  const feat = (ic, t, d) => `<div class="lp-feat"><span class="lp-fi">${ico(ic, 18)}</span><div><b>${t}</b><span>${d}</span></div></div>`;
  const stp = (n, t, tag, d, extra, pct) => `<div class="lp-step lp-rv"><div class="lp-sh"><span class="lp-si">${ico(extra[0], 20)}</span><div><b>${n}. ${t}</b><small>${tag}</small></div></div><p>${d}</p>${extra[1]}<i class="lp-bar"><u style="width:${pct}%"></u></i></div>`;
  const html = pub(`<section class="lp-hero"><div class="lp-bg"><img src="vinculo/img/hero.jpg" alt="" width="1856" height="2304"></div>
  <div class="lp-in"><span class="lp-badge">${ico('spark', 14)} Recrutamento e seleção com IA e atenção humana</span>
  <h1>Talentos encontram oportunidades. <span class="dim">Empresas encontram pessoas.</span></h1>
  <p class="lp-lead">Seu próximo passo profissional começa com uma boa conexão. Cuidamos de cada candidatura com atenção humana — e de cada vaga como se fosse nossa.</p>
  <div class="lp-cta"><a class="lp-btn w" href="#/vagas">Buscar vagas</a><a class="lp-btn g" href="#/para-empresas">Quero contratar</a></div>
  <span class="lp-priv">${ico('lock', 12)} Contato protegido até a contratação</span></div>
  <div class="lp-feats">${feat('spark', 'Triagem com IA', 'Apoio na análise de cada perfil.')}${feat('trend', 'Etapas em tempo real', 'Você sabe onde está seu processo.')}${feat('users', 'Banco de talentos', 'Seu perfil fica no radar.')}${feat('shield', 'Dados protegidos', 'Tratamento conforme a LGPD.')}</div></section>
  <div class="lp-wrap"><section class="lp-sec"><div class="lp-stats lp-rv"><div class="lp-stat"><b data-count="${open.length}">${open.length}</b><span>vagas abertas agora</span></div><div class="lp-stat"><b data-count="${talents}">${talents}</b><span>perfis no banco de talentos</span></div><div class="lp-stat"><b ${cos ? `data-count="${cos}"` : ''}>${cos || '—'}</b><span>empresas parceiras</span></div><div class="lp-stat"><b data-count="${hired}">${hired}</b><span>contratações realizadas</span></div><a class="lp-stat wa" href="https://wa.me/5581996457989" target="_blank" rel="noopener"><b>${WA_SVG}Fale conosco</b><span>atendimento pelo WhatsApp</span></a></div></section>
  <section class="lp-sec" id="vagas-destaque"><div class="lp-head lp-rv"><div><span class="lp-eb">${ico('brief', 14)} Vagas em destaque</span><h2 class="lp-h">Vagas abertas hoje.</h2><p class="lp-sub">Oportunidades reais, com salário e benefícios à vista.</p></div>
  <form class="hsearch lp-search" data-form="hsearch" role="search"><label>${ico('search', 18)}<input name="q" type="search" placeholder="Cargo, competência ou cidade" aria-label="Buscar vagas"></label><button class="btn pri">Buscar</button></form></div>
  <div class="jgrid">${open.slice(0, 6).map(j => jobCard(j).replace('<article class="card jcard">', `<article class="card jcard clk lp-rv" data-href="#/vaga/${j.id}">`)).join('')}</div><div class="lp-more"><a class="lp-btn d" href="#/vagas">Ver todas as vagas ${ico('right', 16)}</a></div></section>
  <section class="lp-sec"><div class="lp-box"><span class="lp-eb">${ico('kanban', 14)} Como funciona</span><h2 class="lp-h">O caminho até a contratação.</h2><p class="lp-sub">Sem mistério, com retorno a cada etapa.</p>
  <div class="lp-steps">${stp('01', 'Crie seu perfil', 'Cadastro', 'Experiências, formação e competências em um só lugar.', ['user', `<span class="lp-chip">${ico('cal', 13)} Em poucos minutos</span>`], 25)}${stp('02', 'Candidate-se', 'Candidatura', 'Responda poucas perguntas e envie em minutos.', ['brief', `<span class="lp-chip">${ico('spark', 13)} Triagem com apoio de IA</span>`], 50)}${stp('03', 'Acompanhe', 'Acompanhamento', 'Triagem, entrevistas e retorno visíveis na sua área.', ['bell', `<ul class="lp-dots"><li style="--d:#3FB26D">Aviso a cada etapa</li><li style="--d:#5B8DEF">Linha do tempo clara</li><li style="--d:#A58CF0">Retorno de verdade</li></ul>`], 75)}${stp('04', 'Comece', 'Contratação', 'Aprovado? Te ajudamos até o primeiro dia.', ['star', `<span class="lp-chip">${ico('users', 13)} Perfil sempre guardado</span>`], 100)}</div>
  <div class="lp-more"><a class="lp-btn d" href="#/cadastro">Cadastrar meu currículo</a><small>Leva menos de 5 minutos.</small></div></div></section>
  <section class="lp-sec"><div class="lp-split lp-rv"><div class="lp-img"><img class="tall" src="vinculo/img/talento.jpg" alt="Jovem profissional sorrindo enquanto acompanha a candidatura pelo celular" loading="lazy"></div>
  <div><span class="lp-eb">${ico('users', 14)} Banco de talentos</span><h2 class="lp-h m">Cadastre-se uma vez. Fique no radar.</h2><p class="lp-sub">Mesmo quando uma vaga não dá certo, seu perfil continua guardado e é lembrado para as próximas oportunidades compatíveis.</p>
  <ul class="ticks"><li>Cadastro guiado, em poucos passos</li><li>Linha do tempo clara de cada processo</li><li>Avisos a cada mudança de etapa</li><li>Você controla seus dados (LGPD)</li></ul>
  <div class="flex gap wrap"><a class="lp-btn d" href="#/cadastro">Cadastrar meu currículo</a><a class="lp-btn o" href="#/vagas">Ver oportunidades</a></div></div></div></section>
  <section class="lp-sec"><div class="lp-split rev lp-rv"><div class="lp-img"><img src="vinculo/img/humano.jpg" alt="Recrutadora conversando com candidata em um ambiente acolhedor" loading="lazy"></div>
  <div><span class="lp-eb">${ico('user', 14)} Diferencial humano</span><h2 class="lp-h m">Tecnologia para agilizar. Pessoas para entender.</h2><p class="lp-sub">Usamos triagem inteligente e análise com IA para ganhar tempo — mas cada decisão passa por recrutadores que conversam, escutam e dão retorno de verdade.</p>
  <ul class="ticks"><li>Recrutadores dedicados a cada vaga</li><li>Feedback para todos os candidatos</li><li>Processos justos e inclusivos</li></ul></div></div></section>
  <section class="lp-sec"><div class="lp-head lp-rv"><div><span class="lp-eb">${ico('star', 14)} Quem já passou por aqui</span><h2 class="lp-h">Conexões que viraram histórias.</h2></div></div><div class="qmarq"><div class="qtrack">${testimonials()}${testimonials(true)}</div></div></section>
  <section class="lp-sec"><div class="lp-box lp-faq"><div class="lp-faqh"><h2 class="lp-h">Perguntas.</h2><p class="lp-sub">Respostas rápidas sobre candidaturas, dados e como as empresas contratam por aqui.</p><a class="lp-btn o" href="https://wa.me/5581996457989" target="_blank" rel="noopener">Falar pelo WhatsApp ${ico('right', 16)}</a></div>
  <div class="lp-faql">${LP_FAQ.map((q, i) => `<details class="lp-q"${i === 0 ? ' open' : ''}><summary>${q[0]}<span class="lp-pm" aria-hidden="true"></span></summary><p>${q[1]}</p></details>`).join('')}</div></div></section>
  <section class="lp-sec"><div class="band lp-rv"><span class="eyebrow" style="color:var(--sun)">Para empresas</span><h2 style="margin-top:10px">Precisa contratar? A gente encontra as pessoas certas.</h2><p>Recrutamento e seleção sob medida, com acesso ao nosso banco de talentos e acompanhamento de cada etapa.</p><div class="flex gap wrap mt"><a class="btn coral lg" href="#/para-empresas">Quero contratar</a><a class="btn ghostl lg" href="#/entrar">Acessar demonstração</a></div></div></section></div>`);
  document.body.classList.add('lp'); return html;
}
const lpStp = (n, t, tag, d, ic, pct) => `<div class="lp-step lp-rv"><div class="lp-sh"><span class="lp-si">${ico(ic, 20)}</span><div><b>${n}. ${t}</b><small>${tag}</small></div></div><p>${d}</p><i class="lp-bar"><u style="width:${pct}%"></u></i></div>`;
function bizPage() {
  lpFont();
  const talents = db.cands.filter(c => !c.deleted).length;
  const html = pub(`<section class="lp-hero lp-ph"><div class="lp-bg"><img src="vinculo/img/empresas.jpg" alt="" width="2400" height="1792"></div><div class="lp-in"><span class="lp-badge">${ico('building', 14)} Para empresas</span><h1>Encontre os profissionais certos <span class="dim">para sua empresa.</span></h1><p class="lp-lead">Conte o que você precisa. Nossos recrutadores cuidam da triagem, das entrevistas e da comunicação — você só avalia quem realmente faz sentido.</p>
  <div class="lp-cta"><a class="lp-btn w" href="#/entrar?next=%2Fe%2Fsolicitar">Solicitar recrutamento</a><a class="lp-btn g" href="https://wa.me/5581996457989?text=Ol%C3%A1!%20Quero%20falar%20com%20um%20especialista%20em%20recrutamento." target="_blank" rel="noopener">Falar com especialista</a></div><span class="lp-priv">${ico('users', 12)} ${talents} talentos prontos no banco</span></div></section>
  <div class="lp-wrap"><section class="lp-sec"><div class="lp-box"><span class="lp-eb">${ico('kanban', 14)} Como trabalhamos</span><h2 class="lp-h">Um processo claro, do briefing à contratação.</h2>
  <div class="lp-steps">${lpStp('01', 'Solicite a vaga', 'Solicitação', 'Pela sua área, em poucos campos.', 'inbox', 25)}${lpStp('02', 'Buscamos e triamos', 'Triagem', 'Banco de talentos, divulgação e análise com IA.', 'search', 50)}${lpStp('03', 'Você avalia', 'Avaliação', 'Só os candidatos encaminhados, com um clique para responder.', 'users', 75)}${lpStp('04', 'Contratação', 'Fechamento', 'Acompanhamos até o fechamento.', 'star', 100)}</div></div></section>
  <section class="lp-sec"><div class="lp-split lp-rv"><div class="lp-img"><img src="vinculo/img/humano.jpg" alt="Recrutadora em entrevista acolhedora" loading="lazy"></div><div><span class="lp-eb">${ico('user', 14)} Por que o Vínculo</span><h2 class="lp-h m">Entendemos de pessoas — e do seu negócio.</h2>
  <ul class="ticks"><li>Banco de talentos pesquisável e sempre atualizado</li><li>Pipeline transparente em tempo real</li><li>Dados pessoais compartilhados só quando necessário (LGPD)</li><li>Recrutadores dedicados ao seu segmento</li></ul><a class="lp-btn d" href="#/entrar?next=%2Fe%2Fsolicitar">Encontrar talentos</a></div></div></section></div>`);
  document.body.classList.add('lp'); return html;
}
const DEMO = [['Administrador', 'admin@vinculo.demo', 'Gerencia empresas, vagas, usuários e LGPD'], ['Recrutador', 'recrutador@vinculo.demo', 'Pipeline, triagem e banco de talentos'], ['Empresa cliente', 'empresa@grupomare.demo', 'Grupo Maré Alimentos: avalia candidatos'], ['Candidato', 'marina.souza@email.demo', 'Marina Souza: perfil e candidaturas']];
/* ---------- Login com Google (DEMONSTRAÇÃO) ----------
   Nível 1: o seletor de contas abaixo é SIMULADO; nenhuma conta real do Google é usada.
   Produção: preencher GOOGLE_CLIENT_ID e trocar googlePick/googleOther por um fluxo OAuth
   (Google Identity Services) com o token verificado em um servidor. */
const GOOGLE_CLIENT_ID = '';
const GOOGLE_DEMO_ACCOUNTS = [['Ana Beatriz Lima', 'ana.beatriz.demo@gmail.com'], ['Carlos Eduardo Souza', 'carlos.souza.demo@gmail.com'], ['Fernanda Alves', 'fernanda.alves.demo@gmail.com']];
const G_LOGO = '<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const googleBtn = next => `<button type="button" class="gbtn" data-act="googleSignIn" data-next="${esc(next || '')}">${G_LOGO}Continuar com Google</button>`;
function googleContinue(name, email, next) {
  email = String(email).trim().toLowerCase(); name = String(name).trim();
  const ex = db.users.find(x => x.email.toLowerCase() === email);
  if (ex) {
    if (ex.role !== 'candidate') return toast('Este e-mail pertence a uma conta da equipe ou de empresa. Entre com e-mail e senha.', true);
    if (ex.active === false) return toast('Esta conta está desativada.', true);
    Sess.set(ex.id); closeModal(); toast(`Bem-vindo(a) de volta, ${ex.name.split(' ')[0]}!`);
    return go(next && next.startsWith('/') && !next.startsWith('//') ? next : homeOf(ex));
  }
  ui.google = { name, email }; ui.step = 0; if (next && next.startsWith('/') && !next.startsWith('//')) ui.afterReg = next; closeModal(); toast('Conta Google conectada. Complete seu perfil para finalizar.'); go('/cadastro');
}
const googleBanner = () => `<div class="note mb" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between"><span>${G_LOGO.replace('width="20" height="20"', 'width="16" height="16" style="vertical-align:-3px"')} Conectado com Google (demonstração): <b>${esc(ui.google.email)}</b>. Falta pouco: complete seus dados.</span><a href="#" data-act="googleCancel">Usar outro e-mail</a></div>`;
function loginView(next) {
  const roleC = { Administrador: 'var(--coral)', Recrutador: 'var(--pri)', 'Empresa cliente': 'var(--blue)', Candidato: 'var(--lilac)' };
  lpFont();
  const html = pub(`<section class="lp-hero lp-authhero"><div class="lp-bg"><img src="vinculo/img/hero.jpg" alt="" width="1856" height="2304"></div><main class="auth"><div class="auth-in"><section class="auth-card"><h1>Entrar</h1><p class="auth-sub">Acesse sua conta para acompanhar vagas, candidaturas e processos.</p>${googleBtn(next)}<div class="orsep"><span>ou use e-mail e senha</span></div>
  <form data-form="login" class="stack"><input type="hidden" name="next" value="${esc(next || '')}">
  ${fld('E-mail', inp('email', '', { type: 'email', req: 1, ph: 'voce@email.com', attrs: 'autocomplete="username"' }))}${fld('Senha', inp('pass', '', { type: 'password', req: 1, attrs: 'autocomplete="current-password"' }))}<button class="btn pri block lg">Entrar</button></form>
  <p class="sm mut auth-foot">Ainda não tem conta? <a href="#/cadastro${next && next.startsWith('/') ? '?next=' + encodeURIComponent(next) : ''}">Criar perfil de candidato</a></p></section>
  <aside class="auth-demo"><span class="eyebrow">Demonstração</span><h2>Entre com uma conta de exemplo</h2><p class="sm mut">Um clique para explorar cada perfil. Senha de todas: <span class="mono">demo123</span></p>
  <div class="demo-list">${DEMO.map(d => `<button type="button" class="demo-row" data-act="demoLogin" data-email="${d[1]}"><span class="demo-av" style="--c:${roleC[d[0]] || 'var(--pri)'}">${esc(d[0].charAt(0))}</span><span class="demo-tx"><b>${d[0]}</b><span>${d[2]}</span><span class="mono">${d[1]}</span></span><span class="demo-go">${ico('right', 16)}</span></button>`).join('')}</div></aside></div></main></section>`);
  document.body.classList.add('lp'); return html;
}
function registerView() {
  const u = curUser(); if (u && u.role === 'candidate') { go('/c/perfil'); return ''; }
  return pub(`<main class="wrapc narrow"><div class="ph"><div><h2>Crie seu perfil profissional</h2><p>Leva cerca de 5 minutos. Depois disso, candidatar-se a uma vaga leva 1 minuto.</p></div></div><div class="card">${ui.google ? '' : `${googleBtn('')}<div class="orsep"><span>ou preencha seus dados</span></div>`}${profileForm(null, 'register')}</div></main>`);
}
const policyView = () => pub(`<main class="wrapc narrow"><div class="card stack"><h2>Política de privacidade</h2><p class="mut sm">Versão 1.0 — texto de demonstração; deve ser revisado por assessoria jurídica antes do uso em produção.</p>
<h3>Quais dados coletamos</h3><p>Dados cadastrais, profissionais e o currículo que você envia, além das respostas dadas nas candidaturas.</p><h3>Para que usamos</h3><p>Exclusivamente para conduzir processos seletivos, indicar seu perfil a empresas clientes quando você se candidata ou aceita um convite, e manter você no banco de talentos para futuras oportunidades, mediante seu consentimento.</p>
<h3>Quem acessa</h3><p>Apenas recrutadores autorizados. Empresas clientes veem somente candidatos encaminhados para as vagas delas, sem telefone, e-mail ou data de nascimento. Anotações e avaliações internas nunca são exibidas a você nem à empresa.</p><h3>Seus direitos (LGPD)</h3><p>Você pode ver seus dados, corrigi-los e solicitar a exclusão a qualquer momento em <b>Meu perfil &gt; Privacidade</b>. Registramos quem acessa cada perfil.</p><h3>Decisões automatizadas</h3><p>Indicadores de aderência são apenas apoio ao recrutador. Nenhuma contratação ou reprovação é decidida automaticamente.</p></div></main>`);
const termsView = () => pub(`<main class="wrapc narrow"><div class="card stack"><h2>Termos de uso</h2><p class="mut sm">Versão 1.0 — texto de demonstração.</p><p>Ao criar um perfil, você declara que as informações são verdadeiras e autoriza o uso delas para fins de recrutamento e seleção. A plataforma não garante contratação. Você pode encerrar seu cadastro e excluir seus dados quando quiser.</p><p>Recrutadores e empresas comprometem-se a usar os dados dos candidatos apenas para os processos seletivos para os quais foram autorizados.</p></div></main>`);

/* ---------- Formulário de perfil (cadastro e edição) ---------- */
const chipEl = v => `<span class="chip" data-v="${esc(v)}">${esc(v)}<button type="button" data-act="delChip" aria-label="Remover ${esc(v)}">×</button></span>`;
const chipsField = (id, label, vals, hint, list) => `<div class="field"><span>${label}${hint ? ` <small>${hint}</small>` : ''}</span><div class="chips-in" data-chips="${id}">${(vals || []).map(chipEl).join('')}<input type="text" data-chipinput placeholder="Digite e pressione Enter" ${list ? `list="${list}"` : ''}></div></div>`;
const eduRow = (e = {}) => `<div class="rep" data-group="edu">${fld('Nível', sel('level', EDU, e.level || 'Graduação'))}${fld('Curso', inp('course', e.course))}${fld('Instituição', inp('inst', e.inst))}${fld('Conclusão', inp('year', e.year, { type: 'number', attrs: 'min="1970" max="2040"' }))}<button type="button" class="btn ghost sm" data-act="delRow" aria-label="Remover formação">${ico('x', 16)}</button></div>`;
const langRow = (e = {}) => `<div class="rep" data-group="lang">${fld('Idioma', sel('lang', LANGS, e.lang || 'Inglês'))}${fld('Nível', sel('level', LVL, e.level || 'Intermediário'))}<button type="button" class="btn ghost sm" data-act="delRow" aria-label="Remover idioma">${ico('x', 16)}</button></div>`;
const expRow = (e = {}) => `<div class="rep" data-group="exp">${fld('Cargo', inp('role', e.role, { attrs: CARGO_ATTR }))}${fld('Empresa', inp('company', e.company))}${fld('Início', inp('from', e.from, { type: 'month' }))}${fld('Fim', inp('to', e.to, { type: 'month' }), 'vazio = atual')}<button type="button" class="btn ghost sm" data-act="delRow" aria-label="Remover experiência">${ico('x', 16)}</button><div class="full" style="grid-column:1/-1">${fld('O que você fazia', `<textarea name="desc" style="min-height:64px">${esc(e.desc || '')}</textarea>`)}</div></div>`;
const ROWS = { edu: eduRow, lang: langRow, exp: expRow };
function profileForm(c, mode) {
  const reg = mode === 'register'; c = c || { modes: [], education: [], languages: [], exps: [], courses: [], skills: [] };
  if (reg && ui.google) c = { ...c, name: ui.google.name, email: ui.google.email };
  const S = (n, t, body) => `<section class="fsec ${reg && n ? 'hide' : ''}" data-step="${n}" ${reg ? '' : 'style="margin-bottom:26px"'}><h3>${t}</h3>${body}</section>`;
  const steps = ['Dados de acesso', 'Perfil profissional', 'Formação e idiomas', 'Experiências e currículo', 'Privacidade'];
  return `<form data-form="profile" data-mode="${mode}" novalidate-ok>${reg ? `<div class="wiz" id="wiz">${steps.map((s, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div><p class="sm mut mb" id="wiz-t">Etapa 1 de 5: ${steps[0]}</p>` : ''}
  ${S(0, reg ? 'Dados de acesso' : 'Dados pessoais', `${reg && ui.google ? googleBanner() : ''}<div class="fg">${fld('Nome completo', inp('fullName', c.name, { req: 1 }))}${fld('E-mail', inp('email', c.email, { type: 'email', req: 1, attrs: edit(mode) + (reg && ui.google ? ' readonly' : '') }))}${reg && !ui.google ? fld('Senha', inp('pass', '', { type: 'password', req: 1, attrs: 'minlength="6" autocomplete="new-password"' }), 'mín. 6 caracteres') : ''}${fld('Telefone/WhatsApp', inp('phone', c.phone, { type: 'tel', req: 1, ph: '(81) 9 9999-9999' }))}${fld('Cidade', inp('city', c.city, { req: 1 }))}${fld('Estado', sel('state', UF, c.state || 'PE'))}${fld('Data de nascimento', inp('birth', c.birth, { type: 'date', req: 1 }))}</div>`)}
  ${S(1, 'Perfil profissional', `<div class="fg">${fld('Cargo atual ou desejado', inp('title', c.title, { req: 1, attrs: CARGO_ATTR }) + cargoDL())}${fld('Área profissional', sel('area', AREA_LIST, c.area, 'Selecione', 'required'))}${fld('Pretensão salarial (R$)', inp('salary', c.salary, { type: 'number', attrs: 'min="0" step="100"', req: 1 }))}${fld('Disponibilidade para início', sel('avail', AVAIL, c.avail || 'Imediata'))}${fld('Disponibilidade para viagens', sel('travel', ['Sim', 'Não'], c.travel || 'Não'))}${fld('LinkedIn', inp('linkedin', c.linkedin, { type: 'url', ph: 'https://linkedin.com/in/...' }))}${fld('Portfólio/site', inp('portfolio', c.portfolio, { type: 'url', ph: 'https://' }))}</div>
  <div class="field"><span>Modalidade desejada</span><div class="opts">${MODES.map(m => `<label><input type="checkbox" name="modes" value="${m}" ${(c.modes || []).includes(m) ? 'checked' : ''}>${m}</label>`).join('')}</div></div>
  ${fld('Resumo profissional', `<textarea name="summary" placeholder="Conte em poucas linhas sua trajetória e o que busca.">${esc(c.summary || '')}</textarea>`)}`)}
  ${S(2, 'Formação e idiomas', `<div class="field"><span>Formação acadêmica</span><div id="g-edu">${(c.education.length ? c.education : [{}]).map(eduRow).join('')}</div><button type="button" class="btn sm" data-act="addRow" data-g="edu">${ico('plus', 14)} Adicionar formação</button></div>
  ${chipsField('courses', 'Cursos e certificações', c.courses, 'Enter para adicionar')}
  <div class="field"><span>Idiomas</span><div id="g-lang">${(c.languages.length ? c.languages : [{}]).map(langRow).join('')}</div><button type="button" class="btn sm" data-act="addRow" data-g="lang">${ico('plus', 14)} Adicionar idioma</button></div>
  ${chipsField('skills', 'Competências', c.skills, 'recomendado: 3 ou mais', 'dl-skills')}<datalist id="dl-skills">${ALL_SKILLS.map(s => `<option value="${esc(s)}">`).join('')}</datalist>`)}
  ${S(3, 'Experiências e currículo', `<div class="field"><span>Currículo em PDF</span><input type="file" name="resume" accept="application/pdf,.pdf,.doc,.docx" data-live="resume">${c.resume ? `<small class="mut">Arquivo atual: ${esc(c.resume.name)}. Envie outro para substituir.</small>` : ''}<div class="flex gap wrap mt-s"><button type="button" class="btn sm" data-act="analyzeResume">${ico('spark', 14)} Analisar currículo (demo de IA)</button><small class="mut">Simula a extração de cargos, formação, competências e idiomas para preencher o cadastro.</small></div></div>
  <div class="field"><span>Experiências profissionais</span><div id="g-exp">${(c.exps.length ? c.exps : [{}]).map(expRow).join('')}</div><button type="button" class="btn sm" data-act="addRow" data-g="exp">${ico('plus', 14)} Adicionar experiência</button></div>`)}
  ${reg ? S(4, 'Privacidade e consentimento', `<div class="note">${ico('shield', 14)} Coletamos apenas o necessário para processos seletivos. Leia a <a href="#/privacidade" target="_blank">política de privacidade</a> e os <a href="#/termos" target="_blank">termos de uso</a>.</div>
  <label class="check"><input type="checkbox" name="cTerms" required> <span>Li e aceito os termos de uso e a política de privacidade. <b>(obrigatório)</b></span></label>
  <label class="check"><input type="checkbox" name="cStore" required> <span>Autorizo o armazenamento dos meus dados e currículo para participar de processos seletivos, inclusive de vagas futuras no banco de talentos. <b>(obrigatório)</b></span></label>
  <label class="check"><input type="checkbox" name="cMkt"> <span>Quero receber convites para novas vagas por e-mail e WhatsApp.</span></label>`) : ''}
  <div class="flex between gap wrap mt">${reg ? `<button type="button" class="btn" data-act="prevStep" id="btn-prev" disabled>Voltar</button><button class="btn pri" id="btn-next">Continuar</button>` : `<a class="btn" href="#/c/perfil">Cancelar</a><button class="btn pri">Salvar alterações</button>`}</div></form>`;
}
function edit(mode) { return mode === 'edit' ? 'readonly' : 'autocomplete="email"'; }

/* ---------- Perfil (visualização) ---------- */
function profileBody(c, mode) {
  const yrs = candYears(c);
  return `<div class="stack"><section class="card"><h3>Resumo profissional</h3><p>${esc(c.summary || 'Sem resumo.')}</p></section>
  <section class="card"><h3>Experiências ${yrs ? `<span class="mut sm" style="font-weight:500">(${yTxt(yrs)} no total)</span>` : ''}</h3>${c.exps.length ? c.exps.map(e => `<div class="mt-s" style="padding-bottom:10px"><div class="b">${esc(e.role)}</div><div class="mut sm">${esc(e.company)} — ${ymTxt(e.from)} a ${e.to ? ymTxt(e.to) : 'atual'}</div><p class="sm mt-s">${esc(e.desc)}</p></div>`).join('') : '<p class="mut">Nenhuma experiência informada.</p>'}</section>
  <div class="g2"><section class="card"><h3>Formação</h3>${c.education.length ? c.education.map(e => `<div class="mt-s"><div class="b">${esc(e.course)}</div><div class="mut sm">${esc(e.level)}, ${esc(e.inst)}${e.year ? ' (' + esc(e.year) + ')' : ''}</div></div>`).join('') : '<p class="mut">Não informada.</p>'}</section>
  <section class="card"><h3>Idiomas</h3>${c.languages.length ? c.languages.map(l => `<div class="flex between mt-s"><span>${esc(l.lang)}</span><span class="badge">${esc(l.level)}</span></div>`).join('') : '<p class="mut">Não informado.</p>'}</section></div>
  <div class="g2"><section class="card"><h3>Competências</h3>${chipsView(c.skills)}</section><section class="card"><h3>Cursos e certificações</h3>${c.courses.length ? ul(c.courses) : '<p class="mut">Nenhum informado.</p>'}</section></div></div>`;
}
function profileSide(c, mode) {
  const row = (l, v) => `<div class="mt-s"><div class="xs mut">${l}</div><div>${v}</div></div>`;
  const res = c.resume ? `<a href="#" class="btn sm block" data-act="openResume" data-name="${esc(c.resume.name)}">${ico('file', 14)} ${esc(c.resume.name)}</a>` : '<span class="mut">Não enviado</span>';
  return `<div class="card"><h3>Informações</h3>${row('Pretensão salarial', `<b>${brl(c.salary)}</b>`)}${row('Disponibilidade para início', esc(c.avail))}${row('Modalidade desejada', esc((c.modes || []).join(', ') || '—'))}${row('Viagens', esc(c.travel || '—'))}
  ${mode !== 'client' ? row('Contato', `${ico('mail', 13)} ${esc(c.email)}<br>${ico('phone', 13)} ${esc(c.phone)}`) + (mode === 'hired' ? '' : row('Nascimento', fdate(c.birth))) : row('Contato', '<span class="mut sm">Liberado apenas após a contratação.</span>')}
  ${mode !== 'client' && (c.linkedin || c.portfolio) ? row('Links', [c.linkedin && `<a href="${esc(c.linkedin)}" target="_blank" rel="noopener">${ico('link', 13)} LinkedIn</a>`, c.portfolio && `<a href="${esc(c.portfolio)}" target="_blank" rel="noopener">${ico('link', 13)} Portfólio</a>`].filter(Boolean).join('<br>')) : ''}
  ${row('Currículo', res)}</div>`;
}
function selfProfile(c) {
  const p = completeness(c), st = candStatus(c);
  return pub(`<main class="wrapc"><div class="cols two"><div class="stack">
  <div class="card"><div class="flex gap-l wrap">${avatar(c.name, 72)}<div class="grow"><h1 style="font-size:28px">${esc(c.name)}</h1><p class="mut">${esc(c.title)} — ${esc(c.area)}</p><p class="sm mut mt-s">${ico('pin', 13)} ${esc(c.city)}/${c.state}</p></div><a class="btn" href="#/c/perfil/editar">${ico('edit', 14)} Editar perfil</a></div></div>
  ${profileBody(c, 'self')}</div>
  <aside class="stack"><div class="card"><div class="flex between"><h3 style="margin:0">Perfil ${p.pct}% completo</h3></div><div class="prog mt-s"><i style="width:${p.pct}%"></i></div>${p.missing.length ? `<p class="sm mut mt">Para melhorar suas chances, complete:</p><ul class="sm">${p.missing.slice(0, 6).map(m => `<li>${esc(m)}</li>`).join('')}</ul><a class="btn sm mt-s" href="#/c/perfil/editar">Completar agora</a>` : '<p class="sm mt" style="color:var(--green)">Tudo certo! Seu perfil está completo.</p>'}</div>
  ${profileSide(c, 'self')}
  <div class="card"><h3>Banco de talentos</h3><p class="sm"><span class="badge dot" style="--c:${st[1]}">${st[0]}</span></p><p class="sm mut mt-s">Seu perfil fica disponível para recrutadores em novas oportunidades. Você controla isso em <a href="#/c/privacidade">Privacidade</a>.</p></div></aside></div></main>`);
}

/* ---------- Timeline e candidaturas ---------- */
const TL = ['Candidatura enviada', 'Triagem', 'Entrevista RH', 'Entrevista com a empresa', 'Resultado'];
const TL_IDX = { novo: 0, triagem: 1, entrevista_rh: 2, entrevista_cliente: 3, aprovado: 4, contratado: 4 };
function timeline(a) {
  const closed = SIDE.includes(a.stage); const reached = Math.max(0, ...a.history.map(h => TL_IDX[h.stage] ?? -1));
  const cur = closed ? -1 : TL_IDX[a.stage];
  return `<ol class="tl h">${TL.map((t, i) => {
    let cls = '', sub = '', mark = '';
    if (closed) { if (i < reached || (i === reached && i < 4 && false)) cls = 'done'; if (i === reached) cls = 'done'; if (i === 4 || i === reached + 1) { } }
    else if (i < cur) cls = 'done'; else if (i === cur && i < 4) cls = 'cur'; else if (i === 4 && cur === 4) cls = 'ok';
    if (i === 4) { if (closed) { cls = 'end'; t = a.stage === 'desistiu' ? 'Encerrado (desistência)' : 'Processo encerrado'; } else if (a.stage === 'contratado') t = 'Contratado(a)'; else if (a.stage === 'aprovado') t = 'Aprovado(a)'; }
    const h = a.history.find(x => TL_IDX[x.stage] === i && i < 4); if (h && i <= (closed ? reached : cur)) sub = `<span class="xs mut">${fdate(h.date)}</span>`;
    if (closed && i === 4) sub = `<span class="xs mut">${fdate(a.history[a.history.length - 1].date)}</span>`;
    if (cls === 'done' || cls === 'ok' || cls === 'end') mark = ico(cls === 'end' ? 'x' : 'check', 13);
    return `<li class="${cls}"><span class="d">${mark}</span><div><b>${t}</b><br>${sub}</div></li>`;
  }).join('')}</ol>`;
}
function myApps(c) {
  const u = curUser(), apps = candApps(c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const inv = db.invites.filter(i => i.candId === c.id && i.status === 'pendente');
  return pub(`<main class="wrapc narrow"><div class="ph"><div><h2>Minhas candidaturas</h2><p>Acompanhe cada processo e veja em que etapa você está.</p></div><a class="btn" href="#/vagas">Ver mais vagas</a></div>
  ${inv.map(i => { const j = by('jobs', i.jobId); return j ? `<div class="card mb" style="border-color:var(--sun)"><div class="flex between gap wrap"><div><span class="badge" style="--c:var(--sun)">Convite</span><h3 class="mt-s">${esc(j.title)}</h3><p class="mut sm">${esc(compName(j.companyId))} — o recrutador viu seu perfil no banco de talentos e convidou você.</p></div><a class="btn pri sm" href="#/candidatar/${j.id}">Ver vaga e candidatar-se</a></div></div>` : ''; }).join('')}
  ${apps.length ? apps.map(a => { const j = by('jobs', a.jobId); const iv = a.interview && !CLOSED.includes(a.stage) ? `<div class="note mt">${ico('cal', 14)} Entrevista ${fdt(a.interview.date)} (${a.interview.type}${a.interview.type === 'Online' ? ', link enviado por e-mail' : ''})</div>` : ''; return `<article class="card mb"><div class="flex between gap wrap"><div><h3><a href="#/vaga/${j.id}" style="color:inherit">${esc(j.title)}</a></h3><p class="mut sm">${esc(compName(j.companyId))} — enviada em ${fdate(a.date)}</p></div><span class="badge dot" style="--c:${ST[a.stage].c}">${CAND_LABEL[a.stage]}</span></div>${timeline(a)}<p class="sm mut mt-s">${CAND_HINT[a.stage]}</p>${iv}</article>`; }).join('') : `<div class="empty">Você ainda não se candidatou. <a href="#/vagas">Explore as vagas</a></div>`}</main>`);
}

/* ---------- Candidatura ---------- */
function applyView(jobId) {
  const j = by('jobs', jobId); if (!j) return notFound(); const u = curUser();
  if (!u) { go('/entrar?next=' + encodeURIComponent('/candidatar/' + jobId)); return ''; }
  if (u.role !== 'candidate') return pub(`<main class="wrapc narrow"><div class="empty">Você está logado como <b>${ROLE_NAME[u.role]}</b>. Para se candidatar, entre com um perfil de candidato.<p class="mt"><button class="btn" data-act="logout">Sair e trocar de conta</button></p></div></main>`);
  const c = candOf(u), exists = db.apps.find(a => a.jobId === j.id && a.candId === c.id);
  if (exists) return pub(`<main class="wrapc narrow"><div class="empty">Você já se candidatou a esta vaga. <a href="#/c/candidaturas">Acompanhar candidatura</a></div></main>`);
  if (j.status !== 'open') return pub(`<main class="wrapc narrow"><div class="empty">Esta vaga não está recebendo candidaturas no momento. <a href="#/vagas">Ver outras vagas</a></div></main>`);
  const p = completeness(c);
  const q = j.screening.map(q => `<div class="card tight" style="background:var(--card2)"><div class="field"><span>${esc(q.q)}</span>${q.type === 'yn' ? `<div class="opts"><label><input type="radio" name="q_${q.id}" value="Sim" required> Sim</label><label><input type="radio" name="q_${q.id}" value="Não"> Não</label></div>` : q.type === 'number' ? `<input name="q_${q.id}" type="number" min="0" step="100" value="${c.salary || ''}" required>` : `<textarea name="q_${q.id}" required></textarea>`}</div></div>`).join('');
  return pub(`<main class="wrapc narrow"><p class="sm mb"><a href="#/vaga/${j.id}">← Voltar para a vaga</a></p><h2>Candidatar-se: ${esc(j.title)}</h2><p class="mut mb">${esc(compName(j.companyId))} — ${esc(j.city)}/${j.state} — ${j.mode}</p>
  <form data-form="apply" data-job="${j.id}" class="stack"><div class="card"><div class="flex between gap wrap"><div class="flex gap">${avatar(c.name, 48)}<div><b>${esc(c.name)}</b><div class="mut sm">${esc(c.title)} — ${esc(c.city)}/${c.state}</div></div></div><a class="btn sm" href="#/c/perfil/editar">Editar perfil</a></div>
  <div class="mt"><div class="flex between sm"><span>Perfil ${p.pct}% completo</span>${p.missing.length ? `<span class="mut">Falta: ${esc(p.missing[0])}</span>` : ''}</div><div class="prog mt-s"><i style="width:${p.pct}%"></i></div></div><p class="sm mut mt-s">Usaremos seu perfil e currículo${c.resume ? ` (${esc(c.resume.name)})` : ''} nesta candidatura.</p></div>
  <div class="card"><h3>Complemente para esta vaga</h3><div class="fg">${fld('Pretensão salarial para esta vaga (R$)', inp('salary', c.salary, { type: 'number', req: 1, attrs: 'min="0" step="100"' }))}${fld('Disponibilidade para início', sel('avail', AVAIL, c.avail))}</div>${fld('Mensagem ao recrutador <small>(opcional)</small>', '<textarea name="note" placeholder="Por que você é uma boa escolha para esta vaga?"></textarea>')}</div>
  ${j.screening.length ? `<div class="card"><h3>Perguntas da vaga</h3><div class="stack-s">${q}</div></div>` : ''}
  <label class="check"><input type="checkbox" name="lgpd" required><span>Autorizo o uso dos meus dados por ${esc(compName(j.companyId))} e pelo Vínculo neste processo seletivo. <a href="#/privacidade" target="_blank">Política de privacidade</a></span></label>
  <button class="btn pri block">Enviar candidatura</button></form></main>`);
}
const applyDone = j => pub(`<main class="wrapc narrow"><div class="card success"><div class="big">🎉</div><h2 class="mt">Candidatura realizada com sucesso!</h2><p class="mut mt-s" style="max-width:460px;margin-inline:auto">Você se candidatou a <b>${esc(j.title)}</b> (${esc(compName(j.companyId))}). Acompanhe cada etapa em <b>Minhas candidaturas</b>: avisaremos você a cada mudança. Seu perfil também segue no banco de talentos para futuras vagas.</p><div class="flex gap wrap mt" style="justify-content:center"><a class="btn pri" href="#/c/candidaturas">Ir para minhas candidaturas</a><a class="btn" href="#/vagas">Ver outras vagas</a></div></div></main>`);

/* ---------- Privacidade do candidato e notificações ---------- */
function privacyView(c) {
  const req = db.delReqs.find(r => r.candId === c.id && r.status === 'pendente');
  return pub(`<main class="wrapc narrow"><div class="ph"><div><h2>Privacidade e seus dados</h2><p>Você tem controle sobre as informações que guardamos.</p></div></div><div class="stack">
  <div class="card"><h3>Consentimentos registrados</h3><div class="stack-s sm"><div class="flex between"><span>Termos de uso e política de privacidade</span><span class="badge" style="--c:var(--green)">Aceito em ${fdate(c.consent.date)}</span></div><div class="flex between"><span>Armazenamento no banco de talentos</span><span class="badge" style="--c:var(--green)">Autorizado</span></div><div class="flex between"><span>Convites para novas vagas</span><span class="badge" style="--c:${c.consent.marketing ? 'var(--green)' : 'var(--mut)'}">${c.consent.marketing ? 'Ativo' : 'Desativado'}</span></div></div><button class="btn sm mt" data-act="toggleMkt">${c.consent.marketing ? 'Desativar convites' : 'Ativar convites'}</button></div>
  <div class="card"><h3>O que a equipe vê e o que não vê</h3><p class="sm mut">Recrutadores veem seu perfil completo. Empresas clientes veem apenas o necessário, sem telefone, e-mail ou data de nascimento. Anotações e avaliações internas dos recrutadores nunca aparecem para você nem para as empresas.</p></div>
  <div class="card"><h3>Meus dados</h3><p class="sm mut mb">Veja tudo o que está guardado sobre você.</p><button class="btn" data-act="viewMyData">Ver meus dados</button></div>
  <div class="card" style="border-color:color-mix(in srgb,var(--red) 40%,var(--line))"><h3>Excluir meus dados</h3>${req ? `<p class="note">Solicitação enviada em ${fdate(req.date)}. Nossa equipe fará a exclusão e confirmará por e-mail.</p>` : `<p class="sm mut mb">Ao solicitar a exclusão, seu perfil sai do banco de talentos e seus dados pessoais são removidos, exceto o que a lei exigir manter. Esta ação não pode ser desfeita.</p><button class="btn danger" data-act="requestDelete">Solicitar exclusão dos meus dados</button>`}</div></div></main>`);
}
function notifView(u) {
  const list = db.notifs.filter(n => n.userId === u.id).slice(0, 60);
  const c = `<div class="ph"><div><h2>Notificações</h2><p>As mesmas mensagens também são enviadas por e-mail (simulado no MVP).</p></div><button class="btn sm" data-act="readAll">Marcar todas como lidas</button></div><div class="card" style="padding:0;overflow:hidden">${list.length ? list.map(n => `<a class="nt ${n.read ? '' : 'un'}" href="#${n.link || '#'}" data-act="readOne" data-id="${n.id}"><span class="dt"></span><div class="grow">${esc(n.text)}<div class="xs mut">${ago(n.date)}</div></div></a>`).join('') : '<div class="empty" style="border:0">Nenhuma notificação por enquanto.</div>'}</div>`;
  return u.role === 'candidate' ? pub(`<main class="wrapc narrow">${c}</main>`) : shell(c);
}
/* ---------- Painel (dashboard) ---------- */
function stats() {
  const apps = db.apps, jobs = db.jobs, live = a => !CLOSED.includes(a.stage);
  const hires = apps.filter(a => a.stage === 'contratado'), cands = db.cands.filter(c => !c.deleted);
  const days = hires.map(a => (new Date(a.hiredDate) - new Date(a.date)) / 864e5);
  return {
    open: jobs.filter(j => j.status === 'open').length, closed: jobs.filter(j => j.status === 'closed').length,
    total: cands.length, fresh: cands.filter(c => Date.now() - new Date(c.createdAt) < 30 * 864e5).length,
    active: uniq(apps.filter(live).map(a => a.candId)).length,
    inter: apps.filter(a => a.interview && new Date(a.interview.date) >= new Date() && ['entrevista_rh', 'entrevista_cliente'].includes(a.stage)).length,
    proc: apps.filter(a => ['triagem', 'entrevista_rh', 'entrevista_cliente', 'aprovado'].includes(a.stage)).length,
    hires: hires.length, conv: apps.length ? Math.round(hires.length / apps.length * 100) : 0,
    avgDays: days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : 0
  };
}
const hbars = (items, total) => { const m = Math.max(1, ...items.map(i => i.v)); return items.map(i => `<div class="hbar" style="--c:${i.c || 'var(--pri)'}"><span title="${esc(i.l)}">${esc(i.l)}</span><span class="tr"><i style="width:${Math.round(i.v / m * 100)}%"></i></span><b>${i.v}${total ? '' : ''}</b></div>`).join('') || '<p class="mut sm">Sem dados.</p>'; };
/* ---------- Indicador: novas vagas (7 dias e período de até 24 meses) ---------- */
const jobOpenDate = j => j.status === 'draft' ? null : (j.pubDate || j.createdAt || null);
const dayStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const NV_OPTS = [['7d', 'Últimos 7 dias'], ['30d', 'Últimos 30 dias'], ['90d', 'Últimos 90 dias'], ['6m', 'Últimos 6 meses'], ['12m', 'Últimos 12 meses'], ['24m', 'Últimos 24 meses'], ['custom', 'Personalizado']];
const isoDay = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const jobsIn = (a, b, list) => (list || db.jobs).filter(j => { const d = jobOpenDate(j); if (!d) return false; const t = new Date(d).getTime(); return t >= a.getTime() && t < b.getTime(); });
function nvRange() {
  const nv = ui.nv = ui.nv || { p: '30d' }, today = dayStart(new Date()), end = new Date(today.getTime() + 864e5);
  const min = new Date(today); min.setMonth(min.getMonth() - 24); min.setDate(1);
  let start;
  if (nv.p === 'custom') {
    const f = nv.from ? dayStart(nv.from + 'T00:00:00') : new Date(today.getTime() - 29 * 864e5), t = nv.to ? dayStart(nv.to + 'T00:00:00') : today;
    start = f < min ? min : f; let e = new Date(Math.min(t.getTime(), today.getTime()) + 864e5); if (e <= start) e = new Date(start.getTime() + 864e5);
    return { start, end: e, clamped: f < min };
  }
  if (nv.p.endsWith('m')) { start = new Date(today.getFullYear(), today.getMonth() - (parseInt(nv.p) - 1), 1); }
  else start = new Date(today.getTime() - (parseInt(nv.p) - 1) * 864e5);
  return { start, end };
}
function nvBuckets(start, end, list) {
  const days = Math.round((end - start) / 864e5), out = [], MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  if (days <= 14) { for (let t = new Date(start); t < end; t = new Date(t.getTime() + 864e5)) out.push({ a: t, b: new Date(t.getTime() + 864e5), l: String(t.getDate()).padStart(2, '0') + '/' + String(t.getMonth() + 1).padStart(2, '0') }); }
  else if (days <= 120) { for (let t = new Date(start); t < end; t = new Date(t.getTime() + 7 * 864e5)) { const b = new Date(Math.min(t.getTime() + 7 * 864e5, end.getTime())); out.push({ a: t, b, l: String(t.getDate()).padStart(2, '0') + '/' + String(t.getMonth() + 1).padStart(2, '0') }); } }
  else { for (let t = new Date(start.getFullYear(), start.getMonth(), 1); t < end; t = new Date(t.getFullYear(), t.getMonth() + 1, 1)) { const a = t < start ? start : t, b = new Date(Math.min(new Date(t.getFullYear(), t.getMonth() + 1, 1).getTime(), end.getTime())); out.push({ a, b, l: MES[t.getMonth()] + '/' + String(t.getFullYear()).slice(2) }); } }
  return out.map(x => ({ ...x, v: jobsIn(x.a, x.b, list).length }));
}
function nvSvg(items) {
  const n = items.length, W = Math.max(320, n * 30), H = 140, mx = Math.max(1, ...items.map(x => x.v)), bw = Math.min(26, W / n - 4), step = (W - 20) / n;
  return `<svg class="wk" viewBox="0 0 ${W} ${H}" role="img" aria-label="Novas vagas por período">${items.map((x, i) => { const bh = Math.round((H - 38) * x.v / mx), cx = 10 + step * i + step / 2; return `<rect x="${cx - bw / 2}" y="${H - 20 - bh}" width="${bw}" height="${Math.max(x.v ? 2 : 0, bh)}" rx="4"/>${x.v ? `<text class="v" x="${cx}" y="${H - 24 - bh}" text-anchor="middle">${x.v}</text>` : ''}${n <= 12 || i % 2 === 0 || i === n - 1 ? `<text x="${cx}" y="${H - 6}" text-anchor="middle">${x.l}</text>` : ''}`; }).join('')}</svg>`;
}
function newJobsCards(list) {
  const today = dayStart(new Date()), end = new Date(today.getTime() + 864e5), s7 = new Date(today.getTime() - 6 * 864e5), p7 = new Date(s7.getTime() - 7 * 864e5);
  const last7 = jobsIn(s7, end, list).sort((a, b) => new Date(jobOpenDate(b)) - new Date(jobOpenDate(a))), prev7 = jobsIn(p7, s7, list).length;
  const trend = (n, p, w = ['7 dias anteriores', 'nos 7 dias anteriores']) => p === 0 && n === 0 ? 'sem vagas novas nos dois períodos' : p === 0 ? `nenhuma ${w[1]}` : `${n >= p ? '▲ +' : '▼ '}${Math.round(100 * (n - p) / p)}% vs. ${w[0]} (${p})`;
  const r = nvRange(), nv = ui.nv, items = nvBuckets(r.start, r.end, list), tot = items.reduce((s, x) => s + x.v, 0), len = r.end - r.start, prev = jobsIn(new Date(r.start.getTime() - len), r.start, list).length;
  const gran = items.length && Math.round(len / 864e5) <= 14 ? 'por dia' : Math.round(len / 864e5) <= 120 ? 'por semana' : 'por mês', maxI = items.reduce((m, x) => x.v > (m ? m.v : -1) ? x : m, null);
  return `<div class="g2 mt"><div class="card"><h3>Novas vagas nos últimos 7 dias</h3><div class="flex gap-l wrap" style="align-items:baseline"><b style="font:700 40px var(--fd);letter-spacing:-.02em">${last7.length}</b><span class="sm mut">${trend(last7.length, prev7)}</span></div>
  ${last7.length ? `<ul class="sm mt-s" style="padding-left:18px;margin:6px 0 0">${last7.slice(0, 5).map(j => `<li><a href="#/s/vaga/${j.id}">${esc(j.title)}</a> <span class="mut">— ${esc(compName(j.companyId))}, ${fdate(jobOpenDate(j))}</span></li>`).join('')}${last7.length > 5 ? `<li class="mut">e mais ${last7.length - 5}</li>` : ''}</ul>` : '<p class="sm mut mt-s">Nenhuma vaga aberta neste período.</p>'}<p class="xs mut mt-s">Conta vagas publicadas (ou criadas, se nunca foram publicadas), sem rascunhos.</p></div>
  <div class="card"><div class="flex between gap wrap"><h3>Novas vagas por período</h3><select data-act="nvSel" aria-label="Período">${NV_OPTS.map(o => `<option value="${o[0]}" ${nv.p === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></div>
  ${nv.p === 'custom' ? `<div class="flex gap wrap mt-s"><label class="field"><span>De</span><input type="date" data-act="nvDate" data-k="from" value="${isoDay(r.start)}" min="${isoDay((() => { const m = new Date(); m.setMonth(m.getMonth() - 24); m.setDate(1); return m; })())}" max="${isoDay(new Date())}"></label><label class="field"><span>Até</span><input type="date" data-act="nvDate" data-k="to" value="${isoDay(new Date(r.end.getTime() - 864e5))}" max="${isoDay(new Date())}"></label></div>${r.clamped ? '<p class="xs mut mt-s">O período máximo é de 24 meses; o início foi ajustado.</p>' : ''}` : ''}
  <div class="flex gap-l wrap mt-s" style="align-items:baseline"><b style="font:700 40px var(--fd);letter-spacing:-.02em">${tot}</b><span class="sm mut">${tot === 1 ? 'vaga nova' : 'vagas novas'} no período · ${fdate(r.start)} a ${fdate(new Date(r.end.getTime() - 864e5))}</span></div>
  <p class="sm mut">${trend(tot, prev, ['período anterior', 'no período anterior'])}${maxI && maxI.v ? ` · pico em ${maxI.l} (${maxI.v})` : ''}</p>
  <div class="mt-s">${nvSvg(items)}</div><p class="xs mut">Barras ${gran}.</p></div></div>`;
}
/* ---------- Indicadores (tela própria): velocidade, funil, gargalos, motivos, clientes e recrutadores ---------- */
const IND_PERIODS = [['30d', 'Últimos 30 dias'], ['90d', 'Últimos 90 dias'], ['6m', 'Últimos 6 meses'], ['12m', 'Últimos 12 meses'], ['all', 'Todo o histórico']];
const avgOf = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
const r1 = v => v == null ? null : Math.round(v * 10) / 10;
function indRange() {
  const p = ui.ind.p, today = dayStart(new Date()), end = new Date(today.getTime() + 864e5); let start;
  if (p === 'all') return { start: new Date(0), end, prev: null };
  if (p.endsWith('m')) start = new Date(today.getFullYear(), today.getMonth() - (parseInt(p) - 1), 1); else start = new Date(today.getTime() - (parseInt(p) - 1) * 864e5);
  const len = end - start; return { start, end, prev: { start: new Date(start.getTime() - len), end: start } };
}
const inR = (d, a, b) => { if (!d) return false; const t = new Date(d).getTime(); return t >= a.getTime() && t < b.getTime(); };
function indMetrics(jobs, a, b) {
  const ids = new Set(jobs.map(j => j.id)), apps = db.apps.filter(x => ids.has(x.jobId)), inApps = apps.filter(x => inR(x.date, a, b));
  const hires = apps.filter(x => x.stage === 'contratado' && inR(x.hiredDate, a, b));
  const fills = jobs.map(j => { const h = apps.filter(x => x.jobId === j.id && x.hiredDate).map(x => x.hiredDate).sort()[0]; if (!h || !inR(h, a, b)) return null; const st = j.pubDate || (jobApps(j.id).map(x => x.date).sort()[0]); return st ? dayDiff(st, h) : null; }).filter(x => x != null);
  const resp = inApps.filter(x => x.history.length > 1).map(x => (new Date(x.history[1].date) - new Date(x.date)) / 864e5);
  const exits = apps.flatMap(x => x.history.filter(h => SIDE.includes(h.stage) && inR(h.date, a, b)).map(h => ({ reason: h.reason || x.reason || 'Motivo não registrado' })));
  return { apps, inApps, hires: hires.length, fills, fill: r1(avgOf(fills)), conv: inApps.length >= 5 ? Math.round(100 * inApps.filter(x => x.stage === 'contratado').length / inApps.length) : null, resp: r1(avgOf(resp)), exits };
}
function indDelta(cur, prev, lowerBetter, suffix) {
  if (cur == null || prev == null || prev === 0 && cur === 0) return '';
  const diff = prev === 0 ? null : Math.round(100 * (cur - prev) / prev); if (diff === 0) return '<small>igual ao período anterior</small>';
  const good = lowerBetter ? cur < prev : cur > prev, col = good ? 'var(--green)' : 'var(--red)';
  return `<small style="color:${col}">${cur > prev ? '▲' : '▼'} ${diff == null ? 'de 0 no período anterior' : (diff > 0 ? '+' : '') + diff + '% vs. período anterior'}${suffix || ''}</small>`;
}
function indStageTimes(apps, a, b) {
  const acc = {}; apps.filter(x => inR(x.date, a, b)).forEach(x => x.history.forEach((h, i) => { const n = x.history[i + 1]; if (!n || CLOSED.includes(h.stage)) return; (acc[h.stage] = acc[h.stage] || []).push((new Date(n.date) - new Date(h.date)) / 864e5); }));
  return ['novo', 'triagem', 'entrevista_rh', 'entrevista_cliente', 'aprovado'].map(s => ({ s, n: (acc[s] || []).length, d: r1(avgOf(acc[s] || [])) }));
}
const IND_SUBS = [
  ['geral', 'Visão geral', 'Situação de hoje da operação de recrutamento.'],
  ['vagas', 'Vagas', 'Novas vagas, situação das vagas e as que mais recebem candidatos.'],
  ['funil', 'Funil e conversão', 'Quantos candidatos chegam a cada etapa e quantos viram contratação.'],
  ['velocidade', 'Velocidade', 'Quanto tempo o processo leva e onde ele trava.'],
  ['motivos', 'Motivos de saída', 'Por que candidatos são reprovados ou desistem.'],
  ['clientes', 'Clientes', 'Resultado por empresa cliente.'],
  ['recrutadores', 'Recrutadores', 'Resultado por recrutador.']
];
function indCtx() {
  const u = curUser(), ind = ui.ind = ui.ind || { p: '90d', co: '', rec: '' }, rg = indRange(), staffList = db.users.filter(isStaff);
  const scope = db.jobs.filter(j => j.status !== 'draft' && (!ind.co || j.companyId === ind.co) && (!ind.rec || j.recruiterId === ind.rec));
  const cur = indMetrics(scope, rg.start, rg.end), prv = rg.prev ? indMetrics(scope, rg.prev.start, rg.prev.end) : null;
  const open = scope.filter(j => j.status === 'open'), stats7 = open.map(jobStats), stuck = stats7.filter(s => s.idle >= 7).sort((a, b) => b.idle - a.idle), empty = stats7.filter(s => !s.apps.length && s.days >= 3);
  return { u, ind, rg, staffList, scope, cur, prv, open, stuck, empty };
}
const indK = (l, v, sub, tip) => `<div class="kpi"${tip ? ` title="${esc(tip)}"` : ''}><span>${l}</span><b>${v}</b>${sub || ''}</div>`;
const dayTxt = v => v == null ? '—' : v + (v === 1 ? ' dia' : ' dias');
function indFilters(c, withPeriod) {
  const ind = c.ind, sel1 = (k2, arr, ph) => `<select data-act="indSel" data-k="${k2}" aria-label="${esc(ph)}">${opts(arr, ind[k2], ph)}</select>`;
  return `<div class="card mb"><div class="flex gap wrap" style="align-items:flex-end">${withPeriod ? `<label class="field" style="min-width:190px"><span>Período</span><select data-act="indSel" data-k="p">${IND_PERIODS.map(o => `<option value="${o[0]}" ${ind.p === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('')}</select></label>` : ''}<label class="field" style="min-width:220px"><span>Cliente</span>${sel1('co', db.companies.map(x => [x.id, x.name]), 'Todos os clientes')}</label><label class="field" style="min-width:200px"><span>Recrutador</span>${sel1('rec', c.staffList.map(x => [x.id, x.name]), 'Todos')}</label></div>${withPeriod ? `<p class="xs mut mt-s">${ind.p === 'all' ? 'Todo o histórico' : fdate(c.rg.start) + ' a ' + fdate(new Date(c.rg.end.getTime() - 864e5))}. Candidaturas, contratações e saídas são contadas pela data em que ocorreram; vagas abertas e paradas mostram a situação de hoje.</p>` : ''}</div>`;
}
function indRowFor(c, jobs, label, extra) {
  const m = indMetrics(jobs, c.rg.start, c.rg.end), op = jobs.filter(j => j.status === 'open'), st = op.map(jobStats).filter(s => s.idle >= 7).length;
  return { label, op: op.length, cl: jobs.filter(j => j.status === 'closed').length, apps: m.inApps.length, hires: m.hires, fill: m.fill, nf: m.fills.length, conv: m.conv, stuck: st, live: m.apps.filter(x => !CLOSED.includes(x.stage)).length, ...extra };
}
function indTable(rows, first, link) {
  return `<div class="tw"><table><thead><tr><th>${first}</th><th>Vagas abertas</th><th>Encerradas</th><th>Candidaturas</th><th>Em andamento</th><th>Contratações</th><th>Tempo de fechamento</th><th>Taxa de contratação</th><th>Vagas paradas</th>${link ? '<th></th>' : ''}</tr></thead><tbody>${rows.map(r => `<tr><td class="b">${esc(r.label)}</td><td>${r.op}</td><td>${r.cl}</td><td>${r.apps}</td><td>${r.live}</td><td>${r.hires}</td><td>${r.fill == null ? '—' : dayTxt(r.fill) + ` <span class="xs mut">(${r.nf})</span>`}</td><td>${r.conv == null ? '<span class="mut" title="Menos de 5 candidaturas no período">—</span>' : r.conv + '%'}</td><td>${r.stuck ? `<span class="badge" style="--c:var(--sun)">${r.stuck}</span>` : '0'}</td>${link ? `<td style="text-align:right"><button class="btn sm" data-act="rpOpenCo" data-id="${r.id}">Relatório</button></td>` : ''}</tr>`).join('') || '<tr><td colspan="10" class="center mut" style="padding:24px">Sem dados para os filtros escolhidos.</td></tr>'}</tbody></table></div>`;
}
function indicadoresView(sub) {
  sub = IND_SUBS.some(x => x[0] === sub) ? sub : 'geral';
  const u = curUser(), meta = IND_SUBS.find(x => x[0] === sub), title = sub === 'recrutadores' && u.role !== 'admin' ? 'Meus números' : meta[1];
  const head = `<p class="sm mb"><a href="#/s/indicadores/geral">Indicadores</a> / ${esc(title)}</p>${pageHead(esc(title), meta[2])}`;
  if (sub === 'geral') return shell(head + indGeral());
  const c = indCtx(), { ind, rg, cur, prv, scope } = c; let body = '';
  if (sub === 'vagas') {
    const js = db.jobs.filter(j => (!ind.co || j.companyId === ind.co) && (!ind.rec || j.recruiterId === ind.rec)), cnt = s2 => js.filter(j => j.status === s2).length;
    const top = js.filter(j => j.status !== 'draft').map(j => ({ l: j.title + ' (' + compName(j.companyId).split(' ')[0] + ')', v: jobApps(j.id).length })).sort((a, b) => b.v - a.v).slice(0, 6);
    body = indFilters(c, false).replace(/<p class="xs[^]*?<\/p>/, '') + `<div class="kpis">${indK('Vagas abertas', cnt('open'))}${indK('Pausadas', cnt('paused'))}${indK('Encerradas', cnt('closed'))}${indK('Rascunhos', cnt('draft'))}</div>${newJobsCards(js)}<div class="card mt"><h3>Vagas com mais candidatos</h3><div class="wide-lbl">${hbars(top)}</div></div>`;
  } else if (sub === 'funil') {
    const reached = RPT_FUNNEL.map(st => ({ st, v: cur.inApps.filter(x => x.history.some(h => h.stage === st)).length }));
    body = indFilters(c, true) + `<div class="kpis">${indK('Candidaturas', cur.inApps.length, prv ? indDelta(cur.inApps.length, prv.inApps.length, false) : '')}${indK('Contratações', cur.hires, prv ? indDelta(cur.hires, prv.hires, false) : '')}${indK('Taxa de contratação', cur.conv == null ? '—' : cur.conv + '%', cur.conv == null ? '<small>dados insuficientes (menos de 5)</small>' : `<small>de ${cur.inApps.length} candidaturas</small>` + (prv && prv.conv != null ? indDelta(cur.conv, prv.conv, false) : ''), 'Das candidaturas recebidas no período, quantas viraram contratação')}</div>
    <div class="card mt"><h3>Funil de conversão</h3><p class="xs mut mb">Candidaturas recebidas no período e quantas chegaram a cada etapa.</p><div class="tw" style="border:0"><table><thead><tr><th>Etapa</th><th>Chegaram</th><th>Da etapa anterior</th><th>Do total</th></tr></thead><tbody>${reached.map((r, i) => `<tr><td><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${ST[r.st].c};margin-right:6px"></span>${ST[r.st].name}</td><td class="b">${r.v}</td><td>${i && reached[i - 1].v ? Math.round(100 * r.v / reached[i - 1].v) + '%' : '—'}</td><td>${reached[0].v ? Math.round(100 * r.v / reached[0].v) + '%' : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  } else if (sub === 'velocidade') {
    const stg = indStageTimes(cur.apps, rg.start, rg.end), worst = stg.filter(x => x.d != null && x.n >= 3).sort((a, b) => b.d - a.d)[0], mxd = Math.max(1, ...stg.map(y => y.d || 0));
    body = indFilters(c, true) + `<div class="kpis">${indK('Tempo de fechamento', cur.fill == null ? '—' : dayTxt(cur.fill), cur.fills.length ? `<small>${cur.fills.length} ${cur.fills.length === 1 ? 'vaga fechada' : 'vagas fechadas'}</small>` + (prv ? indDelta(cur.fill, prv.fill, true) : '') : '<small>sem fechamentos no período</small>', 'Dias entre a abertura da vaga e a primeira contratação, nas vagas que fecharam no período')}${indK('Primeira resposta', cur.resp == null ? '—' : dayTxt(cur.resp), '<small>da candidatura ao 1º contato</small>' + (prv ? indDelta(cur.resp, prv.resp, true) : ''), 'Tempo médio entre receber a candidatura e a primeira movimentação')}${indK('Vagas paradas', c.stuck.length, '<small>sem movimento há 7+ dias</small>')}</div>
    <div class="card mt"><h3>Tempo em cada etapa</h3><p class="xs mut mb">Média de dias que o candidato fica em cada etapa antes de avançar.</p>${stg.some(x => x.d != null) ? '<div class="wide-lbl">' + stg.map(x => `<div class="hbar" style="--c:${ST[x.s].c}"><span>${x.s === 'entrevista_cliente' ? 'Aguardando cliente' : ST[x.s].name}</span><span class="tr"><i style="width:${x.d == null ? 0 : Math.round(100 * x.d / mxd)}%"></i></span><b>${x.d == null ? '—' : x.d + ' d'}</b></div>`).join('') + '</div>' + (worst ? `<p class="sm mt-s"><b>Gargalo:</b> ${worst.s === 'entrevista_cliente' ? 'a espera pelo retorno do cliente' : 'a etapa "' + ST[worst.s].name + '"'} (${worst.d} dias em média).</p>` : '') : '<p class="mut sm">Sem movimentações suficientes no período.</p>'}</div>
    <div class="card mt"><h3>Vagas que precisam de atenção</h3>${c.stuck.length || c.empty.length ? `<div class="tw" style="border:0"><table><thead><tr><th>Vaga</th><th>Cliente</th><th>Recrutador</th><th>Situação</th><th></th></tr></thead><tbody>${c.stuck.map(s => `<tr><td class="b">${esc(s.j.title)}</td><td>${esc(compName(s.j.companyId))}</td><td>${esc((by('users', s.j.recruiterId) || {}).name || '—')}</td><td><span class="badge" style="--c:var(--sun)">${s.idle} dias sem movimento</span> <span class="xs mut">${s.live.length} em andamento</span></td><td style="text-align:right;white-space:nowrap"><a class="btn sm" href="#/s/vaga/${s.j.id}">Kanban</a> <a class="btn sm" href="#/s/relatorios/ver?jobs=${s.j.id}">Relatório</a></td></tr>`).join('')}${c.empty.map(s => `<tr><td class="b">${esc(s.j.title)}</td><td>${esc(compName(s.j.companyId))}</td><td>${esc((by('users', s.j.recruiterId) || {}).name || '—')}</td><td><span class="badge" style="--c:var(--red)">Sem candidaturas há ${s.days} dias</span></td><td style="text-align:right"><a class="btn sm" href="#/s/vaga/${s.j.id}">Kanban</a></td></tr>`).join('')}</tbody></table></div>` : '<p class="sm mut">Nenhuma vaga parada. Todas as vagas abertas tiveram movimento nos últimos 7 dias.</p>'}</div>`;
  } else if (sub === 'motivos') {
    const rs = {}; cur.exits.forEach(e => { rs[e.reason] = (rs[e.reason] || 0) + 1; });
    const rsList = Object.entries(rs).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ l, v, c: l === 'Motivo não registrado' ? 'var(--mut)' : 'var(--pri)' }));
    body = indFilters(c, true) + `<div class="card"><h3>Motivos de saída</h3><p class="xs mut mb">Candidatos que foram reprovados ou desistiram no período (${cur.exits.length}).</p><div class="wide-lbl">${hbars(rsList)}</div>${rs['Motivo não registrado'] ? `<p class="xs mut mt-s">${rs['Motivo não registrado']} saída(s) sem motivo registrado. Registrar o motivo deixa este indicador mais confiável.</p>` : ''}</div>`;
  } else if (sub === 'clientes') {
    const byCo = db.companies.filter(x => !ind.co || x.id === ind.co).map(x => indRowFor(c, scope.filter(j => j.companyId === x.id), x.name, { id: x.id })).filter(r => r.op + r.cl + r.apps > 0).sort((a, b) => b.hires - a.hires || b.apps - a.apps);
    body = indFilters(c, true) + indTable(byCo, 'Cliente', true);
  } else {
    const recs = c.staffList.filter(x => (!ind.rec || x.id === ind.rec) && (u.role === 'admin' || x.id === u.id)), byRec = recs.map(x => indRowFor(c, scope.filter(j => j.recruiterId === x.id), x.name + (x.id === u.id ? ' (você)' : ''), { id: x.id })).filter(r => r.op + r.cl + r.apps > 0).sort((a, b) => b.hires - a.hires);
    body = indFilters(c, true) + indTable(byRec, 'Recrutador', false) + (u.role === 'admin' ? '<p class="xs mut mt-s">Use estes números para apoiar a equipe e equilibrar a carga de trabalho, não para comparar pessoas isoladamente: o tipo e a dificuldade das vagas mudam o resultado. Recrutadores veem apenas os próprios números.</p>' : '');
  }
  const defs = `<details class="mt"><summary class="b">Como cada indicador é calculado</summary><ul class="sm mt-s" style="padding-left:18px"><li><b>Tempo de fechamento:</b> dias entre a abertura da vaga e a primeira contratação, nas vagas que fecharam no período.</li><li><b>Taxa de contratação:</b> das candidaturas recebidas no período, quantas viraram contratação. Aparece só com 5 ou mais candidaturas, para não enganar com amostras pequenas.</li><li><b>Primeira resposta:</b> dias entre receber a candidatura e a primeira movimentação feita pela equipe.</li><li><b>Tempo em cada etapa:</b> média de dias entre entrar na etapa e avançar. "Aguardando cliente" é o tempo na etapa de entrevista com a empresa.</li><li><b>Vaga parada:</b> vaga aberta sem nenhuma movimento há 7 dias ou mais.</li><li><b>Comparação:</b> o período anterior tem o mesmo tamanho do escolhido. Setas verdes indicam melhora; para tempos, quanto menor, melhor.</li></ul></details>`;
  return shell(head + body + (['funil', 'velocidade', 'clientes', 'recrutadores'].includes(sub) ? defs : ''));
}
function indGeral() {
  const s = stats(), apps = db.apps;
  const weeks = [...Array(8)].map((_, i) => { const end = Date.now() - (7 - i) * 7 * 864e5, st = end - 7 * 864e5; return { l: i === 7 ? 'Atual' : `-${7 - i}s`, v: apps.filter(a => { const t = new Date(a.date).getTime(); return t > st && t <= end + 864e5; }).length }; });
  const mx = Math.max(1, ...weeks.map(w => w.v)), W = 320, H = 130;
  const svg = `<svg class="wk" viewBox="0 0 ${W} ${H}" role="img" aria-label="Novas candidaturas por semana">${weeks.map((w, i) => { const bh = Math.round((H - 34) * w.v / mx), x = 10 + i * 38; return `<rect x="${x}" y="${H - 18 - bh}" width="26" height="${bh}" rx="4"/><text class="v" x="${x + 13}" y="${H - 22 - bh}" text-anchor="middle">${w.v}</text><text x="${x + 13}" y="${H - 5}" text-anchor="middle">${w.l}</text>`; }).join('')}</svg>`;
  const byStage = STAGES.map(st => ({ l: st.name, v: apps.filter(a => a.stage === st.id).length, c: st.c }));
  const topJobs = db.jobs.map(j => ({ l: j.title + ' (' + compName(j.companyId).split(' ')[0] + ')', v: jobApps(j.id).length })).sort((a, b) => b.v - a.v).slice(0, 6);
  const reached = ['novo', 'triagem', 'entrevista_rh', 'entrevista_cliente', 'aprovado', 'contratado'].map(id => ({ id, v: apps.filter(a => a.history.some(h => h.stage === id)).length }));
  const funnel = reached.map(r => ({ l: ST[r.id].short, v: r.v, c: ST[r.id].c }));
  const k = (l, v, sub) => `<div class="kpi"><span>${l}</span><b>${v}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  return `<div class="kpis">${k('Vagas abertas', s.open)}${k('Vagas encerradas', s.closed)}${k('Total de candidatos', s.total)}${k('Candidatos ativos', s.active, 'com processo em andamento')}${k('Novos (30 dias)', s.fresh)}${k('Processos em andamento', s.proc)}${k('Entrevistas agendadas', s.inter)}${k('Contratações', s.hires)}${k('Conversão', s.conv + '%', 'candidaturas em contratação')}${k('Tempo médio', s.avgDays ? s.avgDays + ' dias' : '—', 'candidatura até contratação')}</div>
  <div class="g2 mt"><div class="card"><h3>Candidatos por etapa</h3>${hbars(byStage)}</div><div class="card"><h3>Novas candidaturas por semana</h3>${svg}</div>
  <div class="card"><h3>Vagas com mais candidatos</h3>${hbars(topJobs)}</div><div class="card"><h3>Funil: quantos chegaram a cada etapa</h3>${hbars(funnel)}</div></div>`;
}
const weekSeries = (dates, n) => { const now = Date.now(), W = 7 * 864e5, out = Array(n).fill(0); dates.forEach(d => { if (!d) return; const k = Math.floor((now - new Date(d)) / W); if (k >= 0 && k < n) out[n - 1 - k]++; }); return out; };
const sparkBars = vals => { const mx = Math.max(1, ...vals); return `<div class="spark" aria-hidden="true">${vals.map((v, i) => `<i class="${i === vals.length - 1 ? 'hi' : ''}" style="height:${Math.max(10, Math.round(100 * v / mx))}%"></i>`).join('')}</div>`; };
function dashboard() {
  const u = curUser(), apps = db.apps, now = Date.now(), hr = new Date().getHours(), hi = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  const act = apps.filter(a => !CLOSED.includes(a.stage)), novas = act.filter(a => a.stage === 'novo'), velhas = novas.filter(a => now - new Date(a.date) > 2 * 864e5);
  const todo = [];
  if (velhas.length) todo.push(['search', 'coral', `${velhas.length} candidaturas novas aguardam triagem há mais de 2 dias`, '#/s/triagem', 'Triar']);
  const rq = db.requests.filter(r => r.status === 'nova').length; if (rq) todo.push(['inbox', 'blue', `${rq} solicitação de vaga de empresa cliente`, '#/s/solicitacoes', 'Ver']);
  const cl = apps.filter(a => a.stage === 'entrevista_cliente' && !a.clientDecision).length; if (cl) todo.push(['users', 'lilac', `${cl} candidatos aguardando avaliação das empresas`, '#/s/kanban', 'Acompanhar']);
  const dr = db.delReqs.filter(r => r.status === 'pendente').length; if (dr && u.role === 'admin') todo.push(['shield', 'green', `${dr} pedido de exclusão de dados (LGPD)`, '#/s/lgpd', 'Revisar']);
  const ncands = db.cands.filter(c => !c.deleted), openJobs = db.jobs.filter(j => j.status === 'open');
  const hero = u.role === 'admin' ? { l: 'Candidatos cadastrados', v: ncands.length, t: 'perfis no banco de talentos', s: weekSeries(ncands.map(c => c.createdAt), 12), href: '#/s/banco', b: 'Abrir banco' } : { l: 'Vagas abertas', v: openJobs.length, t: 'recebendo candidaturas', s: weekSeries(apps.map(a => a.date), 12), href: '#/s/vagas', b: 'Ver vagas' };
  const nextIv = apps.filter(a => a.interview && !CLOSED.includes(a.stage) && new Date(a.interview.date) >= now).sort((x, y) => new Date(x.interview.date) - new Date(y.interview.date)).slice(0, 3);
  const jobs = openJobs.map(j => ({ j, n: jobApps(j.id).length, h: jobApps(j.id).filter(a => a.stage === 'contratado').length })).sort((x, y) => y.n - x.n).slice(0, 4);
  const recent = db.audit.slice(0, 6);
  return shell(`${pageHead(hi + ', ' + esc(u.name.split(' ')[0]), 'O que precisa da sua atenção hoje.', `<a class="btn pri" href="#/s/vaga/nova">${ico('plus', 16)} Nova vaga</a><a class="btn" href="#/s/banco">Buscar no banco</a><a class="btn" href="#/s/indicadores/geral">${ico('trend', 16)} Ver indicadores</a>`)}
  <div class="dash"><section class="dc dc-dark"><span class="dl">${hero.l}</span><b class="dn">${hero.v}</b><span class="ds">${hero.t}</span>${sparkBars(hero.s)}<a class="dlink" href="${hero.href}">${hero.b} ${ico('right', 14)}</a></section>
  <section class="dc dc-coral"><span class="dl">Aguardando triagem</span><b class="dn">${novas.length}</b><span class="ds">${velhas.length ? velhas.length + ' há mais de 2 dias' : 'tudo dentro do prazo'}</span><a class="btn dwhite" href="#/s/triagem">Triar agora ${ico('right', 14)}</a></section>
  <section class="dc"><h3>Próximas entrevistas</h3>${nextIv.length ? `<ul class="dlist">${nextIv.map(a => { const c = by('cands', a.candId), j = by('jobs', a.jobId); return `<li>${avatar(c.name, 34)}<div class="grow"><div class="b sm">${esc(c.name)}</div><div class="xs mut">${esc(j ? j.title : '')} · ${a.interview.type}</div></div><span class="badge">${fdt(a.interview.date)}</span></li>`; }).join('')}</ul>` : '<p class="mut sm">Nenhuma entrevista agendada.</p>'}</section>
  <section class="dc dc-wide"><h3>Precisa de atenção</h3>${todo.length ? `<ul class="dtodo">${todo.map(t => `<li><span class="ni" data-c="${t[1]}">${ico(t[0], 18)}</span><span class="grow">${t[2]}</span><a class="btn sm" href="${t[3]}">${t[4]}</a></li>`).join('')}</ul>` : '<p class="mut">Nada pendente. Bom trabalho!</p>'}</section>
  <section class="dc"><h3>Vagas em andamento</h3>${jobs.length ? `<ul class="djobs">${jobs.map(x => `<li><a href="#/s/vaga/${x.j.id}"><div class="b sm">${esc(x.j.title)}</div><div class="xs mut">${esc(compName(x.j.companyId))} · ${x.n} ${x.n === 1 ? 'candidato' : 'candidatos'}</div><div class="prog mt-s"><i style="width:${Math.min(100, Math.round(100 * x.h / (x.j.qty || 1)))}%"></i></div><div class="xs mut">${x.h}/${x.j.qty || 1} ${(x.j.qty || 1) === 1 ? 'contratado' : 'contratados'}</div></a></li>`).join('')}</ul>` : '<p class="mut sm">Nenhuma vaga aberta.</p>'}</section>
  <section class="dc dc-full"><h3>Atividade recente</h3>${recent.length ? `<ul class="dact">${recent.map(l => `<li><span class="dot"></span><div class="grow"><span class="b sm">${esc(l.action)}</span> <span class="sm">${esc(l.ref || '')}</span><div class="xs mut">${esc(l.user)}</div></div><span class="xs mut">${ago(l.date)}</span></li>`).join('')}</ul>` : '<p class="mut sm">Sem atividade registrada.</p>'}</section></div>`);
}

/* ---------- Vagas (gestão) ---------- */
const JOB_ST = { open: ['Aberta', 'var(--green)'], draft: ['Rascunho', 'var(--mut)'], paused: ['Pausada', 'var(--sun)'], closed: ['Encerrada', 'var(--red)'] };
const jobStBadge = s => `<span class="badge dot" style="--c:${JOB_ST[s][1]}">${JOB_ST[s][0]}</span>`;
/* ---------- Relatórios por cliente e por vaga ---------- */
const RPT_COLORS = ['#0E5A4E', '#3A6FD8', '#D98A0B', '#C4487D', '#7A5BD0', '#2E9E5B', '#D8493E', '#7B8794'];
const median = a => { a = a.filter(x => x > 0).sort((x, y) => x - y); if (!a.length) return 0; const m = a.length >> 1; return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2); };
const dayDiff = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 864e5));
const pct = (n, t) => t ? Math.round(100 * n / t) : 0;
const RPT_FUNNEL = ['novo', 'triagem', 'entrevista_rh', 'entrevista_cliente', 'aprovado', 'contratado'];
function jobStats(j) {
  const apps = jobApps(j.id).slice().sort((a, b) => new Date(a.date) - new Date(b.date)), now = nowISO();
  const hired = apps.filter(a => a.stage === 'contratado'), exits = apps.filter(a => SIDE.includes(a.stage)), live = apps.filter(a => !CLOSED.includes(a.stage));
  const prets = apps.map(a => +a.salary || (by('cands', a.candId) || {}).salary || 0).filter(x => x > 0);
  const med = median(prets), avg = prets.length ? Math.round(prets.reduce((s, x) => s + x, 0) / prets.length) : 0, teto = j.salMax || 0;
  const evs = apps.flatMap(a => a.history.map(h => h.date)).sort(), last = evs[evs.length - 1] || null;
  const start = j.pubDate || (apps[0] && apps[0].date) || null, hd = hired.map(a => a.hiredDate).filter(Boolean).sort();
  const end = j.status === 'closed' ? (j.closedAt || hd[hd.length - 1] || last || now) : now;
  const reasons = {}; exits.forEach(a => { const r = a.reason || 'Motivo não registrado'; reasons[r] = (reasons[r] || 0) + 1; });
  const reached = Object.fromEntries(RPT_FUNNEL.map(s => [s, apps.filter(a => a.history.some(h => h.stage === s)).length]));
  const first = s => { const d = apps.flatMap(a => a.history.filter(h => h.stage === s).map(h => h.date)).sort(); return d[0] || null; };
  return { j, apps, hired, exits, live, prets, med, avg, teto, within: prets.filter(x => x <= teto).length, dist: teto && med ? Math.round(100 * (med - teto) / teto) : null,
    days: start ? dayDiff(start, end) : 0, start, end, last, idle: j.status === 'open' && last ? dayDiff(last, now) : 0, contacted: apps.length + db.invites.filter(i => i.jobId === j.id && !apps.some(a => a.candId === i.candId)).length,
    reasons, reached, timeline: [['Vaga publicada', start], ['Primeira candidatura', apps[0] && apps[0].date], ['Primeira triagem', first('triagem')], ['Primeira entrevista com RH', first('entrevista_rh')], ['Primeiro encaminhamento ao cliente', first('entrevista_cliente')], ['Contratação', hd[0] || null]].filter(x => x[1]) };
}
const reasonGroup = r => /Sal[aá]rio|Pretens/i.test(r) ? 'sal' : /retorno|compareceu/i.test(r) ? 'sil' : /t[eé]cnico|Requisito/i.test(r) ? 'tec' : /Modelo/i.test(r) ? 'mod' : /outra proposta/i.test(r) ? 'out' : 'oth';
function jobDiag(s) {
  const d = [], g = [], j = s.j, ex = s.exits.length, cnt = k => s.exits.filter(a => reasonGroup(a.reason || '') === k).length, round50 = v => Math.ceil(v / 50) * 50;
  if (!s.apps.length) { d.push(['Ainda sem candidaturas', 'A vaga não recebeu candidaturas até agora.', 'warn']); g.push(['Divulgar a vaga em novos canais e buscar ativamente no banco de talentos', 'Alto: gera os primeiros candidatos']); }
  if (s.dist != null && s.dist > 5 && s.prets.length >= 3) { d.push(['Salário abaixo da pretensão dos candidatos', `A pretensão mediana (${brl(s.med)}) está ${s.dist}% acima do teto de ${brl(s.teto)}. Apenas ${s.within} de ${s.prets.length} candidatos pedem até o teto.`, 'bad']); g.push([`Rever o teto da vaga para cerca de ${brl(round50(s.med))} (mediana das pretensões) ou reforçar benefícios e plano de carreira`, 'Alto: reduz desistências por salário']); }
  if (ex >= 3 && pct(cnt('sal'), ex) >= 25) d.push(['Salário é um dos principais motivos de saída', `${cnt('sal')} de ${ex} saídas (${pct(cnt('sal'), ex)}%) foram por salário ou pretensão acima da faixa.`, 'bad']);
  if (ex >= 3 && pct(cnt('sil'), ex) >= 20) { d.push(['Silêncio dos candidatos', `${cnt('sil')} de ${ex} saídas (${pct(cnt('sil'), ex)}%) foram por falta de retorno ou não comparecimento.`, 'warn']); g.push(['Confirmar o interesse por mensagem curta antes de agendar e combinar um prazo de resposta', 'Médio: reduz faltas e retrabalho']); }
  if (ex >= 3 && pct(cnt('tec'), ex) >= 25) { d.push(['Perfil técnico fora do esperado', `${cnt('tec')} de ${ex} saídas (${pct(cnt('tec'), ex)}%) foram por perfil técnico ou requisito não atendido.`, 'warn']); g.push(['Avaliar profissionais em formação, com plano de desenvolvimento, e revisar os requisitos obrigatórios', 'Alto: amplia o número de candidatos']); }
  if (ex >= 3 && pct(cnt('mod'), ex) >= 15) { d.push(['Modelo de trabalho afasta candidatos', `${cnt('mod')} de ${ex} saídas (${pct(cnt('mod'), ex)}%) foram pelo modelo de trabalho (${j.mode.toLowerCase()}).`, 'warn']); g.push(['Divulgar claramente o modelo de trabalho e oferecer a primeira conversa online', 'Médio: filtra quem não aceita o modelo']); }
  if (s.idle >= 7) { d.push(['Decisão lenta', `Há ${s.idle} dias sem movimentação no processo desta vaga.`, 'warn']); g.push(['Combinar com o gestor um retorno em até 48 horas após cada entrevista', 'Alto: evita perder finalistas']); }
  const f = s.reached; let worst = null; for (let i = 0; i < 4; i++) { const a = f[RPT_FUNNEL[i]], b = f[RPT_FUNNEL[i + 1]]; if (a - b >= 3 && (!worst || a - b > worst[0])) worst = [a - b, i, a, b]; }
  if (worst) d.push(['Maior perda no funil', `De ${worst[2]} candidatos que chegaram a "${ST[RPT_FUNNEL[worst[1]]].name}", ${worst[3]} seguiram para "${ST[RPT_FUNNEL[worst[1] + 1]].name}".`, 'info']);
  if (j.status === 'open' && s.apps.length && f.entrevista_cliente < 2 && s.days > 15) { d.push(['Poucos finalistas', `Somente ${f.entrevista_cliente} candidato(s) chegaram à entrevista com a empresa em ${s.days} dias.`, 'warn']); g.push(['Ampliar a busca ativa no banco de talentos para formar ao menos três finalistas', 'Médio: dá opção de escolha ao gestor']); }
  if (s.hired.length) d.push(['Vaga com contratação', `${s.hired.length} contratação(ões) em ${s.days} dias de processo.`, 'ok']);
  if (!d.length) d.push(['Processo dentro do esperado', 'Os dados atuais não mostram pontos críticos.', 'ok']);
  return { d, g };
}
function rptPrefix(list) {
  const used = new Set();
  return list.map(s => { const w = strip(s.j.title).split(/\s+/).filter(x => x.length > 1 && !AI_STOP.has(x)); let p = (w.map(x => x[0]).join('').slice(0, 3) || 'V').toUpperCase(), n = 1, base = p; while (used.has(p)) p = base + (++n); used.add(p); return p; });
}
function rptRows(s, pfx, names) {
  return s.apps.map((a, i) => { const c = by('cands', a.candId) || {}; return { a, code: pfx + (i + 1), name: names ? (c.name || '—') : '', date: a.date, pret: +a.salary || c.salary || 0, stage: ST[a.stage].name, reason: a.reason || '', note: a.reasonNote || '', side: SIDE.includes(a.stage) }; });
}
const rptBar = (v, max, color) => `<span class="rb"><i style="width:${max ? Math.max(2, Math.round(100 * v / max)) : 0}%;background:${color}"></i></span>`;
const rptCur = () => { const c = ui.rptCur || { ids: [] }; return { list: c.ids.map(id => by('jobs', id)).filter(Boolean).map(jobStats), co: c.co ? by('companies', c.co) : null }; };
function rptBody() {
  const { list, co } = rptCur(), names = !!ui.rptNames; if (!list.length) return '<div class="empty">Nenhuma vaga selecionada.</div>';
  const single = list.length === 1, pfx = rptPrefix(list), cmp = list.map(s => s.j.companyId), compName1 = co ? co.name : compName(list[0].j.companyId);
  const allOpen = list.every(s => s.j.status === 'open'), tot = list.reduce((o, s) => ({ c: o.c + s.contacted, h: o.h + s.hired.length, l: o.l + s.live.length, e: o.e + s.exits.length }), { c: 0, h: 0, l: 0, e: 0 });
  const dists = list.map(s => s.dist).filter(x => x != null), days = list.map(s => s.days), recs = uniq(list.map(s => (by('users', s.j.recruiterId) || {}).name).filter(Boolean));
  const title = single ? esc(list[0].j.title) : allOpen ? 'Vagas em aberto: acompanhamento do processo' : 'Histórico das vagas selecionadas';
  const rg = (lbl, fn) => `<tr><th scope="row">${lbl}</th>${list.map(s => `<td>${fn(s)}</td>`).join('')}</tr>`;
  const ul = a => `<ul>${(a || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const rsn = {}; list.forEach((s, i) => Object.entries(s.reasons).forEach(([r, n]) => { (rsn[r] = rsn[r] || Array(list.length).fill(0))[i] = n; }));
  const rsnList = Object.entries(rsn).sort((a, b) => b[1].reduce((x, y) => x + y, 0) - a[1].reduce((x, y) => x + y, 0)), rmax = Math.max(1, ...rsnList.map(r => r[1].reduce((x, y) => x + y, 0)));
  const reg = list.flatMap(s => s.exits).length, topR = rsnList.slice(0, 4);
  const sev = { bad: '#B3261E', warn: '#9A6700', ok: '#1B7F4B', info: '#3A5BA0' };
  const dg = list.map(s => ({ s, ...jobDiag(s) }));
  return `<article class="rpt" id="rpt-doc">
  <header class="rh"><div><div class="rk">Relatório de recrutamento e seleção · ${new Date().toLocaleDateString('pt-BR')}</div><h1>${title}</h1><div class="rm">Para: <b>${esc(compName1)}</b>${recs.length ? ` · Execução: <b>${recs.map(esc).join(', ')}</b>` : ''} · Vínculo</div></div></header>
  <div class="rkpis"><div><b>${list.filter(s => s.j.status === 'open').length}</b><span>${list.filter(s => s.j.status === 'open').length === 1 ? 'vaga em aberto' : 'vagas em aberto'} (de ${list.length})</span></div><div><b>${tot.c}</b><span>profissionais contatados</span></div><div><b>${tot.h}</b><span>contratações</span></div><div><b>${days.length > 1 && Math.min(...days) !== Math.max(...days) ? Math.min(...days) + '–' + Math.max(...days) : days[0]}</b><span>dias de processo</span></div><div><b>${dists.length ? dists.map(x => (x > 0 ? '+' : '') + x + '%').join(' / ') : '—'}</b><span>pretensão mediana vs. teto${dists.length > 1 ? ' (por vaga)' : ''}</span></div></div>
  <section class="rs"><h2>1. ${single ? 'Resumo da vaga' : 'As vagas'}</h2><div class="rtw"><table class="rt"><thead><tr><th>Indicador</th>${list.map((s, i) => `<th><span class="dot" style="background:${RPT_COLORS[i % 8]}"></span>${esc(s.j.title)}</th>`).join('')}</tr></thead><tbody>
  ${rg('Abertura / responsável', s => `${s.start ? fdate(s.start) : 'Não publicada'}<br><span class="xs">${esc((by('users', s.j.recruiterId) || {}).name || '—')}</span>`)}
  ${rg('Situação', s => `${JOB_ST[s.j.status][0]}${s.j.status === 'closed' && s.hired.length ? ' · preenchida' : ''}`)}
  ${rg('Salário ofertado', s => s.j.salMin || s.j.salMax ? `${brl(s.j.salMin)} a ${brl(s.j.salMax)}<br><span class="xs">${esc(s.j.contract)}</span>` : '—')}
  ${rg('Modelo e local', s => `${esc(s.j.mode)} · ${esc(s.j.city)}/${esc(s.j.state)}`)}
  ${rg('Profissionais contatados', s => s.contacted)}
  ${rg('Em andamento / contratados / saíram', s => `${s.live.length} / ${s.hired.length} / ${s.exits.length}`)}
  ${rg('Pretensões informadas (mediana · média)', s => s.prets.length ? `${brl(s.med)} · ${brl(s.avg)}` : '—')}
  ${rg('Distância do teto (mediana)', s => s.dist == null ? '—' : `<b style="color:${s.dist > 5 ? '#B3261E' : '#1B7F4B'}">${s.dist > 0 ? '+' : ''}${s.dist}%</b> · ${s.within} de ${s.prets.length} pedem até o teto`)}
  ${list.some(s => s.j.marketRef) ? rg('Referência de mercado (informada)', s => s.j.marketRef ? `${brl(s.j.marketRef)}<br><span class="xs">${s.j.marketRef < s.teto ? 'teto ' + Math.round(100 * (s.teto - s.j.marketRef) / s.j.marketRef) + '% acima' : 'teto ' + Math.round(100 * (s.j.marketRef - s.teto) / s.j.marketRef) + '% abaixo'}</span>` : '—') : ''}
  ${rg('Dias do processo', s => `${s.days}${s.idle ? `<br><span class="xs">${s.idle} dias sem movimentação</span>` : ''}`)}
  </tbody></table></div></section>
  <section class="rs"><h2>2. Perfil ${single ? 'da vaga' : 'das vagas'}</h2><div class="rtw"><table class="rt"><thead><tr><th>Item</th>${list.map(s => `<th>${esc(s.j.title)}</th>`).join('')}</tr></thead><tbody>
  ${rg('Requisitos', s => ul(s.j.reqMand))}${rg('Atividades', s => ul((s.j.resp || []).slice(0, 4)))}${rg('Competências', s => (s.j.skills || []).map(esc).join(', ') || '—')}${rg('Benefícios', s => (s.j.benefits || []).map(esc).join(', ') || '—')}
  </tbody></table></div></section>
  <section class="rs"><h2>3. Funil do processo</h2><div class="rtw"><table class="rt"><thead><tr><th>Etapa</th>${list.map(s => `<th>${esc(s.j.title)}</th>`).join('')}</tr></thead><tbody>${RPT_FUNNEL.map(st => `<tr><th scope="row">${ST[st].name}</th>${list.map(s => `<td><div class="rbw">${rptBar(s.reached[st], s.reached.novo, ST[st].c)}<b>${s.reached[st]}</b><span class="xs">${pct(s.reached[st], s.reached.novo)}%</span></div></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="rn">Quantidade de candidatos que chegaram a cada etapa em algum momento do processo.</p></section>
  ${single && list[0].timeline.length ? `<section class="rs"><h2>4. Linha do tempo</h2><ol class="rtl">${list[0].timeline.map(t => `<li><b>${fdate(t[1])}</b> ${esc(t[0])}</li>`).join('')}</ol></section>` : ''}
  <section class="rs"><h2>${single ? 5 : 4}. Por que os candidatos saem do processo (${tot.e} saídas)</h2>${rsnList.length ? `<div class="rcols"><div>${rsnList.map(([r, arr]) => { const t = arr.reduce((x, y) => x + y, 0); return `<div class="rr"><span class="rl">${esc(r)}</span><span class="rbs">${arr.map((n, i) => n ? `<i style="width:${100 * n / rmax}%;background:${RPT_COLORS[i % 8]}" title="${esc(list[i].j.title)}: ${n}"></i>` : '').join('')}</span><b>${t}</b></div>`; }).join('')}${single ? '' : `<div class="rleg">${list.map((s, i) => `<span><i style="background:${RPT_COLORS[i % 8]}"></i>${esc(s.j.title)}</span>`).join('')}</div>`}</div>
  <div class="rread"><b>Leitura dos dados</b><ul>${topR.map(([r, arr]) => { const t = arr.reduce((x, y) => x + y, 0); return `<li><b>${esc(r)}:</b> ${t} de ${tot.e} (${pct(t, tot.e)}%)</li>`; }).join('')}</ul>${rsn['Motivo não registrado'] ? '<p class="xs">Há saídas sem motivo registrado. Preencher o motivo deixa esta análise mais precisa.</p>' : ''}</div></div>` : '<p class="rn">Ainda não há candidatos que tenham saído do processo.</p>'}</section>
  <section class="rs"><h2>${single ? 6 : 5}. Histórico dos contatos ${names ? '' : '(candidatos identificados por código, conforme a LGPD)'}</h2>${list.map((s, i) => { const rows = rptRows(s, pfx[i], names); return `<h3 class="rh3"><span class="dot" style="background:${RPT_COLORS[i % 8]}"></span>${esc(s.j.title)}</h3><div class="rtw"><table class="rt sm"><thead><tr><th>Cód.</th>${names ? '<th>Candidato</th>' : ''}<th>Data</th><th>Pretensão</th><th>Desfecho</th></tr></thead><tbody>${rows.map(r => `<tr><td class="b">${esc(r.code)}</td>${names ? `<td>${esc(r.name)}</td>` : ''}<td>${fdate(r.date)}</td><td>${r.pret ? brl(r.pret) : '—'}</td><td>${esc(r.stage)}${r.side ? ` — ${r.reason ? esc(r.reason) : `<i>motivo não registrado</i> <button type="button" class="lnk noprint" data-act="reasonEdit" data-app="${r.a.id}">Registrar</button>`}${r.note ? ': ' + esc(r.note) : ''}` : ''}</td></tr>`).join('') || `<tr><td colspan="${names ? 5 : 4}" class="mut">Nenhuma candidatura.</td></tr>`}</tbody></table></div>`; }).join('')}</section>
  <section class="rs"><h2>${single ? 7 : 6}. Diagnóstico</h2>${dg.map((x, i) => `${single ? '' : `<h3 class="rh3"><span class="dot" style="background:${RPT_COLORS[i % 8]}"></span>${esc(x.s.j.title)}</h3>`}<ul class="rdg">${x.d.map(r => `<li><b style="color:${sev[r[2]]}">${esc(r[0])}.</b> ${esc(r[1])}</li>`).join('')}</ul>${x.s.j.reportNote ? `<div class="rpar"><b>Parecer do recrutador</b><p>${esc(x.s.j.reportNote).replace(/\n/g, '<br>')}</p></div>` : ''}`).join('')}</section>
  <section class="rs"><h2>${single ? 8 : 7}. Sugestões e efeito esperado</h2>${dg.some(x => x.g.length) ? `<div class="rtw"><table class="rt"><thead><tr><th>Sugestão</th>${single ? '' : '<th>Vaga</th>'}<th>Impacto</th></tr></thead><tbody>${dg.flatMap((x, i) => x.g.map(g => `<tr><td>${esc(g[0])}</td>${single ? '' : `<td>${esc(x.s.j.title)}</td>`}<td>${esc(g[1])}</td></tr>`)).join('')}</tbody></table></div>` : '<p class="rn">Sem sugestões no momento: os dados não indicam ajustes necessários.</p>'}<p class="rn">Diagnóstico e sugestões são gerados automaticamente a partir dos dados do sistema e servem de apoio. A decisão final é sempre do recrutador e do cliente.</p></section>
  ${co && co.reportNote ? `<section class="rs"><h2>${single ? 9 : 8}. Considerações finais</h2><div class="rpar"><p>${esc(co.reportNote).replace(/\n/g, '<br>')}</p></div></section>` : ''}
  <footer class="rf">Relatório gerado pelo Vínculo em ${new Date().toLocaleString('pt-BR')}. Dados pessoais de candidatos são protegidos; contatos só são liberados na contratação.</footer>
  </article>`;
}
function reportView(query) {
  const ids = String(query.jobs || '').split(',').filter(x => by('jobs', x)), cid = query.co && by('companies', query.co) ? query.co : '';
  if (!ids.length) return shell(`${pageHead('Relatório', 'Nenhuma vaga selecionada.')}<div class="empty"><p><a class="btn pri" href="#/s/relatorios">Escolher vagas</a></p></div>`);
  ui.rptCur = { ids, co: cid }; const jobs = ids.map(id => by('jobs', id)), co = cid ? by('companies', cid) : null;
  return shell(`<div class="noprint"><p class="sm mb"><a href="#/s/relatorios">← Relatórios</a></p>${pageHead(jobs.length === 1 ? 'Relatório da vaga' : 'Relatório do cliente', 'Revise, complemente e imprima ou salve em PDF.', `<button class="btn" data-act="rptCsv">Baixar CSV</button><button class="btn pri" data-act="rptPrint">${ico('file', 14)} Imprimir / salvar PDF</button>`)}
  <div class="card mb"><label class="check"><input type="checkbox" data-act="rptNames" ${ui.rptNames ? 'checked' : ''}> Mostrar o nome dos candidatos (uso interno)</label><p class="xs mut mt-s">Para enviar ao cliente, deixe desmarcado: os candidatos aparecem só por código. Os contatos são liberados apenas na contratação.</p>
  <details class="mt"><summary class="b">Complementar o relatório (opcional)</summary><div class="stack mt">${jobs.map(j => `<div class="fg">${fld('Referência de mercado — ' + esc(j.title) + ' (R$)', `<input type="number" min="0" step="10" value="${j.marketRef || ''}" data-live="rptmkt" data-id="${j.id}" placeholder="Ex.: 3580 (fonte: CAGED ou pesquisa salarial)">`)}${fld('Parecer do recrutador — ' + esc(j.title), `<textarea rows="3" maxlength="1500" data-live="rptnote" data-id="${j.id}" placeholder="Sua leitura sobre esta vaga">${esc(j.reportNote || '')}</textarea>`)}</div>`).join('')}${co ? fld('Considerações finais para ' + esc(co.name), `<textarea rows="3" maxlength="1500" data-live="rptnote" data-co="${co.id}" placeholder="Mensagem final ao cliente">${esc(co.reportNote || '')}</textarea>`) : ''}</div></details></div></div>
  <div id="rpt-body">${rptBody()}</div>${jobs.length > 3 ? '<style media="print">@page{size:A4 landscape;margin:10mm}</style>' : '<style media="print">@page{size:A4;margin:10mm}</style>'}`);
}
function reportsHub() {
  const rp = ui.rp = ui.rp || { mode: 'cliente', co: '', sel: [], q: '', st: 'all' }, cos = db.companies;
  if (!rp.co && cos[0]) rp.co = cos[0].id;
  const jobsOf = id => db.jobs.filter(j => j.companyId === id && j.status !== 'draft').sort((a, b) => ({ open: 0, paused: 1, closed: 2 }[a.status] - { open: 0, paused: 1, closed: 2 }[b.status]) || new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
  const tabs = `<div class="opts mb">${[['cliente', 'Relatório por cliente'], ['vaga', 'Relatório por vaga']].map(x => `<label><input type="radio" name="rpm" ${rp.mode === x[0] ? 'checked' : ''} data-act="rpMode" data-v="${x[0]}">${x[1]}</label>`).join('')}</div>`;
  let body;
  if (rp.mode === 'cliente') {
    const js = jobsOf(rp.co); rp.sel = rp.sel.filter(id => js.some(j => j.id === id));
    body = `<div class="card"><div class="flex gap wrap" style="align-items:flex-end"><label class="field grow" style="max-width:420px"><span>Empresa cliente</span><select data-act="rpCo" aria-label="Empresa cliente">${cos.map(c => `<option value="${c.id}" ${c.id === rp.co ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label><div class="flex gap wrap"><button class="btn sm" data-act="rpPick" data-v="live">Em andamento</button><button class="btn sm" data-act="rpPick" data-v="closed">Encerradas</button><button class="btn sm" data-act="rpPick" data-v="all">Todas</button><button class="btn sm" data-act="rpPick" data-v="none">Limpar</button></div></div>
    <div class="tw mt"><table><thead><tr><th style="width:36px"></th><th>Vaga</th><th>Status</th><th>Candidatos</th><th>Publicada</th></tr></thead><tbody>${js.map(j => `<tr><td><input type="checkbox" data-act="rpToggle" data-id="${j.id}" ${rp.sel.includes(j.id) ? 'checked' : ''} aria-label="Incluir ${esc(j.title)}"></td><td class="b">${esc(j.title)}<div class="xs mut">${esc(j.city)}/${j.state} · ${j.mode}</div></td><td>${jobStBadge(j.status)}</td><td>${jobApps(j.id).length}</td><td class="xs">${j.pubDate ? fdate(j.pubDate) : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="center mut" style="padding:24px">Esta empresa ainda não tem vagas publicadas.</td></tr>'}</tbody></table></div>
    <div class="flex between gap wrap mt"><span class="sm mut">${rp.sel.length} ${rp.sel.length === 1 ? 'vaga selecionada' : 'vagas selecionadas'}</span><button class="btn pri" data-act="rpGo">${ico('file', 14)} Gerar relatório do cliente</button></div></div>`;
  } else {
    const q = strip(rp.q || ''), list = db.jobs.filter(j => j.status !== 'draft' && (rp.st === 'all' || (rp.st === 'live' ? j.status !== 'closed' : j.status === 'closed')) && (!q || strip(j.title + ' ' + compName(j.companyId)).includes(q))).sort((a, b) => ({ open: 0, paused: 1, closed: 2 }[a.status] - { open: 0, paused: 1, closed: 2 }[b.status]) || new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
    body = `<div class="card"><div class="flex gap wrap mb" style="align-items:flex-end"><label class="field grow" style="max-width:360px"><span>Buscar vaga ou empresa</span><input type="search" data-live="rpq" value="${esc(rp.q || '')}" placeholder="Ex.: analista" autocomplete="off"></label><label class="field" style="min-width:180px"><span>Situação</span><select data-act="rpSt">${[['all', 'Todas'], ['live', 'Não concluídas'], ['closed', 'Encerradas']].map(x => `<option value="${x[0]}" ${rp.st === x[0] ? 'selected' : ''}>${x[1]}</option>`).join('')}</select></label></div><div id="rp-res">${rpJobsTable(list)}</div></div>`;
  }
  return shell(`${pageHead('Relatórios', 'Gere o histórico de uma vaga ou o relatório de um cliente com as vagas que você escolher.')}${tabs}${body}<p class="xs mut mt">Os relatórios usam os dados do sistema (candidaturas, etapas, pretensões e motivos de saída). Para ficarem completos, registre o motivo ao reprovar ou ao marcar desistência.</p>`);
}
const rpJobsTable = list => `<div class="tw"><table><thead><tr><th>Vaga</th><th>Empresa</th><th>Status</th><th>Candidatos</th><th></th></tr></thead><tbody>${list.map(j => `<tr><td class="b">${esc(j.title)}</td><td>${esc(compName(j.companyId))}</td><td>${jobStBadge(j.status)}</td><td>${jobApps(j.id).length}</td><td style="text-align:right"><a class="btn sm pri" href="#/s/relatorios/ver?jobs=${j.id}">Gerar relatório</a></td></tr>`).join('') || '<tr><td colspan="5" class="center mut" style="padding:24px">Nenhuma vaga encontrada.</td></tr>'}</tbody></table></div>`;
function reasonModal(id, stage) {
  const a = by('apps', id), c = by('cands', a.candId), job = by('jobs', a.jobId), edit = a.stage === stage;
  openModal(edit ? 'Registrar motivo' : stage === 'desistiu' ? 'Registrar desistência' : 'Encerrar candidatura', `<form data-form="moveReason" data-app="${id}" data-stage="${stage}" class="stack"><p class="sm"><b>${esc(c.name)}</b> — ${esc(job.title)}</p>${fld('Motivo', sel('reason', REASONS[stage], a.reason || '', 'Selecione', 'required'))}${fld('Observação', `<textarea name="note" rows="2" maxlength="300" placeholder="Opcional. Aparece no histórico do relatório.">${esc(a.reasonNote || '')}</textarea>`)}<p class="xs mut">${edit ? 'O motivo alimenta os relatórios por vaga e por cliente.' : 'O candidato será avisado e continua no banco de talentos. O motivo alimenta os relatórios por vaga e por cliente.'}</p><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn ${edit ? 'pri' : 'danger'}">${edit ? 'Salvar motivo' : 'Confirmar'}</button></div></form>`);
}
function jobsAdminRes() {
  const f = ui.jobsAdmin || 'all', terms = strip(ui.jobsQ || '').split(/\s+/).filter(Boolean);
  const list = db.jobs.filter(j => (f === 'all' || j.status === f) && terms.every(t => strip(j.title + ' ' + compName(j.companyId) + ' ' + j.city).includes(t))).sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
  return `<p class="sm mut mb">${list.length} ${list.length === 1 ? 'vaga' : 'vagas'}${terms.length ? ' encontradas' : ''}</p><div class="tw"><table><thead><tr><th>Vaga</th><th>Empresa</th><th>Status</th><th>Candidatos</th><th>Publicada</th><th>Responsável</th><th></th></tr></thead><tbody>${list.map(j => { const n = jobApps(j.id), r = by('users', j.recruiterId); return `<tr><td><a class="b" href="#/s/vaga/${j.id}">${esc(j.title)}</a><div class="xs mut">${esc(j.city)}/${j.state} — ${j.mode}</div></td><td>${esc(compName(j.companyId))}</td><td>${jobStBadge(j.status)}</td><td>${n.length} <span class="xs mut">(${n.filter(a => a.stage === 'novo').length} novos)</span></td><td>${j.pubDate ? fdate(j.pubDate) : '—'}</td><td>${r ? esc(r.name) : '—'}</td>
  <td><div class="flex gap wrap" style="justify-content:flex-end"><a class="btn sm" href="#/s/vaga/${j.id}">${ico('board', 14)} Kanban</a><a class="btn sm" href="#/s/relatorios/ver?jobs=${j.id}">${ico('file', 14)} Relatório</a>${j.status === 'open' ? `<button class="btn sm" data-act="shareJob" data-id="${j.id}">${ico('link', 14)} Divulgar</button>` : ''}<a class="btn sm" href="#/s/vaga/${j.id}/editar">Editar</a>${j.status !== 'open' && j.status !== 'closed' ? `<button class="btn sm pri" data-act="jobStatus" data-id="${j.id}" data-v="open">Publicar</button>` : ''}${j.status === 'open' ? `<button class="btn sm" data-act="jobStatus" data-id="${j.id}" data-v="paused">Pausar</button>` : ''}${j.status === 'closed' ? `<button class="btn sm" data-act="jobStatus" data-id="${j.id}" data-v="open">Reabrir</button>` : `<button class="btn sm danger" data-act="jobStatus" data-id="${j.id}" data-v="closed">Encerrar</button>`}<button class="btn sm ghost" data-act="dupJob" data-id="${j.id}" title="Duplicar">Duplicar</button></div></td></tr>`; }).join('') || '<tr><td colspan="7" class="center mut" style="padding:28px">Nenhuma vaga encontrada. Tente outro nome, cliente ou cidade, ou mude o filtro de status.</td></tr>'}</tbody></table></div>`;
}
function jobsAdmin() {
  const f = ui.jobsAdmin || (ui.jobsAdmin = 'all');
  return shell(`${pageHead('Vagas', 'Crie, publique e acompanhe os processos.', `<a class="btn pri" href="#/s/vaga/nova">${ico('plus', 16)} Nova vaga</a>`)}
  <div class="flex gap wrap mb" style="align-items:flex-end"><label class="field grow" style="max-width:480px"><span>Buscar vaga</span><input type="search" data-live="jobsq" value="${esc(ui.jobsQ || '')}" placeholder="Nome da vaga, cliente ou cidade" autocomplete="off" aria-label="Buscar vaga por nome, cliente ou cidade"></label></div>
  <div class="opts mb">${[['all', 'Todas'], ['open', 'Abertas'], ['paused', 'Pausadas'], ['draft', 'Rascunhos'], ['closed', 'Encerradas']].map(x => `<label><input type="radio" name="jf" ${f === x[0] ? 'checked' : ''} data-act="jobsFilter" data-v="${x[0]}">${x[1]}</label>`).join('')}</div>
  <div id="ja-res">${jobsAdminRes()}</div>`);
}
const sqRow = (q = {}) => `<div class="rep" data-group="sq"><div style="grid-column:1/-1">${fld('Pergunta', inp('q', q.q, { ph: 'Ex.: Você possui CNH B?' }))}</div>${fld('Tipo de resposta', sel('type', [['yn', 'Sim/Não'], ['number', 'Número'], ['text', 'Texto livre']], q.type || 'yn'))}${fld('Resposta esperada', sel('expected', ['Sim', 'Não'], q.expected || 'Sim'), 'só Sim/Não')}<label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="ko" ${q.ko ? 'checked' : ''}> Eliminatória</label><button type="button" class="btn ghost sm" data-act="delRow" aria-label="Remover pergunta">${ico('x', 16)}</button></div>`;
ROWS.sq = sqRow;
function jobForm(id, pre) {
  const j = id ? by('jobs', id) : null; if (id && !j) return notFound(); pre = pre || {};
  const v = j || { companyId: pre.co || '', title: pre.title || '', area: pre.area || '', city: pre.city || 'Recife', state: 'PE', mode: pre.mode || 'Híbrido', contract: 'CLT', qty: pre.qty || 1, minExp: 1, skills: [], screening: [], resp: [], reqMand: [], reqDesir: [], benefits: [], recruiterId: curUser().role === 'recruiter' ? curUser().id : 'u_rec1', desc: pre.notes || '', deadline: '' };
  const lines = a => esc((a || []).join('\n'));
  const staff = db.users.filter(x => isStaff(x));
  return shell(`${pageHead(j ? 'Editar vaga' : 'Nova vaga', j ? esc(j.title) : 'Preencha os dados e publique quando estiver pronto.')}
  <form data-form="job" data-id="${id || ''}" data-req="${pre.req || ''}" class="stack"><div class="card"><h3>Dados principais</h3><div class="fg">${fld('Título da vaga', inp('title', v.title, { req: 1, attrs: CARGO_ATTR }) + cargoDL())}${fld('Empresa cliente', sel('companyId', db.companies.map(c => [c.id, c.name]), v.companyId, 'Selecione', 'required'))}${fld('Área', sel('area', AREA_LIST, v.area, 'Selecione', 'required'))}${fld('Recrutador responsável', sel('recruiterId', staff.map(s => [s.id, s.name]), v.recruiterId))}${fld('Cidade', inp('city', v.city, { req: 1 }))}${fld('Estado', sel('state', UF, v.state))}${fld('Modalidade', sel('mode', MODES, v.mode))}${fld('Tipo de contratação', sel('contract', CONTRACTS, v.contract))}${fld('Salário mínimo (R$)', inp('salMin', v.salMin, { type: 'number', attrs: 'min="0" step="100"' }))}${fld('Salário máximo (R$)', inp('salMax', v.salMax, { type: 'number', attrs: 'min="0" step="100"' }))}${fld('Quantidade de vagas', inp('qty', v.qty, { type: 'number', attrs: 'min="1"' }))}${fld('Prazo de candidatura', inp('deadline', v.deadline, { type: 'date' }))}</div></div>
  <div class="card"><h3>Descrição</h3><div class="stack">${fld('Descrição da vaga', `<textarea name="desc" required>${esc(v.desc)}</textarea>`)}<div class="fg w2">${fld('Responsabilidades', `<textarea name="resp" placeholder="Uma por linha">${lines(v.resp)}</textarea>`, 'uma por linha')}${fld('Benefícios', `<textarea name="benefits" placeholder="Uma por linha">${lines(v.benefits)}</textarea>`, 'um por linha')}${fld('Requisitos obrigatórios', `<textarea name="reqMand">${lines(v.reqMand)}</textarea>`, 'um por linha')}${fld('Requisitos desejáveis', `<textarea name="reqDesir">${lines(v.reqDesir)}</textarea>`, 'um por linha')}</div></div></div>
  <div class="card"><h3>Critérios de aderência <span class="lockchip">${ico('lock', 12)} apoio interno</span></h3><p class="sm mut mb">Usados para calcular o indicador de aderência, que apoia o recrutador e nunca decide sozinho.</p><div class="fg">${fld('Experiência mínima (anos)', inp('minExp', v.minExp, { type: 'number', attrs: 'min="0" step="0.5"' }))}<label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="degree" ${v.degree ? 'checked' : ''}> Exige ensino superior</label>${fld('Idioma exigido', sel('langName', LANGS.filter(l => l !== 'Português'), v.lang && v.lang.name, 'Nenhum'))}${fld('Nível mínimo', sel('langLevel', LVL, v.lang ? v.lang.level : 'Intermediário'))}</div><div class="mt">${chipsField('jskills', 'Competências-chave', v.skills, 'Enter para adicionar', 'dl-skills')}<datalist id="dl-skills">${ALL_SKILLS.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div></div>
  <div class="card"><h3>Perguntas de triagem</h3><p class="sm mut mb">Perguntas marcadas como eliminatórias sinalizam candidatos que não atendem ao requisito. A decisão final continua com o recrutador.</p><div id="g-sq">${(v.screening.length ? v.screening : []).map(sqRow).join('')}</div><button type="button" class="btn sm" data-act="addRow" data-g="sq">${ico('plus', 14)} Adicionar pergunta</button></div>
  <div class="flex gap wrap" style="justify-content:flex-end"><a class="btn" href="#/s/vagas">Cancelar</a><button class="btn" name="mode" value="draft">Salvar rascunho</button><button class="btn pri" name="mode" value="publish">${j && j.status === 'open' ? 'Salvar alterações' : 'Publicar vaga'}</button></div></form>`);
}

/* ---------- Pipeline (Kanban) ---------- */
function kcard(a, job) {
  const c = by('cands', a.candId), sc = AI.compare(c, job).score, ko = koFails(a, job).length, tags = (c.tags || []).slice(0, 2);
  const cd = a.clientDecision ? ({ advance: ['Empresa aprovou', 'var(--green)'], reject: ['Empresa reprovou', 'var(--red)'], interview: ['Empresa pediu entrevista', 'var(--blue)'] })[a.clientDecision] : null;
  return `<article class="kcard" draggable="true" data-app="${a.id}" data-act="openApp" data-cid="${c.id}"><div class="flex gap">${avatar(c.name)}<div class="grow"><div class="b">${esc(c.name)}</div><div class="xs mut">${esc(c.title)}</div></div><span class="score" title="Aderência ao perfil da vaga (apoio ao recrutador, não é decisão automática)">${sc}%</span></div>
  <div class="kmeta"><div>${ico('pin', 12)}${esc(c.city)}/${c.state}</div><div>${ico('brief', 12)}${yTxt(candYears(c))} de experiência</div><div>Pretensão ${brl(a.salary || c.salary)}</div><div>Candidatou-se ${ago(a.date)}</div></div>
  <div class="ktags">${ko ? `<span class="badge" style="--c:var(--red)" title="${esc(koFails(a, job).map(q => q.q).join(' | '))}">Eliminatória não atendida</span>` : ''}${a.interview && !CLOSED.includes(a.stage) ? `<span class="badge" style="--c:var(--sun)">${ico('cal', 11)} ${fdt(a.interview.date)}</span>` : ''}${cd ? `<span class="badge" style="--c:${cd[1]}">${cd[0]}</span>` : ''}${tags.map(t => `<span class="badge">${esc(t)}</span>`).join('')}</div>
  <div class="kact"><button class="btn sm ghost" data-act="moveMenu" data-app="${a.id}" aria-label="Mover para outra etapa">${ico('dots', 16)}</button>${NEXT[a.stage] ? `<button class="btn sm" data-act="advance" data-app="${a.id}" title="Avançar para ${ST[NEXT[a.stage]].name}">${ST[NEXT[a.stage]].short} ${ico('right', 13)}</button>` : ''}</div></article>`;
}
function boardHtml(job) {
  const q = strip(ui.boardq || ''), apps = jobApps(job.id).filter(a => { const c = by('cands', a.candId); return !q || strip(c.name + ' ' + c.title + ' ' + c.city).includes(q); });
  return `<div class="board">${STAGES.map(s => { const l = apps.filter(a => a.stage === s.id).sort((x, y) => new Date(y.date) - new Date(x.date)); return `<section class="kcol ${SIDE.includes(s.id) ? 'side' : ''}" data-stage="${s.id}" style="--c:${s.c}" aria-label="${s.name}"><header><span class="badge dot" style="--c:${s.c}">${s.name}</span><b>${l.length}</b></header><div class="kbody">${l.map(a => kcard(a, job)).join('') || '<p class="empty xs" style="padding:14px 8px">Arraste candidatos para cá</p>'}</div></section>`; }).join('')}</div>`;
}
function pipeline(id) {
  const j = by('jobs', id); if (!j) return notFound(); const apps = jobApps(j.id), u = curUser();
  return shell(`<p class="sm mb"><a href="#/s/vagas">← Vagas</a></p>${pageHead('Kanban — ' + esc(j.title), `${esc(compName(j.companyId))} — ${esc(j.city)}/${j.state} — ${j.mode} — ${jobStBadge(j.status)}`, `${j.status === 'open' ? `<button class="btn sm pri" data-act="shareJob" data-id="${j.id}">${ico('link', 14)} Divulgar vaga</button>` : ''}<a class="btn sm" href="${jobUrl(j.id)}" target="_blank" rel="noopener">Ver página pública</a><a class="btn sm" href="#/s/relatorios/ver?jobs=${j.id}">${ico('file', 14)} Relatório da vaga</a><a class="btn sm" href="#/s/vaga/${j.id}/editar">Editar vaga</a><a class="btn sm" href="#/s/banco" data-act="tbForJob" data-id="${j.id}">${ico('users', 14)} Buscar no banco</a>${j.status === 'open' ? `<button class="btn sm" data-act="jobStatus" data-id="${j.id}" data-v="paused">Pausar</button>` : `<button class="btn sm pri" data-act="jobStatus" data-id="${j.id}" data-v="open">Publicar</button>`}${j.status !== 'closed' ? `<button class="btn sm danger" data-act="jobStatus" data-id="${j.id}" data-v="closed">Encerrar</button>` : ''}`)}
  <div class="flex gap wrap mb"><div class="grow" style="max-width:340px"><input type="search" placeholder="Filtrar candidatos nesta vaga" data-live="boardq" value="${esc(ui.boardq)}" aria-label="Filtrar candidatos"></div><span class="mut sm">${apps.length} candidaturas. Arraste os cartões entre as etapas ou use os botões. O percentual é apenas apoio, nunca uma decisão.</span></div>
  <div id="board">${boardHtml(j)}</div>`);
}

/* ---------- Kanban pelo menu: escolhe a vaga e mostra o quadro ---------- */
function kanbanHub() {
  const rank = { open: 0, paused: 1, closed: 2 };
  const jobs = db.jobs.filter(j => j.status !== 'draft').sort((a, b) => (rank[a.status] - rank[b.status]) || (jobApps(b.id).length - jobApps(a.id).length));
  if (!jobs.length) return shell(`${pageHead('Kanban', 'Acompanhe os candidatos de cada vaga por etapa.')}<div class="empty"><b>Ainda não há vagas publicadas.</b><p class="mt-s"><a class="btn pri" href="#/s/vaga/nova">Criar vaga</a></p></div>`);
  const j = jobs.find(x => x.id === ui.kjob) || jobs[0]; ui.kjob = j.id; const apps = jobApps(j.id);
  return shell(`${pageHead('Kanban', 'Escolha uma vaga para ver os candidatos em cada etapa.')}
  <div class="flex gap wrap mb" style="align-items:flex-end"><label class="field grow" style="max-width:480px"><span>Vaga</span><select data-act="aiSel" data-k="kjob" aria-label="Escolher vaga">${jobs.map(x => `<option value="${x.id}" ${x.id === j.id ? 'selected' : ''}>${esc(x.title)} — ${esc(compName(x.companyId))} (${jobApps(x.id).length})${x.status === 'open' ? '' : x.status === 'paused' ? ' — pausada' : ' — encerrada'}</option>`).join('')}</select></label><a class="btn sm" href="#/s/vaga/${j.id}">Abrir página da vaga</a></div>
  <div class="flex gap wrap mb"><div class="grow" style="max-width:340px"><input type="search" placeholder="Filtrar candidatos nesta vaga" data-live="boardq" value="${esc(ui.boardq)}" aria-label="Filtrar candidatos"></div><span class="mut sm">${apps.length} candidaturas. Arraste os cartões entre as etapas ou use os botões. O percentual é apenas apoio, nunca uma decisão.</span></div>
  <div id="board">${boardHtml(j)}</div>`);
}

/* ---------- Triagem ---------- */
/* ---------- Triagem: vaga e cidade digitáveis ---------- */
function triJobLabels() {
  const jobs = db.jobs.filter(j => j.status !== 'draft'), base = j => j.title + ' — ' + compName(j.companyId), cnt = {};
  jobs.forEach(j => { cnt[base(j)] = (cnt[base(j)] || 0) + 1; });
  return jobs.map(j => ({ j, label: base(j) + (cnt[base(j)] > 1 ? ` · ${j.city}/${j.state}` : '') + (j.status === 'closed' ? ' (encerrada)' : j.status === 'paused' ? ' (pausada)' : '') }));
}
function triJobMatch(v) {
  const q = strip(v).trim(), all = triJobLabels(); if (!q) return { m: [], n: 0 };
  let m = all.filter(x => strip(x.label) === q); if (m.length === 1) return { m, n: 1 };
  const terms = q.split(/\s+/); m = all.filter(x => terms.every(t => strip(x.label).includes(t)));
  return { m: m.length === 1 ? m : [], n: m.length };
}
function triJobHint(v) {
  const cur = triJobLabels().find(x => x.j.id === ui.tri.job), r = triJobMatch(v);
  if (!String(v || '').trim()) return '';
  if (r.m.length) return `<span style="color:var(--green)">✓ Vaga selecionada</span>`;
  return r.n ? `${r.n} vagas combinam. Escolha uma da lista; os resultados continuam em: ${esc(cur ? cur.label : '—')}` : `Nenhuma vaga encontrada. Os resultados continuam em: ${esc(cur ? cur.label : '—')}`;
}
function triRows() {
  const f = ui.tri, job = by('jobs', f.job); if (!job) return '<div class="empty">Escolha uma vaga para começar a triagem.</div>';
  let rows = jobApps(job.id).filter(a => (!f.stage || a.stage === f.stage)).map(a => ({ a, c: by('cands', a.candId) })).filter(r => matchCand(r.c, f));
  if (f.ko) rows = rows.filter(r => !koFails(r.a, job).length);
  rows = rows.map(r => ({ ...r, sc: AI.compare(r.c, job).score, ko: koFails(r.a, job) })).sort((x, y) => y.sc - x.sc);
  const news = rows.filter(r => r.a.stage === 'novo').length;
  return `<div class="flex between gap wrap mb"><span class="mut sm">${rows.length} candidaturas correspondem aos critérios</span>${news ? `<button class="btn sm pri" data-act="bulkTriage">Mover ${news} novos para Triagem</button>` : ''}</div>
  <div class="tw"><table><thead><tr><th>Candidato</th><th>Cidade</th><th>Experiência</th><th>Pretensão</th><th>Inglês</th><th>Início</th><th>Eliminatórias</th><th>Aderência</th><th>Etapa</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><div class="flex gap">${avatar(r.c.name, 30)}<a class="b" href="#/s/candidato/${r.c.id}/${r.a.id}">${esc(r.c.name)}</a></div></td><td>${esc(r.c.city)}</td><td>${yTxt(candYears(r.c))}</td><td>${brl(r.a.salary || r.c.salary)}</td><td>${(r.c.languages.find(l => l.lang === 'Inglês') || {}).level || '—'}</td><td>${esc(r.c.avail)}</td><td>${r.ko.length ? `<span class="badge" style="--c:var(--red)" title="${esc(r.ko.map(q => q.q).join(' | '))}">${r.ko.length} não atendida${r.ko.length > 1 ? 's' : ''}</span>` : '<span class="badge" style="--c:var(--green)">Todas atendidas</span>'}</td><td><span class="score">${r.sc}%</span></td><td>${stageBadge(r.a.stage)}</td>
  <td><div class="flex gap" style="justify-content:flex-end">${r.a.stage === 'novo' ? `<button class="btn sm" data-act="moveTo" data-app="${r.a.id}" data-stage="triagem">Triagem</button>` : ''}${!CLOSED.includes(r.a.stage) ? `<button class="btn sm danger" data-act="moveTo" data-app="${r.a.id}" data-stage="reprovado">Reprovar</button>` : ''}</div></td></tr>`).join('') || '<tr><td colspan="10" class="center mut" style="padding:28px">Nenhuma candidatura com esses critérios.</td></tr>'}</tbody></table></div>`;
}
function triagem() {
  const f = ui.tri, jobs = db.jobs.filter(j => j.status !== 'draft'); if (!f.job) f.job = (jobs.find(j => j.status === 'open') || jobs[0]).id;
  const L = (n, label, inner) => `<label class="field"><span>${label}</span>${inner}</label>`;
  return shell(`${pageHead('Triagem', 'Filtre as candidaturas de uma vaga por critérios objetivos e avance ou reprove em lote.', `<button class="btn sm" data-act="preset" data-w="tri-brief">Aplicar exemplo do briefing</button><button class="btn sm ghost" data-act="clearTri">Limpar</button>`)}
  <div class="card mb"><div class="filters">${L('job', 'Vaga', `<input name="jobq" type="search" list="dl-trijobs" data-live="tri" autocomplete="off" placeholder="Digite o nome da vaga ou do cliente" aria-label="Vaga" value="${esc(f.jobq !== undefined ? f.jobq : ((triJobLabels().find(x => x.j.id === f.job) || {}).label || ''))}"><datalist id="dl-trijobs">${triJobLabels().map(x => `<option value="${esc(x.label)}">`).join('')}</datalist><span class="xs mut" id="tri-jobhint">${triJobHint(f.jobq !== undefined ? f.jobq : '')}</span>`)}${L('stage', 'Etapa', sel('stage', STAGES.map(s => [s.id, s.name]), f.stage, 'Todas', 'data-live="tri"'))}${L('cityq', 'Cidade', `<input name="cityq" type="search" list="dl-tricities" data-live="tri" autocomplete="off" placeholder="Digite a cidade (vazio = todas)" aria-label="Cidade" value="${esc(f.cityq || '')}"><datalist id="dl-tricities">${uniq(db.cands.map(c => c.city).filter(Boolean)).sort((a, b) => a.localeCompare(b, 'pt')).map(c => `<option value="${esc(c)}">`).join('')}</datalist>`)}${L('minExp', 'Experiência mínima (anos)', `<input name="minExp" type="number" min="0" step="0.5" data-live="tri" value="${esc(f.minExp || '')}">`)}${L('maxSal', 'Pretensão até (R$)', `<input name="maxSal" type="number" min="0" step="100" data-live="tri" value="${esc(f.maxSal || '')}">`)}${L('lang', 'Idioma', sel('lang', LANGS, f.lang, 'Qualquer', 'data-live="tri"'))}${L('langLevel', 'Nível mínimo', sel('langLevel', LVL.map((l, i) => [i, l]), f.langLevel, 'Qualquer', 'data-live="tri"'))}${L('avail', 'Início em até', sel('avail', AVAIL.map((l, i) => [i, l]), f.avail, 'Qualquer', 'data-live="tri"'))}${L('edu', 'Formação mínima', sel('edu', EDU.map((l, i) => [i, l]), f.edu, 'Qualquer', 'data-live="tri"'))}${L('skill', 'Competência', `<input name="skill" list="dl-skills" data-live="tri" value="${esc(f.skill || '')}">`)}</div>
  <label class="check mt"><input type="checkbox" name="ko" data-live="tri" ${f.ko ? 'checked' : ''}> Mostrar só quem atende todas as perguntas eliminatórias</label><datalist id="dl-skills">${ALL_SKILLS.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
  <div id="tri-res">${triRows()}</div>`);
}

/* ---------- Banco de talentos ---------- */
function parseQ(q) {
  const terms = [], r = { terms, minExp: 0 };
  String(q || '').split(/[+,]/).map(t => t.trim()).filter(Boolean).forEach(t => { const m = t.match(/(\d+)\s*anos?/i); if (m) r.minExp = Math.max(r.minExp, +m[1]); else terms.push(strip(t)); });
  return r;
}
function matchCand(c, f) {
  const p = parseQ(f.q), yrs = candYears(c);
  const hay = strip([c.name, c.title, c.area, c.city, c.state, c.skills.join(' '), (c.tags || []).join(' '), c.exps.map(e => e.role).join(' ')].join(' '));
  if (!p.terms.every(t => hay.includes(t))) return false;
  if (p.minExp && yrs < p.minExp) return false;
  if (f.cityq && !strip(c.city).includes(strip(f.cityq).trim())) return false;
  if (f.city && c.city !== f.city) return false; if (f.area && c.area !== f.area) return false;
  if (f.title && !strip(c.title + ' ' + c.exps.map(e => e.role).join(' ')).includes(strip(f.title))) return false;
  if (f.minExp && yrs < +f.minExp) return false;
  if (f.edu !== undefined && f.edu !== '' && eduRank(c) < +f.edu) return false;
  if (f.maxSal && c.salary > +f.maxSal) return false;
  if (f.mode && !c.modes.includes(f.mode)) return false;
  if (f.lang) { const l = langLvl(c, f.lang); if (l < 0) return false; if (f.langLevel !== undefined && f.langLevel !== '' && l < +f.langLevel) return false; }
  if (f.skill && !strip(c.skills.join(' ')).includes(strip(f.skill))) return false;
  if (f.avail !== undefined && f.avail !== '' && AVAIL.indexOf(c.avail) > +f.avail) return false;
  if (f.tag && !(c.tags || []).includes(f.tag)) return false;
  return true;
}
function tbCard(c, sc, job) {
  const st = candStatus(c), inv = job && db.invites.some(i => i.candId === c.id && i.jobId === job.id), ap = job && db.apps.some(a => a.candId === c.id && a.jobId === job.id);
  return `<article class="card tcard"><div class="flex gap">${avatar(c.name, 44)}<div class="grow"><a class="b" href="#/s/candidato/${c.id}">${esc(c.name)}</a><div class="sm mut">${esc(c.title)}</div></div>${sc != null ? `<span class="score" title="Aderência à vaga selecionada (apoio ao recrutador)">${sc}%</span>` : ''}</div>
  <div class="sm mut">${ico('pin', 13)} ${esc(c.city)}/${c.state} &nbsp; ${ico('brief', 13)} ${yTxt(candYears(c))} &nbsp; ${brl(c.salary)}</div>
  <div class="flex wrap" style="gap:5px">${c.skills.slice(0, 4).map(s => `<span class="chip plain">${esc(s)}</span>`).join('')}</div>
  <div class="flex between gap wrap"><span class="badge dot" style="--c:${st[1]}">${st[0]}</span><span class="xs mut">Início: ${esc(c.avail)}</span></div>
  <div class="flex gap" style="margin-top:auto"><a class="btn sm grow" href="#/s/candidato/${c.id}">Ver perfil</a>${ap ? '<span class="badge" style="--c:var(--green)">Já candidato(a)</span>' : inv ? '<span class="badge" style="--c:var(--sun)">Convite enviado</span>' : `<button class="btn sm pri" data-act="inviteMenu" data-cid="${c.id}">Convidar para esta vaga</button>`}</div></article>`;
}
function tbResults() {
  const f = ui.tb, job = f.job ? by('jobs', f.job) : null;
  let rows = db.cands.filter(c => !c.deleted && !pendingDel(c.id)).filter(c => matchCand(c, f)).map(c => ({ c, sc: job ? AI.compare(c, job).score : null }));
  rows.sort((a, b) => job ? b.sc - a.sc : a.c.name.localeCompare(b.c.name));
  const shown = rows.slice(0, f.limit || 18);
  return `<p class="mut sm mb">${rows.length} ${rows.length === 1 ? 'talento encontrado' : 'talentos encontrados'}${job ? ` — ordenados por aderência à vaga "${esc(job.title)}"` : ''}</p>${shown.length ? `<div class="cgrid">${shown.map(r => tbCard(r.c, r.sc, job)).join('')}</div>` : '<div class="empty">Nenhum talento com esses critérios. Tente remover algum filtro.</div>'}${rows.length > shown.length ? `<div class="center mt"><button class="btn" data-act="tbMore">Mostrar mais (${rows.length - shown.length})</button></div>` : ''}`;
}
function bank() {
  const f = ui.tb, L = (n, label, inner) => `<label class="field"><span>${label}</span>${inner}</label>, `;
  const S = (n, label, arr, ph) => `<label class="field"><span>${label}</span>${sel(n, arr, f[n], ph || 'Todos', 'data-live="tb"')}</label>`;
  const I = (n, label, t, extra) => `<label class="field"><span>${label}</span><input name="${n}" type="${t || 'text'}" value="${esc(f[n] || '')}" data-live="tb" ${extra || ''}></label>`;
  const jobs = db.jobs.filter(j => j.status === 'open' || j.status === 'paused');
  return shell(`${pageHead('Banco de Talentos', 'Todos os candidatos cadastrados, independentemente da vaga em que se candidataram.', `<button class="btn sm" data-act="preset" data-w="tb-rh">Exemplo: Analista de RH + Recife + 2 anos</button><button class="btn sm ghost" data-act="clearTb">Limpar</button>`)}
  <div class="card mb"><div class="fg w2"><label class="field"><span>Busca livre <small>(use + para combinar: "Analista de RH + Recife + 2 anos")</small></span><input name="q" type="search" data-live="tb" value="${esc(f.q || '')}" placeholder="Nome, cargo, competência, cidade, tag"></label><label class="field"><span>Vaga de referência <small>(ordena por aderência e habilita o convite)</small></span>${sel('job', jobs.map(j => [j.id, j.title + ' — ' + compName(j.companyId)]), f.job, 'Nenhuma', 'data-live="tb"')}</label></div>
  <details class="fx mt" style="background:transparent" ${['city', 'area', 'title', 'minExp', 'edu', 'maxSal', 'mode', 'lang', 'skill', 'avail', 'tag'].some(k => f[k]) ? 'open' : ''}><summary>Filtros avançados</summary><div class="filters">${S('city', 'Cidade', uniq(db.cands.map(c => c.city)).sort())}${S('area', 'Área', AREA_LIST)}${I('title', 'Cargo')}${I('minExp', 'Experiência mínima (anos)', 'number', 'min="0" step="0.5"')}${S('edu', 'Formação mínima', EDU.map((l, i) => [i, l]), 'Qualquer')}${I('maxSal', 'Pretensão até (R$)', 'number', 'min="0" step="100"')}${S('mode', 'Modalidade', MODES)}${S('lang', 'Idioma', LANGS, 'Qualquer')}${S('langLevel', 'Nível mínimo', LVL.map((l, i) => [i, l]), 'Qualquer')}${I('skill', 'Competência', 'text', 'list="dl-skills"')}${S('avail', 'Início em até', AVAIL.map((l, i) => [i, l]), 'Qualquer')}${S('tag', 'Tag interna', TAGS)}</div><datalist id="dl-skills">${ALL_SKILLS.map(s => `<option value="${esc(s)}">`).join('')}</datalist></details></div>
  <div id="tb-res">${tbResults()}</div>`);
}

/* ---------- Perfil do candidato (recrutador) ---------- */
function aiPanel(c, j) {
  if (!j) return '<p class="mut sm">Escolha uma vaga para comparar.</p>';
  const r = AI.compare(c, j);
  return `<div class="aibox"><div class="flex gap-l wrap"><div class="ring" style="--p:${r.score}"><b>${r.score}%</b></div><div class="grow"><b>Aderência ao perfil: ${r.score}%</b><p class="xs mut">Indicador de apoio ao recrutador. Não substitui a análise humana e nunca decide contratação ou reprovação.</p></div></div>
  <div class="mt"><div class="b sm">Requisitos atendidos</div>${r.met.length ? r.met.map(m => `<div class="ok sm">✓ ${esc(m)}</div>`).join('') : '<div class="mut sm">Nenhum identificado.</div>'}</div>
  <div class="mt-s"><div class="b sm mt">Pontos a verificar</div>${r.check.length ? r.check.map(m => `<div class="warn sm">⚠ ${esc(m)}</div>`).join('') : '<div class="mut sm">Nada a verificar.</div>'}</div></div>`;
}
function staffCand(cid, aid) {
  const c = by('cands', cid); if (!c) return notFound(); const app = aid ? by('apps', aid) : null;
  if (c.deleted) return shell(`<div class="empty">Os dados deste candidato foram excluídos a pedido (LGPD).</div>`);
  audit('Perfil visualizado', c.name);
  const apps = candApps(c.id).sort((a, b) => new Date(b.date) - new Date(a.date)), evals = db.evals.filter(e => e.candId === c.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const st = candStatus(c), jid = ui.cmp[c.id] || (app ? app.jobId : (apps[0] || {}).jobId) || '', job = jid ? by('jobs', jid) : null;
  const hist = apps.map(a => { const j = by('jobs', a.jobId); return { t: a.date, job: j.title, co: compName(j.companyId), res: a.stage === 'contratado' ? 'Contratado' : a.stage === 'reprovado' ? 'Não avançou' : a.stage === 'desistiu' ? 'Desistiu' : 'Em andamento: ' + ST[a.stage].name, cur: !CLOSED.includes(a.stage) }; }).concat((c.pastHistory || []).map(p => ({ t: p.date, job: p.job, co: p.company, res: p.result }))).sort((a, b) => new Date(b.t) - new Date(a.t));
  const appPanel = app ? (() => { const j = by('jobs', app.jobId), fails = koFails(app, j); return `<div class="card" style="border-color:var(--pri)"><div class="flex between gap wrap"><div><span class="xs mut">Candidatura selecionada</span><h3 style="margin:0">${esc(j.title)}</h3><span class="sm mut">${esc(compName(j.companyId))}</span></div>${stageBadge(app.stage)}</div>
  <div class="mt"><div class="xs mut mb" style="margin-bottom:6px">Mover para</div><div class="flex wrap" style="gap:6px">${STAGES.map(s => `<button class="btn sm ${s.id === app.stage ? 'pri' : ''}" ${s.id === app.stage ? 'disabled' : ''} data-act="moveTo" data-app="${app.id}" data-stage="${s.id}">${s.short}</button>`).join('')}</div></div>
  ${app.interview ? `<div class="note mt">${ico('cal', 14)} Entrevista: ${fdt(app.interview.date)} (${app.interview.type})</div>` : ''}${app.stage === 'entrevista_rh' || app.stage === 'entrevista_cliente' ? `<button class="btn sm mt-s" data-act="scheduleMenu" data-app="${app.id}">${ico('cal', 14)} ${app.interview ? 'Reagendar' : 'Agendar'} entrevista</button>` : ''}
  ${app.stage === 'aprovado' ? `<button class="btn pri mt-s block" data-act="moveTo" data-app="${app.id}" data-stage="contratado">Marcar como contratado</button>` : ''}
  ${app.clientDecision ? `<div class="mt"><span class="xs mut">Decisão da empresa</span><div>${({ advance: 'Aprovou o candidato', reject: 'Reprovou o candidato', interview: 'Solicitou entrevista' })[app.clientDecision]}</div>${(app.clientFeedback || []).map(f => `<div class="bubble sm mt-s">${esc(f.text)}<div class="xs mut">${fdate(f.date)}</div></div>`).join('')}</div>` : ''}
  <div class="mt"><div class="b sm">Respostas de triagem</div>${j.screening.map(q => { const v = app.answers[q.id], bad = q.ko && q.type === 'yn' && v !== q.expected; return `<div class="qa mt-s ${bad ? 'bad' : ''}"><div class="sm">${esc(q.q)} ${q.ko ? '<span class="badge" style="--c:var(--red)">Eliminatória</span>' : ''}</div><div class="b sm">${esc(v ?? '—')}${bad ? ' — esperado: ' + q.expected : ''}</div></div>`; }).join('') || '<p class="mut sm">Sem perguntas.</p>'}${app.note ? `<div class="bubble sm mt-s"><b>Mensagem do candidato:</b> ${esc(app.note)}</div>` : ''}</div></div>`; })() : '';
  return shell(`<p class="sm mb"><a href="javascript:history.back()">← Voltar</a></p><div class="cols two"><div class="stack">
  <div class="card"><div class="flex gap-l wrap">${avatar(c.name, 72)}<div class="grow"><h1 style="font-size:28px">${esc(c.name)}</h1><p class="mut">${esc(c.title)} — ${esc(c.area)}</p><div class="flex wrap gap mt-s"><span class="badge dot" style="--c:${st[1]}">${st[0]}</span><span class="sm mut">${ico('pin', 13)} ${esc(c.city)}/${c.state}</span><span class="sm mut">${ico('brief', 13)} ${yTxt(candYears(c))}</span></div></div><div class="flex gap wrap"><button class="btn sm" data-act="contactMenu" data-cid="${c.id}" data-ch="email">${ico('mail', 14)} E-mail</button><button class="btn sm" data-act="contactMenu" data-cid="${c.id}" data-ch="whatsapp">${ico('phone', 14)} WhatsApp</button><button class="btn sm pri" data-act="inviteMenu" data-cid="${c.id}">Convidar para vaga</button></div></div></div>
  ${appPanel}${profileBody(c, 'staff')}
  <div class="card"><h3>Histórico</h3>${hist.length ? `<ul class="tl" style="margin:0">${hist.map(h => `<li class="${h.cur ? 'cur' : 'done'}"><span class="d"></span><div><b>Candidatou-se à vaga de ${esc(h.job)}</b> <span class="mut sm">(${esc(h.co)})</span><br><span class="sm mut">Data: ${fdate(h.t)}. Resultado: ${esc(h.res)}</span></div></li>`).join('')}</ul>` : '<p class="mut">Sem histórico de candidaturas.</p>'}</div></div>
  <aside class="stack">${profileSide(c, 'staff')}
  <div class="card"><h3>Aderência a uma vaga</h3>${sel('cmp', db.jobs.map(j => [j.id, j.title + ' — ' + compName(j.companyId)]), jid, 'Escolha a vaga', `data-act="cmpJob" data-cid="${c.id}"`)}<div class="mt">${aiPanel(c, job)}</div></div>
  <div class="card" style="background:var(--sun-soft);border-color:transparent"><div class="flex between"><h3 style="margin:0">Uso interno</h3><span class="lockchip">${ico('lock', 12)} invisível ao candidato e à empresa</span></div>
  <div class="mt"><div class="xs mut">Tags</div><div class="flex wrap mt-s" style="gap:6px">${(c.tags || []).map(t => `<span class="chip">${esc(t)}<button type="button" data-act="delTag" data-cid="${c.id}" data-t="${esc(t)}" aria-label="Remover ${esc(t)}">×</button></span>`).join('') || '<span class="mut sm">Sem tags</span>'}</div><form data-form="addTag" data-cid="${c.id}" class="flex gap mt-s"><input name="t" list="dl-tags" placeholder="Nova tag" aria-label="Nova tag"><datalist id="dl-tags">${TAGS.map(t => `<option value="${esc(t)}">`).join('')}</datalist><button class="btn sm">Adicionar</button></form></div>
  <div class="mt"><label class="field"><span>Anotações internas</span><textarea data-live="note" data-cid="${c.id}" style="background:var(--card)" placeholder="Salvas automaticamente">${esc(c.notes || '')}</textarea></label></div></div>
  <div class="card"><div class="flex between"><h3 style="margin:0">Avaliações <span class="lockchip">${ico('lock', 12)} interno</span></h3><button class="btn sm pri" data-act="evalMenu" data-cid="${c.id}" data-app="${app ? app.id : ''}">Registrar</button></div>${evals.length ? evals.map(e => `<div class="bubble mt"><div class="flex between sm"><b>${esc(by('jobs', e.jobId) ? by('jobs', e.jobId).title : '—')}</b><span class="mut">${fdate(e.date)} — ${esc(e.by)}</span></div><p class="sm mt-s"><b>Pontos positivos:</b> ${esc(e.pos)}</p><p class="sm"><b>Pontos de atenção:</b> ${esc(e.attn)}</p><p class="sm"><b>Entrevista:</b> ${esc(e.notes)}</p><p class="sm mut">Técnica ${e.tech}/5 — Comportamental ${e.behav}/5 — Pretensão ${brl(e.salary)} — Início ${esc(e.avail)}</p><div class="flex wrap mt-s" style="gap:5px">${(e.tags || []).map(t => `<span class="chip plain">${esc(t)}</span>`).join('')}</div></div>`).join('') : '<p class="mut sm mt">Nenhuma avaliação registrada.</p>'}</div></aside></div>`);
}

/* ---------- Admin: empresas, usuários, solicitações, comunicações, IA, LGPD ---------- */
/* ---------- Documentos (CPF/CNPJ), telefone e edição de cadastros ---------- */
const digits = s => String(s || '').replace(/\D/g, '');
const maskTo = (v, pat) => { v = digits(v); let o = '', i = 0; for (const ch of pat) { if (i >= v.length) break; o += ch === '#' ? v[i++] : ch; } return o; };
const fmtCNPJ = v => maskTo(v, '##.###.###/####-##');
const fmtDoc = v => digits(v).length > 11 ? fmtCNPJ(v) : maskTo(v, '###.###.###-##');
const fmtPhone = v => maskTo(String(v || '').slice(0, 15), digits(v).length > 10 ? '(##) #####-####' : '(##) ####-####');
const docShow = d => !d ? '—' : d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : fmtCNPJ(d);
const validCPF = v => { v = digits(v); if (v.length !== 11 || /^(\d)\1+$/.test(v)) return false; const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += +v[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; }; return dv(9) === +v[9] && dv(10) === +v[10]; };
const validCNPJ = v => { v = digits(v); if (v.length !== 14 || /^(\d)\1+$/.test(v)) return false; const dv = n => { const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]; let s = 0; for (let i = 0; i < n; i++) s += +v[i] * w[i]; const r = s % 11; return r < 2 ? 0 : 11 - r; }; return dv(12) === +v[12] && dv(13) === +v[13]; };
function docOf(raw, only) {
  const d = digits(raw); if (!d) return { d: '' };
  if (only === 'cnpj') return validCNPJ(d) ? { d } : { err: 'CNPJ inválido. Confira os 14 números.' };
  if (d.length === 11) return validCPF(d) ? { d } : { err: 'CPF inválido. Confira os números.' };
  if (d.length === 14) return validCNPJ(d) ? { d } : { err: 'CNPJ inválido. Confira os números.' };
  return { err: 'Digite um CPF (11 números) ou um CNPJ (14 números).' };
}
const phoneOf = raw => { const d = digits(raw); return !d || (d.length >= 10 && d.length <= 11) ? { d } : { err: 'Telefone inválido. Use DDD + número.' }; };
const userPhone = u => u.phone || (u.companyId ? (by('companies', u.companyId) || {}).phone : '') || '';
const PH_ATTR = 'data-mask="phone" inputmode="tel" maxlength="15" autocomplete="off" placeholder="(81) 99999-0000"';
const companyFields = c => `${fld('Nome da empresa', inp('name', c.name, { req: 1 }))}${fld('CNPJ', inp('cnpj', fmtCNPJ(c.cnpj), { req: 1, attrs: 'data-mask="cnpj" inputmode="numeric" maxlength="18" autocomplete="off" placeholder="00.000.000/0000-00"' }), 'identificador único')}${fld('Setor', inp('sector', c.sector, { req: 1 }))}${fld('Cidade', inp('city', c.city, { req: 1 }))}${fld('Estado', sel('state', UF, c.state || 'PE'))}${fld('Nome do Responsável', inp('contact', c.contact, { req: 1 }))}${fld('Telefone de contato', inp('phone', fmtPhone(c.phone), { attrs: PH_ATTR }))}${fld('E-mail de acesso', inp('email', c.email, { type: 'email', req: 1 }))}`;
const passField = hint => fld('Nova senha', inp('pass', '', { type: 'password', attrs: 'minlength="6" autocomplete="new-password" placeholder="Deixe em branco para manter a atual"' }), hint);

/* ---------- Catálogo de cargos (gerenciado pelo administrador) ---------- */
const CARGOS_EXTRA = {"Recursos Humanos": ["Auxiliar de Departamento Pessoal", "Analista de Departamento Pessoal", "Analista de Treinamento e Desenvolvimento", "Analista de Cargos e Salários", "Analista de Benefícios", "Técnico de Segurança do Trabalho", "Coordenador de RH", "Gerente de RH", "Recrutador(a)", "Estagiário(a) de RH"], "Comercial": ["Representante Comercial", "Consultor de Vendas", "Vendedor Externo", "Supervisor de Vendas", "Gerente de Contas (Key Account)", "SDR / Pré-vendas", "Analista de Inside Sales", "Assistente Comercial", "Promotor de Vendas", "Gerente Regional de Vendas", "Executivo de Contas"], "Administrativo": ["Secretária(o) Executiva(o)", "Auxiliar de Escritório", "Assistente de Compras", "Analista de Compras", "Comprador(a)", "Coordenador Administrativo", "Gerente Administrativo", "Analista de Facilities", "Assistente Jurídico", "Estagiário(a) Administrativo"], "Tecnologia": ["Desenvolvedor Front-end", "Desenvolvedor Back-end", "Desenvolvedor Mobile", "Analista de Sistemas", "Analista de Infraestrutura", "Engenheiro de Dados", "Cientista de Dados", "Engenheiro DevOps", "Analista de Segurança da Informação", "Product Owner", "Scrum Master", "UX/UI Designer", "Técnico de Suporte", "Arquiteto de Software", "Tech Lead", "Gerente de TI"], "Financeiro": ["Contador(a)", "Auxiliar Contábil", "Auxiliar Financeiro", "Analista de Controladoria", "Analista de Contas a Pagar", "Analista de Contas a Receber", "Analista Fiscal", "Analista de Crédito e Cobrança", "Tesoureiro(a)", "Coordenador Financeiro", "Gerente Financeiro"], "Logística": ["Auxiliar de Logística", "Auxiliar de Almoxarifado", "Almoxarife", "Conferente", "Operador de Empilhadeira", "Motorista", "Analista de PCP", "Analista de Supply Chain", "Líder de Expedição", "Coordenador de Logística", "Gerente de Logística"], "Marketing": ["Analista de Marketing Digital", "Analista de Performance (Tráfego Pago)", "Analista de Conteúdo", "Analista de CRM", "Redator(a)", "Editor(a) de Vídeo", "Assessor(a) de Comunicação", "Assistente de Marketing", "Coordenador de Marketing", "Gerente de Marketing", "Estagiário(a) de Marketing"], "Atendimento": ["Atendente de Loja", "Atendente de Telemarketing", "Operador de Telemarketing", "Caixa", "Analista de Suporte ao Cliente", "Analista de Customer Success", "Supervisor de Atendimento", "Gerente de Atendimento", "Recepcionista de Clínica"]};
function defaultCargos() {
  const seen = new Set(), out = [];
  Object.keys(AREAS).forEach(area => [...AREAS[area].titles, ...(CARGOS_EXTRA[area] || [])].forEach(n => { const k = strip(n); if (!seen.has(k)) { seen.add(k); out.push({ id: 'cg' + (out.length + 1), name: n, area }); } }));
  return out;
}
const cargoDL = () => `<datalist id="dl-cargos">${(db.cargos || []).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt')).map(c => `<option value="${esc(c.name)}" label="${esc(c.area)}">`).join('')}</datalist>`;
const CARGO_ATTR = 'list="dl-cargos" autocomplete="off"';
const cargoUse = n => { const k = strip(n); return { j: db.jobs.filter(j => strip(j.title) === k).length, c: db.cands.filter(x => !x.deleted && strip(x.title) === k).length }; };
function cargoMissing() {
  const known = new Set(db.cargos.map(c => strip(c.name))), m = {};
  const add = (t, a) => { t = String(t || '').trim(); if (!t || known.has(strip(t))) return; const e = m[strip(t)] = m[strip(t)] || { name: t, n: 0, areas: {} }; e.n++; if (a) e.areas[a] = (e.areas[a] || 0) + 1; };
  db.jobs.forEach(j => add(j.title, j.area)); db.cands.filter(c => !c.deleted).forEach(c => add(c.title, c.area)); db.requests.forEach(r => add(r.title, r.area));
  return Object.values(m).sort((a, b) => b.n - a.n).slice(0, 12).map(e => ({ ...e, area: Object.keys(e.areas).sort((a, b) => e.areas[b] - e.areas[a])[0] || AREA_LIST[0] }));
}
function cargosTable() {
  const f = ui.cg || {}, q = strip(f.q || '');
  const rows = db.cargos.filter(c => (!f.area || c.area === f.area) && (!q || strip(c.name).includes(q))).sort((a, b) => a.area.localeCompare(b.area, 'pt') || a.name.localeCompare(b.name, 'pt'));
  return `<p class="sm mut mb">${rows.length} de ${db.cargos.length} cargos</p><div class="tw"><table><thead><tr><th>Cargo</th><th>Área</th><th>Em uso</th><th></th></tr></thead><tbody>${rows.map(c => { const u = cargoUse(c.name); return `<tr><td class="b">${esc(c.name)}</td><td>${esc(c.area)}</td><td class="xs mut">${u.j} ${u.j === 1 ? 'vaga' : 'vagas'} · ${u.c} ${u.c === 1 ? 'perfil' : 'perfis'}</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="cargoEdit" data-id="${c.id}">Editar</button> <button class="btn sm danger" data-act="cargoDel" data-id="${c.id}">Excluir</button></td></tr>`; }).join('') || '<tr><td colspan="4" class="center mut" style="padding:24px">Nenhum cargo encontrado.</td></tr>'}</tbody></table></div>`;
}
function cargosView() {
  ui.cg = ui.cg || {}; const miss = cargoMissing();
  return shell(`${pageHead('Cargos', 'Crie e organize os cargos que aparecem como opção ao cadastrar vagas, perfis e solicitações.', `<button class="btn pri" data-act="cargoMenu">${ico('plus', 16)} Novo cargo</button>`)}
  ${miss.length ? `<div class="card mb"><h3>Cargos digitados que ainda não estão na lista</h3><p class="sm mut mb">Apareceram em vagas, perfis ou solicitações. Adicione os que fazem sentido para padronizar as próximas opções.</p><div class="flex wrap" style="gap:6px">${miss.map(m => `<button type="button" class="chip" data-act="cargoAdd" data-n="${esc(m.name)}" data-a="${esc(m.area)}" style="cursor:pointer">${ico('plus', 12)} ${esc(m.name)} <span class="xs mut">(${m.n})</span></button>`).join('')}</div></div>` : ''}
  <div class="flex gap wrap mb" style="align-items:flex-end"><label class="field grow" style="max-width:360px"><span>Buscar cargo</span><input type="search" name="q" data-live="cg" value="${esc(ui.cg.q || '')}" placeholder="Ex.: analista" autocomplete="off"></label><label class="field" style="min-width:200px"><span>Área</span>${sel('area', AREA_LIST, ui.cg.area || '', 'Todas as áreas', 'data-live="cg"')}</label></div>
  <div id="cargo-res">${cargosTable()}</div>
  <p class="xs mut mt">Editar ou excluir um cargo muda apenas a lista de opções. Vagas, perfis e solicitações já cadastrados não são alterados. Quem preenche ainda pode digitar um cargo que não esteja na lista.</p>`);
}
function cargoModal(c) {
  openModal(c ? 'Editar cargo' : 'Novo cargo', `<form data-form="cargo" data-id="${c ? c.id : ''}" class="stack"><div class="fg">${fld('Nome do cargo', inp('name', c ? c.name : '', { req: 1, attrs: 'maxlength="80" autocomplete="off"', ph: 'Ex.: Analista de Marketing Júnior' }))}${fld('Área', sel('area', AREA_LIST, c ? c.area : '', 'Selecione', 'required'))}</div><p class="xs mut">Cargos com o mesmo nome não são permitidos, mesmo com letras maiúsculas ou acentos diferentes.</p><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">${c ? 'Salvar' : 'Criar cargo'}</button></div></form>`);
}
/* ---------- Busca em Empresas clientes e Usuários ---------- */
const termsMatch = (q, fields, digitFields) => {
  const terms = String(q || '').trim().split(/\s+/).filter(Boolean), hay = strip(fields.join(' ')), dg = digits(digitFields.join(' '));
  return terms.every(t => /^[\d.\/\-]+$/.test(t) && digits(t).length >= 2 ? dg.includes(digits(t)) : hay.includes(strip(t)));
};
function companiesRes() {
  const q = ui.coQ || '', list = db.companies.filter(c => termsMatch(q, [c.name, c.email, c.contact, c.sector, c.city], [c.cnpj]));
  return `<p class="sm mut mb">${list.length} ${list.length === 1 ? 'empresa' : 'empresas'}${q.trim() ? ' encontradas' : ''}</p><div class="tw"><table><thead><tr><th>Empresa</th><th>CNPJ</th><th>Setor</th><th>Cidade</th><th>Contato / acesso</th><th>Vagas</th><th></th></tr></thead><tbody>${list.map(c => `<tr><td class="b">${esc(c.name)}</td><td class="mono xs">${c.cnpj ? fmtCNPJ(c.cnpj) : '<span class="badge" style="--c:var(--sun)">Pendente</span>'}</td><td>${esc(c.sector)}</td><td>${esc(c.city)}/${c.state}</td><td>${esc(c.contact)}<div class="xs mut mono">${esc(c.email)}</div>${c.phone ? `<div class="xs mut">${fmtPhone(c.phone)}</div>` : ''}</td><td>${db.jobs.filter(j => j.companyId === c.id).length}</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="rpOpenCo" data-id="${c.id}">Relatório</button> <button class="btn sm" data-act="companyEdit" data-id="${c.id}">Editar</button> <a class="btn sm" href="#/s/vaga/nova?co=${c.id}">Nova vaga</a></td></tr>`).join('') || '<tr><td colspan="8" class="center mut" style="padding:28px">Nenhuma empresa encontrada. Tente outro nome, e-mail ou CNPJ.</td></tr>'}</tbody></table></div>`;
}
function companies() {
  return shell(`${pageHead('Empresas clientes', 'Cadastre empresas, edite os dados e o acesso do contato responsável. O CNPJ é o identificador único.', `<button class="btn pri" data-act="companyMenu">${ico('plus', 16)} Nova empresa</button>`)}
  <div class="flex gap wrap mb" style="align-items:flex-end"><label class="field grow" style="max-width:480px"><span>Buscar empresa</span><input type="search" data-live="coq" value="${esc(ui.coQ || '')}" placeholder="Nome, e-mail ou CNPJ" autocomplete="off" aria-label="Buscar empresa por nome, e-mail ou CNPJ"></label></div>
  <div id="co-res">${companiesRes()}</div>`);
}
const PERMS = [['Ver tela principal e vagas', 1, 1, 1, 0], ['Criar/editar/publicar vagas', 1, 1, 0, 0], ['Pipeline e triagem', 1, 1, 0, 0], ['Banco de talentos completo', 1, 1, 0, 0], ['Avaliações e anotações internas', 1, 1, 0, 0], ['Ver candidatos encaminhados e decidir', 1, 0, 1, 0], ['Solicitar abertura de vaga', 1, 0, 1, 0], ['Empresas, usuários e LGPD', 1, 0, 0, 0], ['Editar próprio perfil e candidaturas', 0, 0, 0, 1]];
function usersRes() {
  const q = ui.usQ || '', list = db.users.filter(u => u.role !== 'candidate' && termsMatch(q, [u.name, u.email, ROLE_NAME[u.role], u.companyId ? compName(u.companyId) : ''], [u.doc || '', u.companyId ? (by('companies', u.companyId) || {}).cnpj : '']));
  return `<p class="sm mut mb">${list.length} ${list.length === 1 ? 'usuário' : 'usuários'}${q.trim() ? ' encontrados' : ''}</p><div class="tw"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>CPF/CNPJ</th><th>Perfil</th><th>Empresa</th><th>Status</th><th></th></tr></thead><tbody>${list.map(u => `<tr><td class="b">${esc(u.name)}</td><td class="mono">${esc(u.email)}</td><td class="xs">${userPhone(u) ? fmtPhone(userPhone(u)) : '—'}</td><td class="mono xs">${u.role === 'client' ? '—' : docShow(u.doc)}</td><td><span class="badge">${ROLE_NAME[u.role]}</span></td><td>${u.companyId ? esc(compName(u.companyId)) : '—'}</td><td>${u.active === false ? '<span class="badge" style="--c:var(--red)">Inativo</span>' : '<span class="badge" style="--c:var(--green)">Ativo</span>'}</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-act="userEdit" data-id="${u.id}">Editar</button> ${u.id !== curUser().id ? `<button class="btn sm" data-act="toggleUser" data-id="${u.id}">${u.active === false ? 'Reativar' : 'Desativar'}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="center mut" style="padding:28px">Nenhum usuário encontrado. Tente outro nome, e-mail ou CNPJ/CPF.</td></tr>'}</tbody></table></div>`;
}
function usersView() {
  return shell(`${pageHead('Usuários e acessos', 'Edite cadastros, redefina senhas e controle quem acessa. Cada perfil enxerga apenas o que precisa.', `<button class="btn pri" data-act="userMenu">${ico('plus', 16)} Novo usuário interno</button>`)}
  <div class="card mb"><h3>Matriz de permissões</h3><div class="tw" style="border:0"><table><thead><tr><th>Permissão</th><th>Admin</th><th>Recrutador</th><th>Empresa</th><th>Candidato</th></tr></thead><tbody>${PERMS.map(p => `<tr><td>${p[0]}</td>${p.slice(1).map(v => `<td>${v ? '<span style="color:var(--green)">✓</span>' : '<span class="mut">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
  <div class="flex gap wrap mb" style="align-items:flex-end"><label class="field grow" style="max-width:480px"><span>Buscar usuário</span><input type="search" data-live="usq" value="${esc(ui.usQ || '')}" placeholder="Nome, e-mail ou CNPJ/CPF" autocomplete="off" aria-label="Buscar usuário por nome, e-mail ou CNPJ"></label></div>
  <div id="us-res">${usersRes()}</div><p class="sm mut mt">${db.users.filter(u => u.role === 'candidate').length} contas de candidatos não são listadas aqui por privacidade.</p>`);
}
function requestsView() {
  return shell(`${pageHead('Solicitações de vaga', 'Pedidos enviados pelas empresas clientes.')}${db.requests.length ? db.requests.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => `<div class="card mb"><div class="flex between gap wrap"><div><h3>${esc(r.title)}</h3><p class="mut sm">${esc(compName(r.companyId))} — ${esc(r.city || '')} — ${r.qty} ${r.qty > 1 ? 'posições' : 'posição'} — ${esc(r.mode || '')} — enviada ${ago(r.date)}</p></div><span class="badge dot" style="--c:${r.status === 'nova' ? 'var(--blue)' : 'var(--green)'}">${r.status === 'nova' ? 'Nova' : 'Convertida em vaga'}</span></div>${r.salary ? `<p class="sm mt-s">Faixa desejada: ${esc(r.salary)}</p>` : ''}<p class="sm mt-s">${esc(r.notes || '')}</p>${r.status === 'nova' ? `<a class="btn pri sm mt" href="#/s/vaga/nova?req=${r.id}">Criar vaga a partir desta solicitação</a>` : ''}</div>`).join('') : '<div class="empty">Nenhuma solicitação.</div>'}`);
}
function commsView() {
  const INT = [['E-mail', 'Simulado: registra na caixa de saída abaixo', 'Resend / SendGrid via backend'], ['WhatsApp', 'Simulado: registra mensagem', 'WhatsApp Business API'], ['Calendário', 'Simulado: guarda data e tipo', 'Google Calendar / Microsoft Graph'], ['Inteligência artificial', 'Regras determinísticas locais', 'API de LLM chamada no servidor'], ['Armazenamento de currículos', 'Guarda apenas metadados do arquivo', 'S3 / Supabase Storage com URL assinada'], ['Autenticação', 'Usuário e senha locais de demonstração', 'Supabase Auth / Auth0 com hash e 2FA'], ['Cobrança', 'Plano: ' + Billing.plan, 'Stripe / Asaas por empresa cliente']];
  return shell(`${pageHead('Comunicações e integrações', 'Tudo o que o sistema enviaria por e-mail ou WhatsApp aparece aqui no MVP.')}
  <div class="card mb"><h3>Integrações (camada mock, substituível)</h3><div class="tw" style="border:0"><table><thead><tr><th>Serviço</th><th>No MVP</th><th>Em produção</th></tr></thead><tbody>${INT.map(i => `<tr><td class="b">${i[0]}</td><td>${i[1]}</td><td class="mut">${i[2]}</td></tr>`).join('')}</tbody></table></div></div>
  <h3 class="mb">Caixa de saída (fictícia)</h3><div class="tw"><table><thead><tr><th>Canal</th><th>Para</th><th>Assunto</th><th>Quando</th></tr></thead><tbody>${db.outbox.slice(0, 40).map(m => `<tr><td><span class="badge">${m.channel === 'email' ? 'E-mail' : 'WhatsApp'}</span></td><td class="mono">${esc(m.to)}</td><td>${esc(m.subject)}<div class="xs mut">${esc(m.body).slice(0, 110)}</div></td><td class="xs">${fdt(m.date)}</td></tr>`).join('') || '<tr><td colspan="4" class="center mut" style="padding:24px">Nada enviado ainda.</td></tr>'}</tbody></table></div>`);
}
/* ---------- Assistente de recrutamento (chat de demonstração) ---------- */
/* Responde só com dados deste sistema (banco de talentos + vagas), usando as mesmas regras de aderência da vaga. Produção: trocar por LLM no servidor, consultando o banco. */
const AI_STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'para', 'por', 'em', 'e', 'o', 'a', 'os', 'as', 'um', 'uma', 'vaga', 'vagas']);
const AI_GENERIC = new Set(['analista', 'assistente', 'gerente', 'executivo', 'auxiliar']);
const AI_SUGGEST = ['Selecione os 10 melhores candidatos para a vaga de Analista de Marketing Júnior', 'Top 5 para Analista de RH em Recife', 'Ranking dos melhores para Executivo Comercial com inglês', 'Os 8 melhores para Desenvolvedor Full Stack com disponibilidade imediata'];
function aiAsk(q) {
  const t = strip(q), words = t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const mm = t.match(/(\d{1,2})\s*(?:melhores|primeiros|candidat|perfis|talentos)/) || t.match(/top\s*(\d{1,2})/);
  const n = Math.max(1, Math.min(20, mm ? +mm[1] : 10));
  let job = null, best = 0;
  db.jobs.filter(j => j.status !== 'draft').forEach(j => {
    const tk = strip(j.title).split(/\s+/).filter(w => w.length > 1 && !AI_STOP.has(w)), hit = tk.filter(w => words.includes(w));
    if (!hit.some(w => !AI_GENERIC.has(w))) return;
    const s = hit.length / tk.length + (j.status === 'open' ? .01 : 0); if (s > best) { best = s; job = j; }
  });
  if (!job) return { role: 'b', text: 'Não identifiquei qual vaga você quer analisar. Cite o nome da vaga, por exemplo: "os 10 melhores para Analista de Marketing".', jobs: true };
  const filters = []; let pool = db.cands.filter(c => !c.deleted);
  if (/\b(junior|jr)\b/.test(t)) { pool = pool.filter(c => candYears(c) <= 3); filters.push('nível júnior (até 3 anos)'); }
  else if (/\b(pleno|pl)\b/.test(t)) { pool = pool.filter(c => candYears(c) > 3 && candYears(c) <= 6); filters.push('nível pleno (3 a 6 anos)'); }
  else if (/\b(senior|sr)\b/.test(t)) { pool = pool.filter(c => candYears(c) > 6); filters.push('nível sênior (mais de 6 anos)'); }
  const city = [...new Set(pool.map(c => c.city).filter(Boolean))].find(x => t.includes(strip(x)));
  if (city) { pool = pool.filter(c => c.city === city); filters.push('moram em ' + city); }
  if (t.includes('ingles')) { pool = pool.filter(c => langLvl(c, 'Inglês') >= LVL.indexOf('Intermediário')); filters.push('inglês intermediário ou superior'); }
  if (t.includes('imediata')) { pool = pool.filter(c => c.avail === 'Imediata'); filters.push('disponibilidade imediata'); }
  const all = pool.map(c => ({ cid: c.id, ...AI.compare(c, job), y: candYears(c) })).sort((a, b) => b.score - a.score || b.y - a.y);
  return { role: 'b', jobId: job.id, total: pool.length, filters, rows: all.slice(0, n), n };
}
function aiChatBot(m) {
  if (!m.jobId) return `<p>${esc(m.text)}</p>${m.jobs ? `<div class="flex wrap" style="gap:6px;margin-top:8px">${db.jobs.filter(j => j.status === 'open').slice(0, 6).map(j => `<button type="button" class="chip" data-act="aiChip" data-q="Os 10 melhores para ${esc(j.title)}">${esc(j.title)}</button>`).join('')}</div>` : ''}`;
  const j = by('jobs', m.jobId); if (!j) return '<p>Esta vaga não existe mais.</p>';
  const flt = m.filters.length ? ` Filtros aplicados: ${m.filters.map(esc).join('; ')}.` : '';
  if (!m.rows.length) return `<p>Nenhum perfil do banco atende a esses filtros para <b>${esc(j.title)}</b>.${flt} Tente retirar algum filtro.</p>`;
  const short = m.rows.length < m.n ? ` Você pediu ${m.n}, mas só ${m.rows.length} ${m.rows.length === 1 ? 'perfil atende' : 'perfis atendem'} aos filtros.` : '';
  return `<p>Aqui estão os <b>${m.rows.length} perfis mais aderentes</b> à vaga <b>${esc(j.title)}</b> — ${esc(compName(j.companyId))} (${j.city}/${j.state}), entre ${m.total} analisados no banco de talentos.${flt}${short}</p>
  <div class="tw" style="margin-top:10px"><table><thead><tr><th>#</th><th>Candidato</th><th>Aderência</th><th>Pontos fortes</th><th>Atenção</th><th></th></tr></thead><tbody>${m.rows.map((r, i) => {
    const c = by('cands', r.cid); if (!c || c.deleted) return '';
    const ap = db.apps.some(a => a.candId === c.id && a.jobId === j.id), inv = db.invites.some(x => x.candId === c.id && x.jobId === j.id);
    return `<tr><td class="b">${i + 1}</td><td><a class="b" href="#/s/candidato/${c.id}">${esc(c.name)}</a><div class="xs mut">${esc(c.title)} · ${esc(c.city)}/${c.state} · ${yTxt(candYears(c))}</div></td><td><span class="score">${r.score}%</span></td><td class="xs">${r.met.slice(0, 3).map(esc).join('<br>') || '—'}</td><td class="xs mut">${r.check.slice(0, 2).map(esc).join('<br>') || 'Nada relevante'}</td><td style="text-align:right;white-space:nowrap"><a class="btn sm" href="#/s/candidato/${c.id}">Perfil</a> ${ap ? '<span class="badge" style="--c:var(--green)">Já candidato(a)</span>' : inv ? '<span class="badge" style="--c:var(--sun)">Convidado(a)</span>' : `<button class="btn sm pri" data-act="inviteMenu" data-cid="${c.id}">Convidar</button>`}</td></tr>`;
  }).join('')}</tbody></table></div>
  <p class="xs mut" style="margin-top:8px">O percentual compara experiência, competências, formação, idioma, pretensão e localidade com os requisitos da vaga. É apoio à decisão: confira o perfil antes de convidar.</p>`;
}
function aiChatCard() {
  const ch = ui.chat || [];
  return `<div class="card mb chatc"><div class="flex between gap wrap"><h3>${ico('spark', 16)} Assistente de recrutamento</h3>${ch.length ? '<button class="btn sm" data-act="aiClear">Limpar conversa</button>' : ''}</div>
  <p class="sm mut mb">Pergunte em linguagem natural. O assistente consulta apenas o banco de talentos e as vagas deste sistema, e nunca decide sozinho.</p>
  <div class="chat" id="chatlog" aria-live="polite">${ch.length ? ch.map(m => m.role === 'u' ? `<div class="msg u">${esc(m.text)}</div>` : `<div class="msg b">${aiChatBot(m)}</div>`).join('') : `<div class="msg b"><p>Olá! Posso montar rankings de candidatos por vaga. Experimente uma destas perguntas:</p><div class="flex wrap" style="gap:6px;margin-top:8px">${AI_SUGGEST.map(s => `<button type="button" class="chip" data-act="aiChip" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>`}</div>
  <form data-form="aiChat" class="flex gap mt"><input name="q" class="grow" required autocomplete="off" maxlength="200" placeholder="Ex.: Selecione os 10 melhores candidatos para a vaga de Analista de Marketing Júnior" aria-label="Pergunta ao assistente"><button class="btn pri">${ico('spark', 14)} Perguntar</button></form></div>`;
}
const aiSend = q => { q = String(q || '').trim(); if (!q) return; (ui.chat = ui.chat || []).push({ role: 'u', text: q }, aiAsk(q)); ui.tb = ui.tb || {}; const last = ui.chat[ui.chat.length - 1]; if (last.jobId) ui.tb.job = last.jobId; render(true); const el = $('#chatlog'); if (el) el.scrollTop = el.scrollHeight; };

function aiLab() {
  const r = ui.aiResult, cands = db.cands.filter(c => !c.deleted);
  const cid = ui.aiCand || cands[0].id, jid = ui.aiJob || 'j1', c = by('cands', cid), j = by('jobs', jid);
  return shell(`${pageHead('Análise com IA (demonstração)', 'Estrutura pronta para integrar um modelo de IA de verdade. Aqui, os resultados são simulados por regras.')}
  ${aiChatCard()}
  <div class="g2"><div class="card"><h3>1. Analisar currículo</h3><p class="sm mut mb">Envie um PDF e veja quais dados seriam extraídos automaticamente.</p><form data-form="aiParse" class="stack"><input type="file" name="cv" accept=".pdf,.doc,.docx" required><button class="btn pri">${ico('spark', 14)} Analisar currículo</button></form>
  ${r ? `<div class="aibox mt"><b>${esc(r.file)}</b><div class="sm mt-s"><b>Cargo mais recente:</b> ${esc(r.title)}<br><b>Área:</b> ${esc(r.area)}<br><b>Tempo de experiência:</b> ${r.years} anos<br><b>Formação:</b> ${r.education.map(e => esc(e.level + ' em ' + e.course + ', ' + e.inst)).join('; ')}<br><b>Idiomas:</b> ${r.languages.map(l => esc(l.lang + ' (' + l.level + ')')).join(', ')}<br><b>Cargos anteriores:</b> ${r.exps.map(e => esc(e.role)).join('; ')}<br><b>Competências:</b> ${r.skills.map(esc).join(', ')}</div><p class="xs mut mt-s">Os dados extraídos sempre passam por confirmação do candidato ou do recrutador.</p></div>` : ''}</div>
  <div class="card"><h3>2. Comparar candidato com vaga</h3><div class="fg">${fld('Candidato', sel('c', cands.map(x => [x.id, x.name + ' — ' + x.title]), cid, null, 'data-act="aiSel" data-k="aiCand"'))}${fld('Vaga', sel('j', db.jobs.map(x => [x.id, x.title + ' — ' + compName(x.companyId)]), jid, null, 'data-act="aiSel" data-k="aiJob"'))}</div><div class="mt">${aiPanel(c, j)}</div></div></div>
  <div class="note mt">${ico('spark', 14)} Arquitetura: <span class="mono">AI.provider = "${AI.provider}"</span>. Para usar um modelo real, implemente <span class="mono">parseResume</span> e <span class="mono">compare</span> no backend e troque o provider. O indicador é sempre apoio, nunca decisão automática.</div>`);
}
function lgpdView() {
  const dr = db.delReqs.slice().sort((a, b) => new Date(b.date) - new Date(a.date)), cs = db.cands.filter(c => !c.deleted);
  return shell(`${pageHead('Privacidade (LGPD)', 'Consentimentos, pedidos de exclusão e registro de acessos.')}
  <div class="kpis mb"><div class="kpi"><span>Perfis com consentimento</span><b>${cs.length}</b></div><div class="kpi"><span>Aceitam convites</span><b>${cs.filter(c => c.consent.marketing).length}</b></div><div class="kpi"><span>Pedidos pendentes</span><b>${dr.filter(r => r.status === 'pendente').length}</b></div></div>
  <div class="card mb"><h3>Pedidos de exclusão</h3>${dr.length ? `<div class="tw" style="border:0"><table><thead><tr><th>Candidato</th><th>Solicitado em</th><th>Status</th><th></th></tr></thead><tbody>${dr.map(r => { const c = by('cands', r.candId); return `<tr><td>${c && !c.deleted ? esc(c.name) : 'Dados removidos'}</td><td>${fdate(r.date)}</td><td><span class="badge" style="--c:${r.status === 'pendente' ? 'var(--sun)' : 'var(--green)'}">${r.status === 'pendente' ? 'Pendente' : 'Concluído'}</span></td><td style="text-align:right">${r.status === 'pendente' ? `<button class="btn sm danger" data-act="execDelete" data-id="${r.id}">Excluir dados agora</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="mut">Nenhum pedido.</p>'}</div>
  <div class="card"><h3>Registro de acessos a perfis</h3>${db.audit.length ? `<div class="tw" style="border:0"><table><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Referência</th></tr></thead><tbody>${db.audit.slice(0, 30).map(a => `<tr><td class="xs">${fdt(a.date)}</td><td>${esc(a.user)}</td><td>${esc(a.action)}</td><td>${esc(a.ref)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="mut">Ainda sem acessos registrados. Abra o perfil de um candidato para ver o registro.</p>'}</div>`);
}

/* ---------- Empresa cliente ---------- */
const clientVisible = a => a.forwarded || ['entrevista_cliente', 'aprovado', 'contratado'].includes(a.stage);
function clientHome(u) {
  const jobs = db.jobs.filter(j => j.companyId === u.companyId), reqs = db.requests.filter(r => r.companyId === u.companyId);
  const pend = db.apps.filter(a => jobs.some(j => j.id === a.jobId) && clientVisible(a) && a.stage === 'entrevista_cliente' && !a.clientDecision).length;
  return shell(`${pageHead(esc(compName(u.companyId)), 'Acompanhe suas vagas e avalie os candidatos encaminhados.', `<a class="btn pri" href="#/e/solicitar">${ico('plus', 16)} Solicitar vaga</a>`)}
  <div class="kpis mb"><div class="kpi"><span>Vagas abertas</span><b>${jobs.filter(j => j.status === 'open').length}</b></div><div class="kpi"><span>Candidatos encaminhados</span><b>${db.apps.filter(a => jobs.some(j => j.id === a.jobId) && clientVisible(a)).length}</b></div><div class="kpi"><span>Aguardando sua avaliação</span><b>${pend}</b></div><div class="kpi"><span>Contratações</span><b>${db.apps.filter(a => jobs.some(j => j.id === a.jobId) && a.stage === 'contratado').length}</b></div></div>
  <h3 class="mb">Suas vagas</h3>${jobs.length ? `<div class="jgrid">${jobs.map(j => { const fw = jobApps(j.id).filter(clientVisible), pd = fw.filter(a => a.stage === 'entrevista_cliente' && !a.clientDecision).length; return `<a class="card jcard" href="#/e/vaga/${j.id}" style="text-decoration:none;color:inherit"><div class="flex between gap"><h3 style="margin:0">${esc(j.title)}</h3>${jobStBadge(j.status)}</div><p class="mut sm">${esc(j.city)}/${j.state} — ${j.mode} — ${salRange(j)}</p><div class="flex gap wrap"><span class="badge">${fw.length} encaminhados</span>${pd ? `<span class="badge" style="--c:var(--sun)">${pd} aguardando você</span>` : ''}</div></a>`; }).join('')}</div>` : '<div class="empty">Você ainda não tem vagas. Solicite a primeira.</div>'}
  ${reqs.length ? `<h3 class="mb mt">Suas solicitações</h3><div class="tw"><table><tbody>${reqs.map(r => `<tr><td class="b">${esc(r.title)}</td><td>${r.qty} posição(ões)</td><td>${ago(r.date)}</td><td><span class="badge" style="--c:${r.status === 'nova' ? 'var(--blue)' : 'var(--green)'}">${r.status === 'nova' ? 'Em análise pelo recrutador' : 'Vaga criada'}</span></td></tr>`).join('')}</tbody></table></div>` : ''}`);
}
function clientJob(u, id) {
  const j = by('jobs', id); if (!j || j.companyId !== u.companyId) return denied();
  const list = jobApps(j.id).filter(clientVisible).sort((a, b) => new Date(b.date) - new Date(a.date));
  const dec = { advance: ['Aprovado por você', 'var(--green)'], reject: ['Reprovado por você', 'var(--red)'], interview: ['Entrevista solicitada', 'var(--blue)'] };
  return shell(`<p class="sm mb"><a href="#/e/painel">← Painel</a></p>${pageHead(esc(j.title), `${esc(j.city)}/${j.state} — ${j.mode} — ${salRange(j)} — ${jobStBadge(j.status)}`)}
  <p class="mut mb">Candidatos encaminhados pelo recrutador. Você vê apenas o necessário para decidir; dados de contato são liberados após a contratação.</p>
  ${list.length ? `<div class="cgrid">${list.map(a => { const c = by('cands', a.candId), d = a.clientDecision && dec[a.clientDecision]; return `<article class="card tcard"><div class="flex gap">${avatar(c.name, 44)}<div class="grow"><div class="b">${esc(c.name)}</div><div class="sm mut">${esc(c.title)}</div></div></div><div class="sm mut">${ico('pin', 13)} ${esc(c.city)}/${c.state} &nbsp; ${ico('brief', 13)} ${yTxt(candYears(c))} &nbsp; ${brl(a.salary || c.salary)}</div><div class="flex wrap" style="gap:5px">${c.skills.slice(0, 4).map(s => `<span class="chip plain">${esc(s)}</span>`).join('')}</div>
  <div class="flex gap wrap">${a.stage === 'contratado' ? '<span class="badge dot" style="--c:var(--pri)">Contratado</span>' : d ? `<span class="badge dot" style="--c:${d[1]}">${d[0]}</span>` : '<span class="badge dot" style="--c:var(--sun)">Aguardando sua avaliação</span>'}${a.interview && !CLOSED.includes(a.stage) ? `<span class="badge">${ico('cal', 11)} ${fdt(a.interview.date)}</span>` : ''}</div>
  <div class="flex gap wrap" style="margin-top:auto"><button class="btn sm pri" data-act="clientView" data-app="${a.id}">Ver perfil e decidir</button></div></article>`; }).join('')}</div>` : '<div class="empty">Ainda não há candidatos encaminhados para esta vaga. Avisaremos você assim que o recrutador enviar os primeiros perfis.</div>'}`);
}
function clientRequest() {
  const u = curUser(), co = by('companies', u.companyId);
  return shell(`${pageHead('Solicitar abertura de vaga', 'Conte o que você precisa; o recrutador responsável monta a vaga com você.')}<form class="card stack" data-form="request"><div class="fg">${fld('Cargo', inp('title', '', { req: 1, ph: 'Ex.: Gerente Comercial', attrs: CARGO_ATTR }) + cargoDL())}${fld('Área', sel('area', AREA_LIST, '', 'Selecione', 'required'))}${fld('Quantidade', inp('qty', 1, { type: 'number', req: 1, attrs: 'min="1"' }))}${fld('Cidade', inp('city', co.city, { req: 1 }))}${fld('Modalidade', sel('mode', MODES, 'Presencial'))}${fld('Faixa salarial', inp('salary', '', { ph: 'Ex.: R$ 4.000 a R$ 5.500' }))}</div>${fld('Descreva a necessidade', '<textarea name="notes" required placeholder="Responsabilidades, requisitos e prazo desejado"></textarea>')}<div><button class="btn pri">Enviar solicitação</button></div></form>`);
}
/* ---------- 7. Roteador ---------- */
let rendering = false;
function parse() {
  const raw = (location.hash || '#/').slice(1), [p, q] = raw.split('?');
  const parts = p.split('/').filter(Boolean);
  return { parts, query: Object.fromEntries(new URLSearchParams(q || '')) };
}
function go(path) {
  if (location.hash === '#' + path) { if (!rendering) render(); } else location.hash = path;
}
function route() {
  const { parts, query } = parse(), u = curUser(), [a, b, c] = parts;
  if (a !== 'cadastro') { ui.google = null; ui.afterReg = null; } else if (query.next) ui.afterReg = query.next;
  const needLogin = () => { go('/entrar?next=' + encodeURIComponent('/' + parts.join('/'))); return ''; };
  if (!a) return landing();
  if (a === 'para-empresas') return bizPage();
  switch (a) {
    case 'vagas': return jobsPublic();
    case 'vaga': return jobDetail(b);
    case 'entrar': if (u) { go(homeOf(u)); return ''; } return loginView(query.next);
    case 'cadastro': return registerView();
    case 'privacidade': return policyView();
    case 'termos': return termsView();
    case 'candidatar':
      if (ui.doneJob === b && by('jobs', b)) { const j = by('jobs', b); ui.doneJob = null; return applyDone(j); }
      return applyView(b);
    case 'c': {
      if (!u) return needLogin(); if (u.role !== 'candidate') return denied();
      const cand = candOf(u); if (!cand || cand.deleted) return denied();
      if (b === 'perfil') return c === 'editar' ? pub(`<main class="wrapc narrow"><div class="ph"><div><h2>Editar perfil</h2><p>Mantenha seus dados atualizados para receber melhores oportunidades.</p></div></div><div class="card">${profileForm(cand, 'edit')}</div></main>`) : selfProfile(cand);
      if (b === 'candidaturas') return myApps(cand);
      if (b === 'notificacoes') return notifView(u);
      if (b === 'privacidade') return privacyView(cand);
      return notFound();
    }
    case 's': {
      if (!u) return needLogin(); if (!isStaff(u)) return denied();
      const adminOnly = ['empresas', 'usuarios', 'cargos', 'lgpd'];
      if (adminOnly.includes(b) && u.role !== 'admin') return denied();
      switch (b) {
        case 'dashboard': return dashboard();
        case 'indicadores': return indicadoresView(c);
        case 'vagas': return jobsAdmin();
        case 'vaga':
          if (c === 'nova') {
            let pre = { co: query.co || '' };
            if (query.req) { const r = by('requests', query.req); if (r) pre = { co: r.companyId, req: r.id, title: r.title, area: r.area, city: r.city, mode: r.mode, qty: r.qty, notes: r.notes }; }
            return jobForm(null, pre);
          }
          return parts[3] === 'editar' ? jobForm(c) : pipeline(c);
        case 'kanban': return kanbanHub();
        case 'relatorios': return c === 'ver' ? reportView(query) : reportsHub();
        case 'triagem': return triagem();
        case 'banco': return bank();
        case 'candidato': return staffCand(c, parts[3]);
        case 'empresas': return companies();
        case 'usuarios': return usersView();
        case 'cargos': return cargosView();
        case 'solicitacoes': return requestsView();
        case 'comunicacoes': return commsView();
        case 'ia': return aiLab();
        case 'lgpd': return lgpdView();
        case 'notificacoes': return notifView(u);
        default: return notFound();
      }
    }
    case 'e': {
      if (!u) return needLogin(); if (u.role !== 'client') return denied();
      if (b === 'painel') return clientHome(u);
      if (b === 'vaga') return clientJob(u, c);
      if (b === 'solicitar') return clientRequest();
      if (b === 'notificacoes') return notifView(u);
      return notFound();
    }
    default: return notFound();
  }
}
function showStep(n) {
  const steps = ['Dados de acesso', 'Perfil profissional', 'Formação e idiomas', 'Experiências e currículo', 'Privacidade'];
  ui.step = n;
  $$('[data-step]').forEach(s => s.classList.toggle('hide', +s.dataset.step !== n));
  $$('#wiz i').forEach((i, k) => i.classList.toggle('on', k <= n));
  const t = $('#wiz-t'); if (t) t.textContent = `Etapa ${n + 1} de 5: ${steps[n]}`;
  const p = $('#btn-prev'), nx = $('#btn-next'); if (p) p.disabled = n === 0; if (nx) nx.textContent = n === 4 ? 'Criar meu perfil' : 'Continuar';
}
/* ---------- Animações de rolagem, contadores e vagas clicáveis ---------- */
let fxIO = null, cntIO = null;
const reduceMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const fmtN = n => (+n || 0).toLocaleString('pt-BR');
function runCount(el) {
  const to = +el.dataset.count || 0, dur = 1600, t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = fmtN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function initFX() {
  if (fxIO) fxIO.disconnect(); if (cntIO) cntIO.disconnect();
  const counters = $$('#app [data-count]'), targets = $$('#app .sec-h, #app .stat, #app .step, #app .sec .jcard, #app .split > div, #app .band, #app .lp-rv');
  if (!('IntersectionObserver' in window) || reduceMotion()) { counters.forEach(el => { el.textContent = fmtN(el.dataset.count); }); return; }
  cntIO = new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { o.unobserve(e.target); runCount(e.target); } }), { threshold: 0.6 });
  counters.forEach(el => { el.textContent = '0'; cntIO.observe(el); });
  fxIO = new IntersectionObserver((es, o) => es.forEach(e => {
    if (!e.isIntersecting) return; const el = e.target; o.unobserve(el); el.classList.add('sfx-in');
    setTimeout(() => el.classList.remove('sfx', 'sfx-in'), 1100 + (parseFloat(el.style.getPropertyValue('--fxd')) || 0) * 1000);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(el => {
    const sibs = el.parentElement ? [...el.parentElement.children].filter(c => targets.includes(c)) : [el];
    el.style.setProperty('--fxd', (Math.min(sibs.indexOf(el), 5) * 0.09).toFixed(2) + 's'); el.classList.add('sfx'); fxIO.observe(el);
  });
}
document.addEventListener('click', e => {
  const c = e.target.closest('.jcard[data-href]');
  if (!c || e.target.closest('a,button,input,select,textarea,label')) return;
  go(c.dataset.href.slice(1));
});

const BASE_TITLE = document.title;
function render(keep) {
  const y = window.scrollY; let html; rendering = true; ui.pageTitle = null;
  try { html = route(); }
  catch (e) { console.error(e); html = pub(`<main class="wrapc narrow"><div class="empty"><b>Não foi possível carregar esta página.</b><p class="mt-s"><a href="#/">Voltar ao início</a></p></div></main>`); }
  rendering = false;
  if (html === '' || html == null) return;
  document.title = ui.pageTitle || BASE_TITLE;
  $('#app').innerHTML = html;
  $$('[data-form]').forEach(f => { f.noValidate = true; });
  if ($('#wiz')) showStep(ui.step || 0);
  window.scrollTo(0, keep ? y : 0);
  initFX();
}
const refresh = (sel, fn) => { const el = $(sel); if (el) el.innerHTML = fn(); };

/* ---------- Modal e avisos ---------- */
function openModal(title, body, wide) {
  $('#modal-root').innerHTML = `<div class="ov"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h3 style="margin:0">${esc(title)}</h3><button type="button" class="iconbtn" data-act="closeModal" aria-label="Fechar">${ico('x')}</button></header>${body}</div></div>`;
  $$('#modal-root [data-form]').forEach(f => { f.noValidate = true; });
  const f = $('#modal-root input:not([type=hidden]):not([type=checkbox]), #modal-root textarea'); if (f) f.focus();
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };
function toast(msg, err) {
  const el = document.createElement('div'); el.className = 'toast' + (err ? ' err' : ''); el.textContent = msg; $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), err ? 4200 : 3000);
}
const confirmBox = (title, text, btnLabel, act, data, danger) => openModal(title, `<p>${text}</p><div class="flex gap wrap mt" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button type="button" class="btn ${danger ? 'danger' : 'pri'}" data-act="${act}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${btnLabel}</button></div>`);

function validate(root) {
  for (const el of $$('input,select,textarea', root)) {
    if (el.hasAttribute('data-chipinput') || el.disabled || el.type === 'hidden') continue;
    if (!el.checkValidity()) { el.reportValidity(); return false; }
  }
  return true;
}
function addChip(inp) {
  const v = inp.value.replace(/,/g, '').trim(); inp.value = ''; if (!v) return;
  const box = inp.closest('[data-chips]'); if ($$('.chip', box).some(c => c.dataset.v.toLowerCase() === v.toLowerCase())) return;
  inp.insertAdjacentHTML('beforebegin', chipEl(v));
}
const chipsOf = (root, id) => { const box = $(`[data-chips="${id}"]`, root); if (!box) return []; const i = $('[data-chipinput]', box); if (i) addChip(i); return $$('.chip', box).map(c => c.dataset.v); };
const rowsOf = (root, g) => $$(`.rep[data-group="${g}"]`, root).map(r => Object.fromEntries($$('[name]', r).map(el => [el.name, el.type === 'checkbox' ? el.checked : el.value.trim()])));
const localDT = d => { const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

/* ---------- Movimentação de candidaturas ---------- */
function moveApp(id, stage) {
  const a = by('apps', id); if (!a || a.stage === stage) return;
  const job = by('jobs', a.jobId), c = by('cands', a.candId), u = curUser();
  a.stage = stage; a.history.push({ stage, date: nowISO(), by: u ? u.name : '—' });
  if (stage === 'entrevista_rh' || stage === 'entrevista_cliente') a.interview = null;
  if (stage === 'entrevista_cliente') {
    a.forwarded = true; a.clientDecision = null;
    clientsOf(job.companyId).forEach(cu => notify(cu.id, `Um novo candidato foi encaminhado para a vaga ${job.title}.`, '/e/vaga/' + job.id));
  }
  if (stage === 'contratado') {
    a.hiredDate = nowISO();
    clientsOf(job.companyId).forEach(cu => notify(cu.id, `${c.name} foi contratado(a) para ${job.title}. Os dados de contato foram liberados.`, '/e/vaga/' + job.id));
  }
  const cu = candUser(c); if (cu) notify(cu.id, CAND_MSG[stage].replace('{job}', job.title), '/c/candidaturas');
  audit('Etapa alterada', `${c.name} → ${ST[stage].name} (${job.title})`); save();
}
function requestMove(id, stage) {
  const a = by('apps', id); if (!a || a.stage === stage) return;
  const job = by('jobs', a.jobId), c = by('cands', a.candId);
  if (SIDE.includes(stage)) { reasonModal(id, stage); return; }
  doMove(id, stage);
}
function doMove(id, stage) {
  moveApp(id, stage); render(true);
  const a = by('apps', id);
  toast(`${by('cands', a.candId).name} → ${ST[stage].name}`);
  if ((stage === 'entrevista_rh' || stage === 'entrevista_cliente') && !a.interview) openSchedule(id);
}
function openSchedule(id) {
  const a = by('apps', id), c = by('cands', a.candId), job = by('jobs', a.jobId), d = new Date(Date.now() + 864e5); d.setHours(10, 0, 0, 0);
  openModal('Agendar entrevista', `<p class="sm mut mb">${esc(c.name)} — ${esc(job.title)}</p><form data-form="schedule" data-app="${id}" class="stack">${fld('Data e horário', inp('when', localDT(a.interview ? new Date(a.interview.date) : d), { type: 'datetime-local', req: 1 }))}${fld('Formato', sel('type', ['Online', 'Presencial'], a.interview ? a.interview.type : 'Online'))}<p class="xs mut">O candidato recebe aviso e e-mail com a data${a.stage === 'entrevista_cliente' ? '; a empresa também é avisada' : ''}. Convite de calendário simulado.</p><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Agora não</button><button class="btn pri">Agendar</button></div></form>`);
}

/* ---------- Ações (data-act) ---------- */
const actions = {
  googleSignIn(t) {
    const next = t.dataset.next || '';
    openModal('Escolher uma conta', `<div class="note mb">${ico('shield', 14)} <b>Demonstração:</b> nenhuma conta real do Google é usada. Escolha uma conta de exemplo para ver o fluxo.</div><p class="sm mut mb">Continuar para o <b>Vínculo</b></p><div class="stack-s">${GOOGLE_DEMO_ACCOUNTS.map(([n, e]) => `<button type="button" class="btn block" style="justify-content:flex-start;height:auto;padding:10px 14px;text-align:left" data-act="googlePick" data-name="${esc(n)}" data-email="${esc(e)}" data-next="${esc(next)}">${avatar(n, 34)}<span><b>${esc(n)}</b><br><span class="mut sm" style="font-weight:400">${esc(e)}</span>${db.users.some(x => x.email.toLowerCase() === e) ? ' <span class="badge">já cadastrado</span>' : ''}</span></button>`).join('')}</div>
    <details class="mt"><summary class="sm b" style="cursor:pointer">Usar outra conta</summary><form data-form="googleOther" data-next="${esc(next)}" class="stack mt-s">${fld('Nome', inp('name', '', { req: 1 }))}${fld('E-mail', inp('email', '', { type: 'email', req: 1 }))}<button class="btn pri">Continuar</button></form></details>`);
  },
  googlePick(t) { googleContinue(t.dataset.name, t.dataset.email, t.dataset.next); },
  googleCancel() { ui.google = null; render(true); },
  shareJob(t) { const j = by('jobs', t.dataset.id); if (j) shareModal(j, false); },
  copyFrom(t) { const el = t.dataset.src ? $(t.dataset.src) : null, val = t.dataset.val != null ? t.dataset.val : (el ? el.value : ''); copyText(val).then(ok => { if (ok) toast(t.dataset.msg || 'Copiado.'); else { if (el) { el.focus(); el.select(); } toast('Não foi possível copiar sozinho. Use Ctrl+C.', true); } }); },
  closeModal, closeSide() { ui.side = false; const a = $('.app'); if (a) a.classList.remove('open'); },
  openSide() { ui.side = true; const a = $('.app'); if (a) a.classList.add('open'); },
  logout() { Auth.logout(); ui.side = false; closeModal(); if (location.hash === '#/') render(); else go('/'); toast('Você saiu da conta.'); },
  demoLogin(t) { const u = Auth.login(t.dataset.email, 'demo123'); if (!u) return toast('Conta de demonstração indisponível. Restaure os dados.', true); toast(`Bem-vindo(a), ${u.name.split(' ')[0]}!`); go(homeOf(u)); },
  reset() { confirmBox('Restaurar dados de demonstração', 'Todos os dados criados neste navegador serão apagados e os dados de exemplo voltam ao estado inicial.', 'Restaurar', 'doReset', {}, true); },
  doReset() { Persist.clear(); db = seedDB(); Sess.set(null); save(); Object.assign(ui, { jobs: {}, tb: { limit: 18 }, tri: { stage: 'novo' }, boardq: '', cmp: {}, aiResult: null }); closeModal(); if (location.hash === '#/' || !location.hash) render(); else go('/'); toast('Dados de demonstração restaurados.'); },
  addRow(t) { const g = t.dataset.g, box = $('#g-' + g); if (box && ROWS[g]) box.insertAdjacentHTML('beforeend', ROWS[g]({})); },
  delRow(t) { const r = t.closest('.rep'); if (r) r.remove(); },
  delChip(t) { const c = t.closest('.chip'); if (c) c.remove(); },
  prevStep() { if ((ui.step || 0) > 0) { showStep(ui.step - 1); window.scrollTo(0, 0); } },
  analyzeResume(t) {
    const form = t.closest('form'), file = $('input[name=resume]', form).files[0], name = file ? file.name : 'curriculo_exemplo.pdf';
    const r = AI.parseResume(name), setv = (n, v) => { const el = $(`[name=${n}]`, form); if (el && !el.value) el.value = v; };
    setv('title', r.title); const ar = $('select[name=area]', form); if (ar && !ar.value) ar.value = r.area;
    const fill = (g, list) => { const box = $('#g-' + g, form); if (box) box.innerHTML = list.map(ROWS[g]).join(''); };
    fill('edu', r.education); fill('lang', r.languages); fill('exp', r.exps);
    const addAll = (id, list) => { const i = $(`[data-chips="${id}"] [data-chipinput]`, form); if (i) list.forEach(v => { i.value = v; addChip(i); }); };
    addAll('skills', r.skills); addAll('courses', r.certs);
    toast(file ? 'Dados sugeridos pela IA (simulada). Revise antes de salvar.' : 'Nenhum arquivo escolhido: usei um currículo de exemplo. Revise os dados.');
  },
  openResume(t) {
    const u = curUser(); if (isStaff(u)) audit('Currículo aberto', t.dataset.name);
    openModal('Currículo', `<div class="card" style="background:var(--card2)"><div class="flex gap">${ico('file', 28)}<div><b>${esc(t.dataset.name)}</b><p class="sm mut">Pré-visualização simulada.</p></div></div></div><p class="sm mut mt">No MVP apenas os metadados do arquivo são guardados (nome, tamanho, data). Em produção, o PDF ficaria em armazenamento seguro com link temporário de acesso, disponível somente a quem tem permissão.</p>`);
  },
  jobStatus(t) {
    const j = by('jobs', t.dataset.id), v = t.dataset.v; j.status = v; if (v === 'open' && !j.pubDate) j.pubDate = nowISO(); if (v === 'closed') j.closedAt = nowISO(); else if (v === 'open') j.closedAt = null;
    audit('Vaga ' + ({ open: 'publicada', paused: 'pausada', closed: 'encerrada' }[v] || 'atualizada'), j.title); save(); render(true);
    toast({ open: 'Vaga publicada.', paused: 'Vaga pausada.', closed: 'Vaga encerrada.', draft: 'Vaga em rascunho.' }[v]);
  },
  dupJob(t) {
    const j = by('jobs', t.dataset.id), n = JSON.parse(JSON.stringify(j));
    n.id = uid('j'); n.title = j.title + ' (cópia)'; n.status = 'draft'; n.pubDate = null; n.screening.forEach(q => { q.id = uid('q'); });
    db.jobs.push(n); save(); toast('Vaga duplicada como rascunho.'); go('/s/vaga/' + n.id + '/editar');
  },
  jobsFilter(t) { ui.jobsAdmin = t.dataset.v; render(true); },
  clearJobs() { ui.jobs = {}; render(true); },
  toggleMkt() { const c = candOf(curUser()); c.consent.marketing = !c.consent.marketing; save(); render(true); toast(c.consent.marketing ? 'Você passará a receber convites.' : 'Você não receberá mais convites.'); },
  requestDelete() { confirmBox('Solicitar exclusão dos meus dados', 'Seu perfil sai do banco de talentos e nossa equipe fará a exclusão dos seus dados pessoais. Esta ação não pode ser desfeita depois de concluída.', 'Solicitar exclusão', 'confirmDelete', {}, true); },
  confirmDelete() {
    const c = candOf(curUser()); if (!pendingDel(c.id)) db.delReqs.push({ id: uid('dr'), candId: c.id, date: nowISO(), status: 'pendente' });
    db.users.filter(x => x.role === 'admin').forEach(x => notify(x.id, `Novo pedido de exclusão de dados (LGPD): ${c.name}.`, '/s/lgpd'));
    save(); closeModal(); render(true); toast('Pedido enviado.');
  },
  viewMyData() {
    const c = candOf(curUser()), data = { perfil: { ...c, tags: undefined, notes: undefined }, candidaturas: candApps(c.id).map(a => ({ vaga: (by('jobs', a.jobId) || {}).title, etapa: ST[a.stage].name, data: a.date, respostas: a.answers })), pedidosDeExclusao: db.delReqs.filter(r => r.candId === c.id) };
    openModal('Meus dados', `<p class="sm mut mb">Cópia dos dados pessoais guardados sobre você. Anotações e avaliações internas da equipe não fazem parte desta visualização.</p><pre class="mono sm" style="white-space:pre-wrap;word-break:break-word;max-height:52vh;overflow:auto;background:var(--card2);padding:12px;border-radius:10px">${esc(JSON.stringify(data, null, 2))}</pre>`, true);
  },
  readAll() { const u = curUser(); db.notifs.filter(n => n.userId === u.id).forEach(n => { n.read = true; }); save(); render(true); },
  readOne(t) { const n = db.notifs.find(x => x.id === t.dataset.id); if (n && !n.read) { n.read = true; save(); if (!n.link) render(true); } },
  openApp(t) { go('/s/candidato/' + t.dataset.cid + '/' + t.dataset.app); },
  advance(t) { const a = by('apps', t.dataset.app); if (a && NEXT[a.stage]) requestMove(a.id, NEXT[a.stage]); },
  moveMenu(t) {
    const a = by('apps', t.dataset.app), c = by('cands', a.candId);
    openModal('Mover candidato', `<p class="sm mut mb">${esc(c.name)} — etapa atual: <b>${ST[a.stage].name}</b></p><div class="stack-s">${STAGES.map(s => `<button type="button" class="btn block ${s.id === a.stage ? 'pri' : ''}" style="justify-content:flex-start" ${s.id === a.stage ? 'disabled' : ''} data-act="moveTo" data-app="${a.id}" data-stage="${s.id}"><span class="badge dot" style="--c:${s.c}">${s.name}</span></button>`).join('')}</div>`);
  },
  moveTo(t) { closeModal(); requestMove(t.dataset.app, t.dataset.stage); },
  confirmMove(t) { closeModal(); doMove(t.dataset.app, t.dataset.stage); },
  scheduleMenu(t) { openSchedule(t.dataset.app); },
  bulkTriage() {
    const f = ui.tri, job = by('jobs', f.job); if (!job) return;
    const list = jobApps(job.id).filter(a => a.stage === 'novo' && (!f.stage || f.stage === 'novo') && matchCand(by('cands', a.candId), f) && (!f.ko || !koFails(a, job).length));
    list.forEach(a => moveApp(a.id, 'triagem')); render(true); toast(list.length ? `${list.length} candidaturas movidas para Triagem.` : 'Nenhuma candidatura nova para mover.');
  },
  tbForJob(t) { ui.tb.job = t.dataset.id; ui.tb.limit = 18; },
  tbMore() { ui.tb.limit = (ui.tb.limit || 18) + 18; refresh('#tb-res', tbResults); },
  clearTb() { ui.tb = { limit: 18 }; render(true); },
  clearTri() { ui.tri = { job: ui.tri.job, stage: 'novo' }; render(true); },
  preset(t) {
    if (t.dataset.w === 'tb-rh') { ui.tb = { limit: 18, q: 'Analista de RH + Recife + 2 anos', job: 'j1' }; }
    else { ui.tri = { job: 'j1', stage: '', cityq: 'Recife', minExp: '2', ko: true, lang: 'Inglês', langLevel: '1' }; }
    render(true);
  },
  inviteMenu(t) {
    const c = by('cands', t.dataset.cid), jobs = db.jobs.filter(j => j.status === 'open');
    openModal('Convidar para uma vaga', `<p class="sm mut mb">${esc(c.name)} — ${esc(c.title)}</p><form data-form="invite" data-cid="${c.id}" class="stack">${fld('Vaga', sel('jobId', jobs.map(j => [j.id, j.title + ' — ' + compName(j.companyId)]), ui.tb.job || '', null, 'required'))}${fld('Mensagem', `<textarea name="msg">Olá, ${esc(c.name.split(' ')[0])}! Seu perfil no nosso banco de talentos combina com uma vaga que estamos conduzindo. Tem interesse em participar do processo?</textarea>`)}${c.consent.marketing ? '' : `<div class="note">${ico('shield', 14)} Este candidato não autorizou convites por e-mail e WhatsApp. O convite aparecerá apenas na conta dele.</div>`}<div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Enviar convite</button></div></form>`);
  },
  cmpJob(t) { ui.cmp[t.dataset.cid] = t.value; render(true); },
  aiSel(t) { ui[t.dataset.k] = t.value; render(true); },
  aiChip(t) { aiSend(t.dataset.q); },
  aiClear() { ui.chat = []; render(true); },
  contactMenu(t) {
    const c = by('cands', t.dataset.cid), ch = t.dataset.ch, em = ch === 'email';
    openModal(em ? 'Enviar e-mail' : 'Enviar WhatsApp', `<p class="sm mut mb">Para: ${esc(c.name)} — ${esc(em ? c.email : c.phone)}</p><form data-form="message" data-cid="${c.id}" data-ch="${ch}" class="stack">${em ? fld('Assunto', inp('subject', '', { req: 1 })) : ''}${fld('Mensagem', '<textarea name="body" required></textarea>')}<p class="xs mut">Envio simulado: a mensagem é registrada em Comunicações.</p><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Enviar</button></div></form>`);
  },
  evalMenu(t) {
    const c = by('cands', t.dataset.cid), apps = candApps(c.id), cur = t.dataset.app ? by('apps', t.dataset.app) : null;
    if (!apps.length) return toast('Este candidato ainda não tem candidaturas para avaliar.', true);
    const n15 = [1, 2, 3, 4, 5];
    openModal('Registrar avaliação', `<p class="sm mut mb"><span class="lockchip">${ico('lock', 12)} interno</span> Visível apenas para a equipe. Nunca aparece para o candidato ou para a empresa.</p><form data-form="eval" data-cid="${c.id}" class="stack">${fld('Candidatura', sel('appId', apps.map(a => [a.id, by('jobs', a.jobId).title]), cur ? cur.id : apps[0].id))}
    ${fld('Pontos positivos', '<textarea name="pos" required></textarea>')}${fld('Pontos de atenção', '<textarea name="attn"></textarea>')}${fld('Observações da entrevista', '<textarea name="notes"></textarea>')}
    <div class="fg">${fld('Nota técnica (1 a 5)', sel('tech', n15, 4))}${fld('Nota comportamental (1 a 5)', sel('behav', n15, 4))}${fld('Pretensão (R$)', inp('salary', c.salary, { type: 'number' }))}${fld('Disponibilidade', sel('avail', AVAIL, c.avail))}</div>
    <div class="field"><span>Tags</span><div class="opts">${TAGS.map(x => `<label><input type="checkbox" name="tags" value="${esc(x)}" ${(c.tags || []).includes(x) ? 'checked' : ''}>${esc(x)}</label>`).join('')}</div></div>
    <div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar avaliação</button></div></form>`, true);
  },
  delTag(t) { const c = by('cands', t.dataset.cid); c.tags = (c.tags || []).filter(x => x !== t.dataset.t); save(); render(true); },
  companyMenu() {
    openModal('Nova empresa cliente', `<form data-form="company" class="stack"><div class="fg">${companyFields({})}</div><p class="xs mut">Criamos um acesso de empresa cliente para o contato, com a senha de demonstração <span class="mono">demo123</span>.</p><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Criar empresa e acesso</button></div></form>`);
  },
  userMenu() {
    openModal('Novo usuário interno', `<form data-form="user" class="stack"><div class="fg">${fld('Nome', inp('name', '', { req: 1 }))}${fld('E-mail', inp('email', '', { type: 'email', req: 1 }))}${fld('Perfil', sel('role', [['recruiter', 'Recrutador'], ['admin', 'Administrador']], 'recruiter'))}${fld('CPF ou CNPJ', inp('doc', '', { attrs: 'data-mask="doc" inputmode="numeric" maxlength="18" autocomplete="off" placeholder="CPF ou CNPJ"' }), 'obrigatório para recrutador')}${fld('Telefone', inp('phone', '', { attrs: PH_ATTR }))}${fld('Senha inicial', inp('pass', 'demo123', { req: 1, attrs: 'minlength="6"' }))}</div><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Criar usuário</button></div></form>`);
  },
  companyEdit(t) {
    const c = by('companies', t.dataset.id); if (!c) return;
    openModal('Editar empresa cliente', `<form data-form="companyEdit" data-id="${c.id}" class="stack"><div class="fg">${companyFields(c)}${passField('opcional')}</div><p class="xs mut">O e-mail e o contato acima são os do acesso da empresa. Se o CNPJ já existir em outra empresa, o sistema não permite salvar. A senha atual nunca é exibida.</p><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar alterações</button></div></form>`);
  },
  userEdit(t) {
    const u = by('users', t.dataset.id); if (!u) return; const me = u.id === curUser().id, cli = u.role === 'client';
    openModal('Editar cadastro', `<form data-form="userEdit" data-id="${u.id}" class="stack"><div class="fg">${fld('Nome', inp('name', u.name, { req: 1 }))}${fld('E-mail de acesso', inp('email', u.email, { type: 'email', req: 1 }))}${fld('Telefone', inp('phone', fmtPhone(userPhone(u)), { attrs: PH_ATTR }))}${cli ? '' : fld('CPF ou CNPJ', inp('doc', fmtDoc(u.doc), { attrs: 'data-mask="doc" inputmode="numeric" maxlength="18" autocomplete="off" placeholder="CPF ou CNPJ"' }), u.role === 'recruiter' ? 'obrigatório' : '')}${cli ? fld('Perfil', `<input value="Empresa cliente — ${esc(compName(u.companyId))}" disabled>`) : fld('Perfil', sel('role', [['recruiter', 'Recrutador'], ['admin', 'Administrador']], u.role, null, me ? 'disabled' : ''))}${fld('Status', sel('status', [['on', 'Ativo'], ['off', 'Inativo']], u.active === false ? 'off' : 'on', null, me ? 'disabled' : ''))}${passField('opcional')}</div><p class="xs mut">${cli ? 'Cidade, CNPJ e demais dados da empresa são editados em <a href="#/s/empresas" data-act="closeModal">Empresas clientes</a>. ' : ''}${me ? 'Você não pode alterar o próprio perfil nem desativar o próprio acesso. ' : ''}A senha atual nunca é exibida; informe uma nova apenas se quiser redefinir.</p><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">Salvar alterações</button></div></form>`);
  },
  cargoMenu() { cargoModal(null); },
  cargoEdit(t) { const c = (db.cargos || []).find(x => x.id === t.dataset.id); if (c) cargoModal(c); },
  cargoAdd(t) {
    const n = t.dataset.n; if (db.cargos.some(c => strip(c.name) === strip(n))) return;
    db.cargos.push({ id: uid('cg'), name: n, area: t.dataset.a }); audit('Cargo criado', n); save(); render(true); toast('Cargo adicionado à lista.');
  },
  cargoDel(t) {
    const c = db.cargos.find(x => x.id === t.dataset.id); if (!c) return; const u = cargoUse(c.name);
    openModal('Excluir cargo', `<form data-form="cargoDel" data-id="${c.id}" class="stack"><p>Excluir <b>${esc(c.name)}</b> da lista de opções?</p><p class="sm mut">${u.j + u.c ? `Há ${u.j} ${u.j === 1 ? 'vaga' : 'vagas'} e ${u.c} ${u.c === 1 ? 'perfil' : 'perfis'} com este cargo. Eles continuam como estão; apenas deixa de ser sugerido.` : 'Nenhuma vaga ou perfil usa este cargo.'}</p><div class="flex gap wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn danger">Excluir cargo</button></div></form>`);
  },
  rpMode(t) { ui.rp = ui.rp || {}; ui.rp.mode = t.dataset.v; render(true); },
  rpCo(t) { ui.rp.co = t.value; ui.rp.sel = []; render(true); },
  rpSt(t) { ui.rp.st = t.value; render(true); },
  rpToggle(t) { const s = ui.rp.sel; const i = s.indexOf(t.dataset.id); if (i < 0) s.push(t.dataset.id); else s.splice(i, 1); render(true); },
  rpPick(t) { const v = t.dataset.v, js = db.jobs.filter(j => j.companyId === ui.rp.co && j.status !== 'draft'); ui.rp.sel = js.filter(j => v === 'all' || (v === 'live' && j.status !== 'closed') || (v === 'closed' && j.status === 'closed')).map(j => j.id); render(true); },
  rpGo(t) { const rp = ui.rp; if (!rp.sel.length) return toast('Selecione ao menos uma vaga.', true); go('/s/relatorios/ver?co=' + rp.co + '&jobs=' + rp.sel.join(',')); },
  rpOpenCo(t) { ui.rp = { mode: 'cliente', co: t.dataset.id, sel: [], q: '', st: 'all' }; go('/s/relatorios'); },
  rptNames(t) { ui.rptNames = !!t.checked; refresh('#rpt-body', rptBody); },
  rptPrint() { window.print(); },
  rptCsv() {
    const { list } = rptCur(), pfx = rptPrefix(list), q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', names = !!ui.rptNames;
    const rows = [['Vaga', 'Código', ...(names ? ['Candidato'] : []), 'Data da candidatura', 'Pretensão (R$)', 'Etapa atual', 'Motivo', 'Observação']];
    list.forEach((s, i) => rptRows(s, pfx[i], names).forEach(r => rows.push([s.j.title, r.code, ...(names ? [r.name] : []), fdate(r.date), r.pret || '', r.stage, r.reason, r.note])));
    const blob = new Blob(['﻿' + rows.map(r => r.map(q).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'relatorio-' + strip(list[0] ? list[0].j.title : 'vagas').replace(/[^a-z0-9]+/g, '-') + '.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  reasonEdit(t) { const a = by('apps', t.dataset.app); if (a) reasonModal(a.id, a.stage); },
  nvSel(t) { ui.nv = ui.nv || {}; ui.nv.p = t.value; if (t.value === 'custom' && !ui.nv.from) { const d = new Date(); ui.nv.to = isoDay(d); ui.nv.from = isoDay(new Date(d.getTime() - 29 * 864e5)); } render(true); },
  nvDate(t) { ui.nv = ui.nv || { p: 'custom' }; ui.nv[t.dataset.k] = t.value; if (ui.nv.from && ui.nv.to && ui.nv.from > ui.nv.to) { const x = ui.nv.from; ui.nv.from = ui.nv.to; ui.nv.to = x; } render(true); },
  sideMini() { ui.sideMini = !ui.sideMini; SideMini.set(ui.sideMini); const a = $('.app'); if (a) a.classList.toggle('mini', ui.sideMini); $$('.side .nl[data-label]').forEach(x => ui.sideMini ? x.setAttribute('title', x.dataset.label) : x.removeAttribute('title')); const b = $('.sidetog'); if (b) { const t = ui.sideMini ? 'Expandir menu' : 'Recolher menu'; b.setAttribute('aria-label', t); b.title = t; } },
  indToggle() { if (ui.sideMini && window.innerWidth >= 1000) return go('/s/indicadores/geral'); const inInd = location.hash.startsWith('#/s/indicadores'), open = ui.indOpen === false ? false : (ui.indOpen || inInd); if (open) { ui.indOpen = false; render(true); } else { ui.indOpen = true; if (inInd) render(true); else go('/s/indicadores/geral'); } },
  indSel(t) { ui.ind = ui.ind || { p: '90d', co: '', rec: '' }; ui.ind[t.dataset.k] = t.value; render(true); },
  toggleUser(t) { const u = by('users', t.dataset.id); u.active = u.active === false; audit(u.active ? 'Usuário reativado' : 'Usuário desativado', u.email); save(); render(true); },
  execDelete(t) {
    const req = by('delReqs', t.dataset.id) || db.delReqs.find(r => r.id === t.dataset.id), id = req.candId, c = by('cands', id);
    confirmBox('Excluir dados agora', `Os dados pessoais de <b>${esc(c.name)}</b>, incluindo currículo, candidaturas e avaliações, serão removidos definitivamente.`, 'Excluir definitivamente', 'confirmExec', { id: req.id }, true);
  },
  confirmExec(t) {
    const req = db.delReqs.find(r => r.id === t.dataset.id), id = req.candId, c = by('cands', id), cu = candUser(c);
    Object.assign(c, { name: 'Candidato removido', email: '', phone: '', birth: '', linkedin: '', portfolio: '', title: '', summary: '', city: '', state: '', resume: null, exps: [], education: [], courses: [], languages: [], skills: [], tags: [], notes: '', pastHistory: [], modes: [], salary: 0, deleted: true, consent: { terms: false, storage: false, marketing: false, date: nowISO(), version: '1.0' } });
    if (cu) { cu.active = false; cu.name = 'Removido'; cu.email = `excluido+${id}@removido.invalid`; cu.pass = uid('x'); db.notifs = db.notifs.filter(n => n.userId !== cu.id); }
    db.apps = db.apps.filter(a => a.candId !== id); db.evals = db.evals.filter(e => e.candId !== id); db.invites = db.invites.filter(i => i.candId !== id);
    req.status = 'concluido'; audit('Dados excluídos (LGPD)', 'Candidato ' + id); save(); closeModal(); render(true); toast('Dados excluídos e anonimizados.');
  },
  clientView(t) {
    const u = curUser(), a = by('apps', t.dataset.app), job = a && by('jobs', a.jobId);
    if (!a || !job || job.companyId !== u.companyId || !clientVisible(a)) return toast('Acesso não permitido.', true);
    const c = by('cands', a.candId), hired = a.stage === 'contratado', decided = { advance: 'Você aprovou este candidato.', reject: 'Você reprovou este candidato.', interview: 'Você solicitou uma entrevista.' }[a.clientDecision];
    const canDecide = a.stage === 'entrevista_cliente';
    openModal(c.name, `<div class="stack"><div class="flex gap-l wrap">${avatar(c.name, 56)}<div class="grow"><p class="mut">${esc(c.title)} — ${esc(c.area)}</p><p class="sm mut">${ico('pin', 13)} ${esc(c.city)}/${c.state}</p></div></div>
    ${a.interview && !CLOSED.includes(a.stage) ? `<div class="note">${ico('cal', 14)} Entrevista: ${fdt(a.interview.date)} (${a.interview.type})</div>` : ''}
    ${profileSide(c, hired ? 'hired' : 'client')}${profileBody(c, 'client')}
    ${(a.clientFeedback || []).length ? `<div class="card"><h3>Seus comentários</h3>${a.clientFeedback.map(f => `<div class="bubble sm mt-s">${esc(f.text)}<div class="xs mut">${fdate(f.date)}</div></div>`).join('')}</div>` : ''}
    ${canDecide ? `<div class="card" style="border-color:var(--pri)"><h3>Sua decisão</h3>${decided ? `<p class="note mb">${decided} Você pode alterar a decisão abaixo.</p>` : ''}<label class="field"><span>Comentário para o recrutador <small>(opcional)</small></span><textarea id="cf-text" placeholder="Ex.: Gostei do perfil, queremos conversar na quinta."></textarea></label><div class="flex gap wrap mt"><button type="button" class="btn pri" data-act="clientDecide" data-app="${a.id}" data-v="advance">${ico('check', 14)} Aprovar</button><button type="button" class="btn" data-act="clientDecide" data-app="${a.id}" data-v="interview">${ico('cal', 14)} Solicitar entrevista</button><button type="button" class="btn danger" data-act="clientDecide" data-app="${a.id}" data-v="reject">Reprovar</button></div></div>` : `<div class="note">${hired ? 'Candidato contratado. Dados de contato liberados.' : (decided || 'Aguardando próximos passos do recrutador.')}</div>`}</div>`, true);
  },
  clientDecide(t) {
    const u = curUser(), a = by('apps', t.dataset.app), job = by('jobs', a.jobId), c = by('cands', a.candId), v = t.dataset.v, box = $('#cf-text'), text = box ? box.value.trim() : '';
    a.clientDecision = v; if (text) (a.clientFeedback = a.clientFeedback || []).push({ text, date: nowISO(), by: u.name });
    const verb = { advance: 'aprovou', reject: 'reprovou', interview: 'solicitou entrevista com' }[v];
    notify(job.recruiterId, `${compName(job.companyId)} ${verb} ${c.name} (${job.title})${text ? ': ' + text.slice(0, 80) : '.'}`, '/s/vaga/' + job.id);
    audit('Decisão da empresa: ' + verb, c.name); save(); closeModal(); render(true); toast('Decisão registrada. O recrutador foi avisado.');
  }
};

/* ---------- Formulários (data-form) ---------- */
const forms = {
  googleOther(f) { if (!validate(f)) return; const fd = new FormData(f); googleContinue(fd.get('name'), fd.get('email'), f.dataset.next); },
  login(f) {
    const fd = new FormData(f), u = Auth.login(fd.get('email'), fd.get('pass'));
    if (!u) return toast('E-mail ou senha incorretos.', true);
    const next = String(fd.get('next') || ''); toast(`Bem-vindo(a), ${u.name.split(' ')[0]}!`);
    go(next.startsWith('/') && !next.startsWith('//') ? next : homeOf(u));
  },
  profile(f) {
    const reg = f.dataset.mode === 'register';
    if (reg) {
      const n = ui.step || 0, sec = $(`[data-step="${n}"]`, f);
      if (!validate(sec)) return;
      if (n === 0) { const em = $('input[name=email]', f).value.trim().toLowerCase(); if (db.users.some(x => x.email.toLowerCase() === em)) return toast('Já existe uma conta com este e-mail. Entre para continuar.', true); }
      if (n < 4) { showStep(n + 1); window.scrollTo(0, 0); return; }
    } else if (!validate(f)) return;
    const fd = new FormData(f), g = k => String(fd.get(k) || '').trim(), file = $('input[name=resume]', f).files[0];
    const langs = []; rowsOf(f, 'lang').forEach(l => { if (l.lang && !langs.some(x => x.lang === l.lang)) langs.push({ lang: l.lang, level: l.level }); });
    const data = {
      name: g('fullName'), phone: g('phone'), city: g('city'), state: g('state'), birth: g('birth'), linkedin: g('linkedin'), portfolio: g('portfolio'),
      title: g('title'), area: g('area'), salary: +g('salary') || 0, avail: g('avail'), travel: g('travel'), modes: fd.getAll('modes'), summary: g('summary'),
      education: rowsOf(f, 'edu').filter(r => r.course || r.inst), languages: langs, exps: rowsOf(f, 'exp').filter(r => r.role || r.company),
      courses: chipsOf(f, 'courses'), skills: chipsOf(f, 'skills')
    };
    if (reg) {
      const email = g('email').toLowerCase(), id = uid('ca');
      const c = { id, email, ...data, resume: FileStore.put(file), tags: [], notes: '', pastHistory: [], consent: { terms: true, storage: true, marketing: !!fd.get('cMkt'), date: nowISO(), version: '1.0' }, createdAt: nowISO(), deleted: false };
      const u = { id: 'u_' + id, role: 'candidate', name: c.name, email, pass: ui.google ? uid('g') : g('pass'), candId: id, active: true, ...(ui.google ? { google: true } : {}) };
      db.cands.push(c); db.users.push(u); Sess.set(u.id); ui.google = null;
      notify(u.id, 'Bem-vindo(a) ao Vínculo! Seu perfil já está no banco de talentos.', '/c/perfil');
      db.users.filter(x => isStaff(x) && x.role === 'recruiter').forEach(x => notify(x.id, `Novo perfil no banco de talentos: ${c.name} (${c.area}).`, '/s/candidato/' + id));
      const dest = ui.afterReg && ui.afterReg.startsWith('/') && !ui.afterReg.startsWith('//') ? ui.afterReg : '/vagas'; ui.afterReg = null;
      save(); toast('Perfil criado! Agora você pode se candidatar às vagas.'); go(dest);
    } else {
      const c = candOf(curUser()); Object.assign(c, data); if (file) c.resume = FileStore.put(file);
      curUser().name = c.name; save(); toast('Perfil atualizado.'); go('/c/perfil');
    }
  },
  apply(f) {
    if (!validate(f)) return;
    const u = curUser(), c = candOf(u), job = by('jobs', f.dataset.job), fd = new FormData(f);
    if (!job || job.status !== 'open') return toast('Esta vaga não está mais recebendo candidaturas.', true);
    if (db.apps.some(a => a.jobId === job.id && a.candId === c.id)) return toast('Você já se candidatou a esta vaga.', true);
    const answers = {}; job.screening.forEach(q => { answers[q.id] = String(fd.get('q_' + q.id) || '').trim(); });
    const a = { id: uid('ap'), jobId: job.id, candId: c.id, date: nowISO(), stage: 'novo', answers, salary: +fd.get('salary') || c.salary, avail: String(fd.get('avail') || c.avail), note: String(fd.get('note') || '').trim(), history: [{ stage: 'novo', date: nowISO(), by: c.name }], forwarded: false, clientDecision: null, clientFeedback: [], interview: null, hiredDate: null };
    db.apps.push(a); db.invites.filter(i => i.candId === c.id && i.jobId === job.id).forEach(i => { i.status = 'aceito'; });
    notify(u.id, CAND_MSG.novo.replace('{job}', job.title), '/c/candidaturas');
    notify(job.recruiterId, `Novo candidato para a vaga ${job.title}: ${c.name}.`, '/s/vaga/' + job.id);
    save(); ui.doneJob = job.id; render();
  },
  job(f, e) {
    if (!validate(f)) return;
    const publish = !e.submitter || e.submitter.value === 'publish', fd = new FormData(f), g = k => String(fd.get(k) || '').trim(), lines = k => g(k).split('\n').map(x => x.trim()).filter(Boolean);
    const old = f.dataset.id ? by('jobs', f.dataset.id) : null, modeSel = $('select[name=mode]', f), wasOpen = !!old && old.status === 'open';
    const screening = rowsOf(f, 'sq').filter(r => r.q).map(r => ({ id: ((old ? old.screening : []).find(o => o.q === r.q) || {}).id || uid('q'), q: r.q, type: r.type, expected: r.type === 'yn' ? r.expected : '', ko: !!r.ko && r.type === 'yn' }));
    const j = old || { id: uid('j'), pubDate: null, status: 'draft', createdAt: nowISO() };
    Object.assign(j, {
      companyId: g('companyId'), title: g('title'), area: g('area'), recruiterId: g('recruiterId'), city: g('city'), state: g('state'), mode: modeSel.value, contract: g('contract'),
      salMin: +g('salMin') || 0, salMax: +g('salMax') || 0, qty: +g('qty') || 1, deadline: g('deadline'), desc: g('desc'), resp: lines('resp'), benefits: lines('benefits'),
      reqMand: lines('reqMand'), reqDesir: lines('reqDesir'), minExp: +g('minExp') || 0, degree: !!fd.get('degree'),
      lang: g('langName') ? { name: g('langName'), level: g('langLevel') } : null, skills: chipsOf(f, 'jskills'), screening
    });
    if (publish && j.status !== 'open') { j.status = 'open'; if (!j.pubDate) j.pubDate = nowISO(); }
    if (!old) db.jobs.push(j);
    const rq = f.dataset.req && by('requests', f.dataset.req);
    if (rq && rq.status === 'nova') { rq.status = 'atendida'; clientsOf(rq.companyId).forEach(cu => notify(cu.id, `Sua solicitação "${rq.title}" virou uma vaga${j.status === 'open' ? ' publicada' : ''}.`, '/e/vaga/' + j.id)); }
    audit(old ? 'Vaga editada' : 'Vaga criada', j.title); save();
    toast(j.status === 'open' ? (old ? 'Vaga atualizada.' : 'Vaga publicada!') : 'Rascunho salvo.'); go('/s/vaga/' + j.id);
    if (j.status === 'open' && !wasOpen) setTimeout(() => shareModal(j, true), 60);
  },
  schedule(f) {
    if (!validate(f)) return;
    const a = by('apps', f.dataset.app), job = by('jobs', a.jobId), c = by('cands', a.candId), fd = new FormData(f), when = new Date(fd.get('when')).toISOString(), type = fd.get('type');
    const ev = Calendar.schedule(a, when, type); a.interview = { date: when, type, link: ev.link, eventId: ev.id };
    const cu = candUser(c), txt = `Entrevista agendada para ${fdt(when)} (${type}) — ${job.title}.${ev.link ? ' Link: ' + ev.link : ''}`;
    if (cu) notify(cu.id, txt, '/c/candidaturas'); if (c.phone) WhatsApp.send(c.phone, txt);
    if (a.stage === 'entrevista_cliente') clientsOf(job.companyId).forEach(x => notify(x.id, `Entrevista com ${c.name} agendada para ${fdt(when)}.`, '/e/vaga/' + job.id));
    audit('Entrevista agendada', c.name); save(); closeModal(); render(true); toast('Entrevista agendada e candidato avisado.');
  },
  eval(f) {
    if (!validate(f)) return;
    const fd = new FormData(f), g = k => String(fd.get(k) || '').trim(), c = by('cands', f.dataset.cid), a = by('apps', g('appId')), tags = fd.getAll('tags');
    db.evals.unshift({ id: uid('ev'), candId: c.id, appId: a.id, jobId: a.jobId, by: curUser().name, date: nowISO(), pos: g('pos'), attn: g('attn') || '—', notes: g('notes') || '—', tech: +g('tech'), behav: +g('behav'), salary: +g('salary') || c.salary, avail: g('avail'), tags });
    c.tags = uniq([...(c.tags || []), ...tags]); audit('Avaliação registrada', c.name); save(); closeModal(); render(true); toast('Avaliação registrada.');
  },
  invite(f) {
    const fd = new FormData(f), c = by('cands', f.dataset.cid), job = by('jobs', String(fd.get('jobId'))), msg = String(fd.get('msg') || '').trim();
    if (!job) return toast('Escolha uma vaga.', true);
    if (db.invites.some(i => i.candId === c.id && i.jobId === job.id && i.status === 'pendente')) return toast('Este candidato já foi convidado para a vaga.', true);
    db.invites.push({ id: uid('iv'), candId: c.id, jobId: job.id, date: nowISO(), status: 'pendente', msg, by: curUser().id });
    const cu = candUser(c), text = `Você foi convidado(a) para a vaga ${job.title} (${compName(job.companyId)}).`;
    if (cu) { if (c.consent.marketing) { notify(cu.id, text, '/c/candidaturas'); if (c.phone) WhatsApp.send(c.phone, text + ' ' + msg); } else db.notifs.unshift({ id: uid('n'), userId: cu.id, text, link: '/c/candidaturas', date: nowISO(), read: false }); }
    audit('Convite enviado', `${c.name} → ${job.title}`); save(); closeModal(); ui.tb.job = job.id; render(true); toast(c.consent.marketing ? 'Convite enviado por e-mail e WhatsApp (simulado).' : 'Convite registrado na conta do candidato.');
  },
  message(f) {
    if (!validate(f)) return;
    const fd = new FormData(f), c = by('cands', f.dataset.cid), ch = f.dataset.ch;
    if (ch === 'email') Mailer.send(c.email, String(fd.get('subject')), String(fd.get('body'))); else WhatsApp.send(c.phone, String(fd.get('body')));
    audit('Contato por ' + (ch === 'email' ? 'e-mail' : 'WhatsApp'), c.name); save(); closeModal(); toast('Mensagem registrada em Comunicações (envio simulado).');
  },
  company(f) {
    if (!validate(f)) return;
    const fd = new FormData(f), g = k => String(fd.get(k) || '').trim(), email = g('email').toLowerCase();
    if (db.users.some(x => x.email.toLowerCase() === email)) return toast('Este e-mail já está em uso.', true);
    const dc = docOf(g('cnpj'), 'cnpj'); if (dc.err || !dc.d) return toast(dc.err || 'Informe o CNPJ da empresa.', true);
    if (db.companies.some(x => x.cnpj === dc.d)) return toast('Já existe uma empresa cadastrada com este CNPJ.', true);
    const ph = phoneOf(g('phone')); if (ph.err) return toast(ph.err, true);
    const co = { id: uid('co'), name: g('name'), cnpj: dc.d, sector: g('sector'), city: g('city'), state: g('state'), contact: g('contact'), phone: ph.d, email };
    db.companies.push(co); db.users.push({ id: 'u_' + co.id, role: 'client', name: co.contact, email, pass: 'demo123', companyId: co.id, active: true });
    Mailer.send(email, 'Seu acesso ao Vínculo', `Olá, ${co.contact}. Seu acesso foi criado. Senha inicial: demo123`); audit('Empresa criada', co.name); save(); render(true);
    openModal('Empresa criada', `<div class="note mb">${ico('check', 14)} <b>${esc(co.name)}</b> foi cadastrada e o acesso da empresa cliente já existe.</div><div class="card" style="background:var(--card2)"><div class="xs mut">Login da empresa</div><div class="mono b">${esc(email)}</div><div class="xs mut mt-s">Senha inicial</div><div class="mono b">demo123</div></div><p class="sm mut mt">Para testar a visão da empresa, saia e entre com essas credenciais. Um e-mail com o acesso foi registrado em Comunicações.</p><div class="flex gap wrap mt" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Fechar</button><a class="btn pri" href="#/s/vaga/nova?co=${co.id}" data-act="closeModal">Criar vaga para esta empresa</a></div>`);
  },
  user(f) {
    if (!validate(f)) return;
    const fd = new FormData(f), g = k => String(fd.get(k) || '').trim(), email = g('email').toLowerCase();
    if (db.users.some(x => x.email.toLowerCase() === email)) return toast('Este e-mail já está em uso.', true);
    const dd = docOf(g('doc')); if (dd.err) return toast(dd.err, true);
    if (g('role') === 'recruiter' && !dd.d) return toast('Informe o CPF ou CNPJ do recrutador.', true);
    if (dd.d && db.users.some(x => x.doc === dd.d)) return toast('Já existe um usuário com este CPF/CNPJ.', true);
    const ph = phoneOf(g('phone')); if (ph.err) return toast(ph.err, true);
    db.users.push({ id: uid('u_'), role: g('role'), name: g('name'), email, doc: dd.d, phone: ph.d, pass: g('pass'), active: true }); audit('Usuário criado', email); save(); closeModal(); render(true); toast('Usuário criado.');
  },
  companyEdit(f) {
    if (!validate(f)) return;
    const co = by('companies', f.dataset.id); if (!co) return;
    const fd = new FormData(f), g = k => String(fd.get(k) || '').trim(), email = g('email').toLowerCase(), acc = clientsOf(co.id)[0];
    const dc = docOf(g('cnpj'), 'cnpj'); if (dc.err || !dc.d) return toast(dc.err || 'Informe o CNPJ da empresa.', true);
    if (db.companies.some(x => x.cnpj === dc.d && x.id !== co.id)) return toast('Já existe outra empresa cadastrada com este CNPJ.', true);
    const ph = phoneOf(g('phone')); if (ph.err) return toast(ph.err, true);
    if (db.users.some(x => x !== acc && x.email.toLowerCase() === email)) return toast('Este e-mail já está em uso.', true);
    const ch = [], set = (k, v, label) => { if ((co[k] || '') !== v) { co[k] = v; ch.push(label); } };
    set('name', g('name'), 'nome'); set('cnpj', dc.d, 'CNPJ'); set('sector', g('sector'), 'setor'); set('city', g('city'), 'cidade'); set('state', g('state'), 'estado'); set('contact', g('contact'), 'contato'); set('phone', ph.d, 'telefone'); set('email', email, 'e-mail');
    const pass = g('pass'), mailChg = ch.includes('e-mail');
    if (acc) { acc.name = co.contact; acc.email = email; if (pass) { acc.pass = pass; ch.push('senha'); } }
    if (!ch.length) { closeModal(); return toast('Nenhuma alteração foi feita.'); }
    if (pass || mailChg) Mailer.send(email, 'Seus dados de acesso foram alterados', 'Um administrador atualizou os dados de acesso da sua empresa no Vínculo. Se você não esperava esta alteração, fale com a equipe.');
    audit('Empresa editada (' + ch.join(', ') + ')', co.name); save(); closeModal(); render(true); toast('Cadastro da empresa atualizado.');
  },
  userEdit(f) {
    if (!validate(f)) return;
    const u = by('users', f.dataset.id); if (!u) return; const me = u.id === curUser().id, cli = u.role === 'client';
    const fd = new FormData(f), g = k => String(fd.get(k) || '').trim(), email = g('email').toLowerCase();
    if (db.users.some(x => x.id !== u.id && x.email.toLowerCase() === email)) return toast('Este e-mail já está em uso.', true);
    const ph = phoneOf(g('phone')); if (ph.err) return toast(ph.err, true);
    let doc = u.doc || ''; const role = cli || me ? u.role : (g('role') || u.role), active = me ? true : g('status') !== 'off';
    if (!cli) {
      const dd = docOf(g('doc')); if (dd.err) return toast(dd.err, true); doc = dd.d;
      if (role === 'recruiter' && !doc) return toast('Informe o CPF ou CNPJ do recrutador.', true);
      if (doc && db.users.some(x => x.id !== u.id && x.doc === doc)) return toast('Já existe um usuário com este CPF/CNPJ.', true);
    }
    if (u.role === 'admin' && (role !== 'admin' || !active) && !db.users.some(x => x.id !== u.id && x.role === 'admin' && x.active !== false)) return toast('É preciso manter ao menos um administrador ativo.', true);
    const ch = [], set = (k, v, label) => { if ((u[k] || '') !== v) { u[k] = v; ch.push(label); } };
    set('name', g('name'), 'nome'); set('email', email, 'e-mail'); set('phone', ph.d, 'telefone'); if (!cli) set('doc', doc, 'CPF/CNPJ');
    if (u.role !== role) { u.role = role; ch.push('perfil'); }
    if ((u.active !== false) !== active) { u.active = active; ch.push(active ? 'reativado' : 'desativado'); }
    const pass = g('pass'); if (pass) { u.pass = pass; ch.push('senha'); }
    if (!ch.length) { closeModal(); return toast('Nenhuma alteração foi feita.'); }
    const co = cli ? by('companies', u.companyId) : null; if (co) { co.contact = u.name; co.email = u.email; if (ph.d) co.phone = ph.d; }
    if (pass || ch.includes('e-mail')) Mailer.send(email, 'Seus dados de acesso foram alterados', 'Um administrador atualizou seus dados de acesso ao Vínculo. Se você não esperava esta alteração, fale com a equipe.');
    audit('Cadastro editado (' + ch.join(', ') + ')', u.email); save(); closeModal(); render(true); toast('Cadastro atualizado.');
  },
  cargo(f) {
    if (!validate(f)) return;
    const fd = new FormData(f), name = String(fd.get('name') || '').replace(/\s+/g, ' ').trim(), area = String(fd.get('area') || ''), id = f.dataset.id;
    if (name.length < 2) return toast('Digite o nome do cargo.', true);
    if (db.cargos.some(c => c.id !== id && strip(c.name) === strip(name))) return toast('Este cargo já existe na lista.', true);
    if (id) { const c = db.cargos.find(x => x.id === id); if (!c) return; const old = c.name; c.name = name; c.area = area; audit('Cargo editado', old === name ? name : old + ' → ' + name); toast('Cargo atualizado.'); }
    else { db.cargos.push({ id: uid('cg'), name, area }); audit('Cargo criado', name); toast('Cargo criado. Já aparece como opção.'); }
    save(); closeModal(); render(true);
  },
  cargoDel(f) {
    const i = db.cargos.findIndex(c => c.id === f.dataset.id); if (i < 0) return;
    const [c] = db.cargos.splice(i, 1); audit('Cargo excluído', c.name); save(); closeModal(); render(true); toast('Cargo excluído da lista.');
  },
  moveReason(f) {
    if (!validate(f)) return;
    const a = by('apps', f.dataset.app), stage = f.dataset.stage, fd = new FormData(f); if (!a) return;
    if (a.stage !== stage) moveApp(a.id, stage);
    a.reason = String(fd.get('reason') || ''); a.reasonNote = String(fd.get('note') || '').trim(); const h = a.history[a.history.length - 1]; if (h && h.stage === stage) { h.reason = a.reason; h.note = a.reasonNote; }
    audit('Motivo registrado', `${by('cands', a.candId).name}: ${a.reason}`); save(); closeModal(); render(true); toast('Motivo registrado.');
  },
  request(f) {
    if (!validate(f)) return;
    const u = curUser(), fd = new FormData(f), g = k => String(fd.get(k) || '').trim();
    db.requests.unshift({ id: uid('rq'), companyId: u.companyId, title: g('title'), area: g('area'), qty: +g('qty') || 1, city: g('city'), mode: g('mode'), salary: g('salary'), notes: g('notes'), date: nowISO(), status: 'nova' });
    db.users.filter(x => isStaff(x)).forEach(x => notify(x.id, `Nova solicitação de vaga de ${compName(u.companyId)}: ${g('title')}.`, '/s/solicitacoes'));
    save(); toast('Solicitação enviada ao recrutador.'); go('/e/painel');
  },
  addTag(f) {
    const c = by('cands', f.dataset.cid), t = String(new FormData(f).get('t') || '').trim(); if (!t) return;
    c.tags = c.tags || []; if (!c.tags.includes(t)) c.tags.push(t); save(); render(true);
  },
  hsearch(f) { ui.jobs = { q: String(new FormData(f).get('q') || '').trim() }; go('/vagas'); },
  gsearch(f) { ui.tb = { limit: 18, q: String(new FormData(f).get('q') || '').trim() }; go('/s/banco'); },
  aiChat(f) { aiSend(new FormData(f).get('q')); },
  aiParse(f) {
    const file = $('input[name=cv]', f).files[0]; if (!file) return toast('Escolha um arquivo.', true);
    ui.aiResult = { file: file.name, ...AI.parseResume(file.name) }; render(true);
  }
};

/* ---------- Eventos globais ---------- */
const timers = {}; const later = (k, fn, ms = 140) => { clearTimeout(timers[k]); timers[k] = setTimeout(fn, ms); };
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) { if (e.target.classList && e.target.classList.contains('ov')) closeModal(); return; }
  if (t.tagName === 'SELECT' || (t.tagName === 'INPUT')) return;
  const fn = actions[t.dataset.act]; if (!fn) return;
  if (t.tagName === 'A' && t.getAttribute('href') === '#') e.preventDefault();
  try { fn(t, e); } catch (err) { console.error(err); toast('Algo deu errado. Tente novamente.', true); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.act && (t.tagName === 'SELECT' || t.tagName === 'INPUT')) { const fn = actions[t.dataset.act]; if (fn) fn(t.tagName === 'INPUT' ? t : t, e); return; }
  if (t.dataset && t.dataset.live === 'resume' && t.files && t.files[0]) toast('Arquivo selecionado: ' + t.files[0].name);
});
function onLive(e) {
  const t = e.target, k = t.dataset && t.dataset.live; if (!k || k === 'resume') return;
  const val = t.type === 'checkbox' ? t.checked : t.value;
  if (k === 'jobs') { ui.jobs[t.name] = val; later('jobs', () => refresh('#jobs-res', jobsResults)); }
  else if (k === 'tb') { ui.tb[t.name] = val; ui.tb.limit = 18; later('tb', () => refresh('#tb-res', tbResults)); }
  else if (k === 'tri') {
    ui.tri[t.name] = val;
    if (t.name === 'jobq') { const r = triJobMatch(val); if (r.m.length) ui.tri.job = r.m[0].j.id; refresh('#tri-jobhint', () => triJobHint(val)); }
    later('tri', () => refresh('#tri-res', triRows));
  }
  else if (k === 'jobsq') { ui.jobsQ = val; later('jq', () => refresh('#ja-res', jobsAdminRes)); }
  else if (k === 'note') { const c = by('cands', t.dataset.cid); if (c) { c.notes = val; later('note', save, 400); } }
  else if (k === 'cg') { ui.cg = ui.cg || {}; ui.cg[t.name] = val; later('cg', () => refresh('#cargo-res', cargosTable)); }
  else if (k === 'rpq') { ui.rp.q = val; later('rpq', () => { const rp = ui.rp, q = strip(rp.q || ''); refresh('#rp-res', () => rpJobsTable(db.jobs.filter(j => j.status !== 'draft' && (rp.st === 'all' || (rp.st === 'live' ? j.status !== 'closed' : j.status === 'closed')) && (!q || strip(j.title + ' ' + compName(j.companyId)).includes(q))))); }); }
  else if (k === 'rptmkt') { const j = by('jobs', t.dataset.id); if (j) { j.marketRef = +val || 0; later('rptm', () => { save(); refresh('#rpt-body', rptBody); }, 500); } }
  else if (k === 'rptnote') { const o = t.dataset.co ? by('companies', t.dataset.co) : by('jobs', t.dataset.id); if (o) { o.reportNote = val; later('rptn', () => { save(); refresh('#rpt-body', rptBody); }, 500); } }
  else if (k === 'coq') { ui.coQ = val; later('coq', () => refresh('#co-res', companiesRes)); }
  else if (k === 'usq') { ui.usQ = val; later('usq', () => refresh('#us-res', usersRes)); }
  else if (k === 'boardq') { ui.boardq = val; later('bq', () => { const j = by('jobs', parse().parts[2] || ui.kjob); if (j) refresh('#board', () => boardHtml(j)); }); }
}
document.addEventListener('input', e => { const t = e.target, m = t && t.dataset && t.dataset.mask; if (m) t.value = m === 'cnpj' ? fmtCNPJ(t.value) : m === 'phone' ? fmtPhone(t.value) : fmtDoc(t.value); });
document.addEventListener('input', onLive);
document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.live && e.target.tagName === 'SELECT') onLive(e); });
document.addEventListener('submit', e => {
  const f = e.target, h = f.dataset && forms[f.dataset.form]; if (!h) return;
  e.preventDefault();
  try { h(f, e); } catch (err) { console.error(err); toast('Algo deu errado. Tente novamente.', true); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('#modal-root .ov')) { closeModal(); return; }
  const t = e.target;
  if (t.matches && t.matches('[data-chipinput]') && (e.key === 'Enter' || e.key === ',')) { e.preventDefault(); addChip(t); }
  if (t.matches && t.matches('[data-chipinput]') && e.key === 'Backspace' && !t.value) { const last = $$('.chip', t.closest('[data-chips]')).pop(); if (last) last.remove(); }
});
document.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('[data-chipinput]')) addChip(e.target); });

// Arrastar e soltar no Kanban
let dragId = null;
document.addEventListener('dragstart', e => { const k = e.target.closest && e.target.closest('.kcard'); if (!k) return; dragId = k.dataset.app; k.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', dragId); } catch (_) { } });
document.addEventListener('dragend', () => { dragId = null; $$('.kcard.drag').forEach(k => k.classList.remove('drag')); $$('.kcol.over').forEach(k => k.classList.remove('over')); });
document.addEventListener('dragover', e => { const col = e.target.closest && e.target.closest('.kcol'); if (col && dragId) { e.preventDefault(); col.classList.add('over'); } });
document.addEventListener('dragleave', e => { const col = e.target.closest && e.target.closest('.kcol'); if (col && !col.contains(e.relatedTarget)) col.classList.remove('over'); });
document.addEventListener('drop', e => {
  const col = e.target.closest && e.target.closest('.kcol'); if (!col || !dragId) return;
  e.preventDefault(); col.classList.remove('over'); const id = dragId; dragId = null; requestMove(id, col.dataset.stage);
});


/* tema claro/escuro */
const syncTheme = () => {
  const d = Theme.eff() === 'dark', l = d ? 'Mudar para o tema claro' : 'Mudar para o tema escuro';
  $$('.themebtn').forEach(b => { b.innerHTML = ico(d ? 'sun' : 'moon', 18); b.setAttribute('aria-label', l); b.title = l; });
  $$('.seg [data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === Theme.get())));
};
actions.theme = t => { Theme.set(t.dataset.v); syncTheme(); toast({ light: 'Tema claro ativado.', dark: 'Tema escuro ativado.', auto: 'Tema automático: segue a configuração do seu aparelho.' }[t.dataset.v]); };
actions.themeToggle = () => { const n = Theme.eff() === 'dark' ? 'light' : 'dark'; Theme.set(n); syncTheme(); toast(n === 'dark' ? 'Tema escuro ativado.' : 'Tema claro ativado.'); };
try { if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme); } catch (e) { }

/* ---------- 8. Inicialização ---------- */
db = Persist.load();
if (!db || !db.users || !db.jobs) { db = seedDB(); }
['invites', 'requests', 'delReqs', 'audit', 'outbox', 'evals', 'notifs'].forEach(k => { if (!db[k]) db[k] = []; });
if (!db.cargos) db.cargos = defaultCargos();
save();
window.addEventListener('hashchange', () => { closeModal(); actions.closeSide(); render(); });
render();
window.__V = { get db() { return db; }, ui, render, route, go, actions, forms, moveApp, AI, seedDB, Auth, parse };
})();
