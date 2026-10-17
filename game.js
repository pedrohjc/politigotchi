'use strict';

// ================= Configuração =================
const W = 64, H = 52, S = 8; // tela lógica 64x52, cada pixel vira 8x8 no canvas
const TOM = { '#': 'rgba(18,28,20,0.88)', '+': 'rgba(18,28,20,0.42)', g: 'rgba(18,28,20,0.09)' };

const MIN = 60e3;
const CFG = {
  fomeMs: 4 * MIN,      // perde 1 coração de fome a cada 4 min
  humorMs: 5 * MIN,     // perde 1 coração de humor a cada 5 min
  escMin: 3 * MIN,      // novo escândalo entre 3 e 6 min
  escMax: 6 * MIN,
  investMs: 2 * MIN,    // 2+ escândalos por 2 min = investigado
  maxEsc: 3,
};

const PETS = {
  lula: {
    nome: 'Lulagotchi', politico: 'Lula', img: 'assets/ovo-lula.webp',
    lcd: { l: 28.71, t: 34.77, w: 42.82, h: 35.01 },
    btns: [[34.25, 81.66], [49.76, 82.22], [65.27, 81.66]],
    cabeca: SPR.lulaCabeca, corpo: SPR.lulaCorpo, comida: SPR.picanha,
    olhoY: 8, sobrY: 6, bocaY: 13, bigode: true, baseY: 15,
  },
  bolso: {
    nome: 'Bolsogotchi', politico: 'Bolsonaro', img: 'assets/ovo-bolso.webp',
    lcd: { l: 30.94, t: 33.57, w: 37.96, h: 30.86 },
    btns: [[34.09, 80.14], [49.68, 82.93], [65.59, 80.14]],
    cabeca: SPR.bolsoCabeca, corpo: SPR.bolsoCorpo, comida: SPR.pao,
    olhoY: 8, sobrY: 6, bocaY: 13, bigode: false, baseY: 16,
  },
};

// ================= Textos =================
const T = {
  lula: {
    nasceu: ['Nasceu! Cuida bem do seu Lulagotchi, companheiro.'],
    comer: ['Picanha servida! Pelo menos essa promessa saiu.', 'Comeu picanha e já quer outra. Companheiro tá com fome.', 'Picanha no prato. O povo ainda esperando a dele.'],
    cheio: ['Tá cheio. Guarda a picanha pra próxima campanha.'],
    agito: ['Fez o L! A militância foi à loucura.', 'Fez o L tão forte que deu cãibra.', 'Fez o L no palanque. Popularidade subiu!'],
    pano: ['Pano passado. A culpa é do governo anterior.', 'Pano passado com sucesso. Ele não sabia de nada.'],
    escandalo: ['Vazou um escândalo! Ele diz que não sabia de nada. Passa um pano!', 'Saiu escândalo no jornal. Rápido, o pano!'],
    fome: ['Tá com fome. Cadê a picanha prometida?'],
    humor: ['Tá de mau humor. Brinca um pouco com ele.'],
    morreu: 'perdeu a eleição',
  },
  bolso: {
    nasceu: ['Nasceu! Cuida bem do seu Bolsogotchi, patriota.'],
    comer: ['Pão com leite condensado. Café da manhã de estadista.', 'Comeu pão com leite condensado. Tá ok?', 'Leite condensado direto da lata. Tudo nos conformes.'],
    cheio: ['Tá cheio. Chega de leite condensado, talkey?'],
    agito: ['Motociata! Vrum vrum, 3 milhões de motos segundo ele.', 'Motociata pela orla. Capacete? Opcional.', 'Motociata no feriado. Popularidade subiu!'],
    pano: ['Pano passado. A culpa é do STF.', 'Pano passado com sucesso. É tudo fake news.'],
    escandalo: ['Vazou um escândalo! Ele diz que é fake news. Passa um pano!', 'Saiu escândalo no jornal. Rápido, o pano!'],
    fome: ['Tá com fome. Bota um pão com leite condensado aí.'],
    humor: ['Tá de mau humor. Já culpou a imprensa.'],
    morreu: 'ficou inelegível',
  },
  comum: {
    semEnergia: 'Sem energia pra agito. Dá comida primeiro.',
    panoVazio: 'Nada pra abafar... por enquanto.',
    investigado: 'Abriram uma investigação! Chama o advogado.',
    advogadoOk: 'Habeas corpus concedido! Livre, leve e solto.',
    advogadoAtoa: 'O advogado cobrou a consulta e foi embora.',
    jogo: 'Ele vai virar pra esquerda ou pra direita? A = esquerda, C = direita.',
    centrao: 'Foi pro Centrão! Ninguém ganha.',
  },
};

// ================= Estado =================
const CHAVE = 'politigotchi_v1';
let st = null;            // estado salvo
const ui = {
  modo: 'idle', sel: -1, anim: null, pagina: 0, jogo: null,
  hx: 22, pulo: 0, proxPasso: 0, piscaAte: 0, proxPisca: 0,
};
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const P = () => PETS[st.pet];
const TX = () => T[st.pet];

function novoEstado(pet) {
  const agora = Date.now();
  return {
    v: 1, pet, nascido: agora, ultimo: agora, chocado: false,
    fome: 3, humor: 3, pop: 50, esc: 0, invest: false,
    tFome: 0, tHumor: 0, tInvest: 0, proxEsc: agora + rand(CFG.escMin, CFG.escMax),
    morto: false, mortoEm: 0, som: true,
  };
}
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) {} }
function carregar() {
  try { const s = JSON.parse(localStorage.getItem(CHAVE)); if (s && PETS[s.pet]) return s; } catch (e) {}
  return null;
}

// Simula o tempo passando (dt em ms). Retorna os eventos que aconteceram.
function simular(dt, agora) {
  const ev = [];
  if (st.morto || !st.chocado) return ev;
  st.tFome += dt;
  while (st.tFome >= CFG.fomeMs) { st.tFome -= CFG.fomeMs; if (st.fome > 0 && --st.fome === 0) ev.push('fome'); }
  st.tHumor += dt;
  while (st.tHumor >= CFG.humorMs) { st.tHumor -= CFG.humorMs; if (st.humor > 0 && --st.humor === 0) ev.push('humor'); }
  if (agora >= st.proxEsc) {
    if (st.esc < CFG.maxEsc) { st.esc++; ev.push('escandalo'); }
    st.proxEsc = agora + rand(CFG.escMin, CFG.escMax);
  }
  if (st.esc >= 2 && !st.invest) {
    st.tInvest += dt;
    if (st.tInvest >= CFG.investMs) { st.invest = true; st.tInvest = 0; ev.push('investigado'); }
  } else if (st.esc < 2) st.tInvest = 0;
  const dreno = st.esc / 30 + (st.fome === 0 ? 1 / 20 : 0) + (st.humor === 0 ? 1 / 20 : 0) + (st.invest ? 1 / 15 : 0);
  st.pop -= dreno * dt / 1000;
  if (st.pop <= 0) { st.pop = 0; st.morto = true; st.mortoEm = agora; ev.push('morreu'); }
  return ev;
}
const atencao = () => st.fome === 0 || st.humor === 0 || st.esc >= 2 || st.invest;

function duracao(ms) {
  const m = Math.floor(ms / MIN), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d${String(h % 24).padStart(2, '0')}h`;
  if (h > 0) return `${h}h${String(m % 60).padStart(2, '0')}`;
  return `${m}min`;
}

// ================= Som e vibração =================
let actx = null;
function bip(f = 1900, d = 0.04, quando = 0) {
  if (!st || !st.som) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'square'; o.frequency.value = f; g.gain.value = 0.035;
    o.connect(g).connect(actx.destination);
    const t = actx.currentTime + quando; o.start(t); o.stop(t + d);
  } catch (e) {}
}
const alarme = () => { bip(2400, 0.08); bip(2400, 0.08, 0.15); bip(2400, 0.08, 0.3); };
const vibrar = () => { try { navigator.vibrate && navigator.vibrate(12); } catch (e) {} };

// ================= Desenho =================
const cv = document.getElementById('lcd');
const ctx = cv.getContext('2d');
cv.width = W * S; cv.height = H * S;

function px(x, y, tom) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  ctx.fillStyle = TOM[tom] || tom;
  ctx.fillRect(x * S + 0.5, y * S + 0.5, S - 1, S - 1);
}
function sprite(linhas, x, y, o = {}) {
  for (let r = 0; r < linhas.length; r++) {
    const ln = linhas[r];
    for (let c = 0; c < ln.length; c++) {
      if (o.cols !== undefined && c >= o.cols) break;
      const ch = ln[c];
      if (ch === '#' || ch === '+') px(x + c, y + r, o.tom || ch);
    }
  }
}
function texto(str, x, y, esc = 1, tom = '#') {
  str = str.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  for (const ch of str) {
    const g = FONTE[ch] || FONTE[' '];
    for (let i = 0; i < 15; i++) {
      if (g[i] === '1') {
        const cx = x + (i % 3) * esc, cy = y + Math.floor(i / 3) * esc;
        for (let a = 0; a < esc; a++) for (let b = 0; b < esc; b++) px(cx + a, cy + b, tom);
      }
    }
    x += 4 * esc;
  }
}
const larguraTexto = (str, esc = 1) => str.length * 4 * esc - esc;
const textoC = (str, y, esc = 1, tom = '#') => texto(str, Math.floor((W - larguraTexto(str, esc)) / 2), y, esc, tom);

function olho(x, y, tipo) {
  if (tipo === 'fechado') { px(x, y + 1, '#'); px(x + 1, y + 1, '#'); return; }
  if (tipo === 'feliz') { px(x - 1, y + 1, '#'); px(x, y, '#'); px(x + 1, y, '#'); px(x + 2, y + 1, '#'); return; }
  px(x, y, '#'); px(x + 1, y, '#'); px(x, y + 1, '#'); px(x + 1, y + 1, '#');
}
const semBracos = (corpo) => corpo.map((l, i) => (i >= 3 && i <= 5 ? '.' + l.slice(1, 15) + '.' : l));

// Desenha o político. o = { olhos, boca, bracos: 'baixo'|'cima', semCorpo, lagrima }
function boneco(x, y, o = {}) {
  const p = P();
  sprite(p.cabeca, x, y);
  for (let i = 0; i < 4; i++) { px(x + 5 + i, y + p.sobrY, '#'); px(x + 11 + i, y + p.sobrY, '#'); }
  const olhos = o.olhos || 'aberto';
  olho(x + 6, y + p.olhoY, olhos); olho(x + 12, y + p.olhoY, olhos);
  if (o.lagrima) { px(x + 6, y + p.olhoY + 3, '+'); px(x + 6, y + p.olhoY + 4, '+'); }
  if (p.bigode) for (let i = 0; i < 6; i++) px(x + 7 + i, y + p.bocaY - 1, '+');
  sprite(SPR.boca[o.boca || 'sorriso'], x + 7, y + p.bocaY);
  if (o.semCorpo) return;
  const bx = x + 2, by = y + p.cabeca.length;
  if (o.bracos === 'cima') {
    sprite(semBracos(p.corpo), bx, by);
    for (const lado of [0, 1]) {
      const m = (dx) => (lado ? bx + 15 - dx : bx + dx);
      px(m(-1), by + 2, '#'); px(m(-2), by + 1, '#'); px(m(-2), by, '#'); px(m(-2), by - 1, '#');
      px(m(-2), by - 2, '#'); px(m(-3), by - 3, '#'); px(m(-2), by - 3, '#'); px(m(-1), by - 3, '#');
    }
  } else sprite(p.corpo, bx, by);
}

function humorAtual(agora) {
  const piscando = agora < ui.piscaAte;
  const mal = st.fome === 0 || st.humor === 0 || st.invest;
  return { olhos: piscando ? 'fechado' : 'aberto', boca: mal ? 'triste' : 'sorriso', lagrima: mal && st.invest };
}

function desenhaIcones() {
  for (let i = 0; i < 4; i++) sprite(ICONES[i], i * 16 + 4, 1, { tom: ui.sel === i ? '#' : 'g' });
  for (let i = 0; i < 3; i++) sprite(ICONES[4 + i], i * 16 + 4, 43, { tom: ui.sel === 4 + i ? '#' : 'g' });
  sprite(ICONES[7], 52, 43, { tom: atencao() ? '#' : 'g' });
}
function desenhaEscandalos(qtd, agora, ateX = 99) {
  const f = Math.floor(agora / 400) % 2;
  for (let i = 0; i < qtd; i++) {
    const x = 56 - i * 8;
    if (x + 7 > ateX) continue;
    sprite(SPR.jornal, x, 35);
    px(x + 2 + f, 33, '+'); px(x + 4 + f, 32, '+');
  }
}
function limiteX() { return st.esc ? 56 - 8 * (st.esc - 1) - 21 : 40; }

function render() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  if (!st) return;
  const agora = Date.now();
  if (ui.modo === 'chocar') return renderChocar(agora);
  if (st.morto) return renderMorto();
  if (ui.modo === 'status') return renderStatus(agora);
  if (ui.modo === 'jogo') return renderJogo(agora);
  desenhaIcones();
  if (ui.modo === 'anim') return renderAnim(agora);
  desenhaEscandalos(st.esc, agora);
  if (st.invest && Math.floor(agora / 500) % 2) sprite(SPR.lupa, 1, 12);
  boneco(ui.hx, P().baseY - ui.pulo, humorAtual(agora));
}

function renderChocar(agora) {
  const t = agora - ui.anim.t0;
  if (t < 3200) sprite(SPR.ovo, 26 + (Math.floor(t / 250) % 2 ? 1 : -1), 22);
  else sprite(SPR.ovoRachado, 26, 22);
  textoC('CHOCANDO', 44, 1, '+');
}

function renderMorto() {
  sprite(SPR.lapide, 23, 12);
  textoC('FIM', 20);
  textoC(st.pet === 'lula' ? 'PERDEU' : 'INELEGIVEL', 2);
  textoC(duracao(st.mortoEm - st.nascido), 32);
}

function renderStatus() {
  const p = ui.pagina;
  if (p === 0 || p === 1) {
    textoC(p === 0 ? 'FOME' : 'HUMOR', 10);
    const v = p === 0 ? st.fome : st.humor;
    for (let i = 0; i < 4; i++) sprite(i < v ? SPR.coracao : SPR.coracaoVazio, 19 + i * 7, 24);
  } else if (p === 2) {
    textoC('POPULARIDADE', 10);
    textoC(Math.ceil(st.pop) + '%', 24, 2);
  } else {
    textoC('MANDATO', 10);
    textoC(duracao(Date.now() - st.nascido), 24, 2);
  }
  textoC(`${p + 1}/4`, 45, 1, '+');
}

function renderJogo(agora) {
  const j = ui.jogo, base = P().baseY;
  if (j.fase === 'fim') {
    textoC(`${j.acertos}/5`, 2, 2);
    const ok = j.acertos >= 3;
    boneco(22, base, { olhos: ok ? 'feliz' : 'aberto', boca: ok ? 'aberta' : 'triste', bracos: ok ? 'cima' : 'baixo' });
    return;
  }
  if (j.fase === 'espera') {
    textoC('ESQ OU DIR?', 2);
    boneco(22, base, { olhos: agora < ui.piscaAte ? 'fechado' : 'aberto' });
    texto('<', 2, 45); texto('>', 59, 45);
    textoC(`${j.rodada}/5`, 45, 1, '+');
    return;
  }
  // fase 'mostra'
  const x = j.res === -1 ? 6 : j.res === 1 ? 38 : 22;
  if (j.res === 0) textoC('CENTRAO!', 2);
  else texto(j.res === -1 ? '<' : '>', j.res === -1 ? 2 : 59, 26);
  boneco(x, base, { olhos: j.acertou ? 'feliz' : 'aberto', boca: j.acertou ? 'aberta' : 'reta' });
  textoC(j.acertou ? 'ACERTOU!' : 'ERROU!', 45);
}

function renderAnim(agora) {
  const a = ui.anim, t = agora - a.t0, prog = Math.min(1, t / a.dur), f = Math.floor(t / 300) % 2;
  const base = P().baseY;
  switch (a.tipo) {
    case 'comer': {
      desenhaEscandalos(st.esc, agora);
      boneco(10, base, { boca: f ? 'aberta' : 'sorriso', olhos: 'feliz' });
      const cols = prog < 0.33 ? 10 : prog < 0.66 ? 7 : prog < 0.95 ? 4 : 0;
      sprite(P().comida, 38, 30, { cols });
      break;
    }
    case 'recusa':
      boneco(18 + (f ? 2 : -2), base, { boca: 'reta' });
      sprite(P().comida, 46, 30);
      break;
    case 'agito':
      if (st.pet === 'lula') {
        boneco(22, base, { olhos: 'feliz', boca: 'aberta', bracos: f ? 'cima' : 'baixo' });
        if (f) { texto('L', 3, 18, 3); texto('L', 52, 18, 3); }
      } else {
        const x = Math.round(-22 + prog * 86);
        boneco(x, 14, { olhos: 'feliz', boca: 'aberta', semCorpo: true });
        sprite(SPR.moto, x - 1, 33 - (f ? 1 : 0));
      }
      break;
    case 'pano': {
      const cx = Math.round(64 - prog * 74);
      desenhaEscandalos(a.esc, agora, cx);
      boneco(8, base, { olhos: 'feliz', boca: 'sorriso' });
      sprite(SPR.pano, cx, 35 - f);
      break;
    }
    case 'ombros':
      boneco(ui.hx, base, { boca: 'reta', bracos: 'cima' });
      desenhaEscandalos(st.esc, agora);
      break;
    case 'advogado':
      desenhaEscandalos(st.esc, agora);
      if (a.curou && prog < 0.5 && f) sprite(SPR.lupa, 1, 12);
      sprite(ICONES[5], 46, 14 - f * 2);
      boneco(14, base, { olhos: prog > 0.5 ? 'feliz' : 'aberto', boca: prog > 0.5 && a.curou ? 'aberta' : 'reta' });
      break;
    case 'som':
      textoC('SOM', 16);
      textoC(st.som ? 'ON' : 'OFF', 26, 2);
      break;
    case 'carinho':
      desenhaEscandalos(st.esc, agora);
      boneco(ui.hx, base, { olhos: 'feliz', boca: 'aberta' });
      sprite(SPR.coracao, ui.hx + 22, base - 2 - Math.floor(prog * 4));
      break;
  }
}

// ================= Ações =================
function animar(tipo, dur, extra = {}) {
  ui.modo = 'anim';
  ui.anim = { tipo, dur, t0: Date.now(), ...extra };
}
function legenda(txt) { document.getElementById('legenda').textContent = txt; }

function executar(i) {
  const tx = TX();
  switch (i) {
    case 0: // comer
      if (st.fome >= 4) { animar('recusa', 1800); legenda(pick(tx.cheio)); }
      else { st.fome++; animar('comer', 3000); legenda(pick(tx.comer)); bip(1500, 0.05); bip(2000, 0.05, 0.1); }
      break;
    case 1: // jogo
      ui.modo = 'jogo';
      ui.jogo = { rodada: 1, acertos: 0, fase: 'espera', t0: Date.now() };
      legenda(T.comum.jogo);
      break;
    case 2: // agito
      if (st.fome === 0) { animar('recusa', 1800); legenda(T.comum.semEnergia); }
      else {
        st.fome--; st.humor = Math.min(4, st.humor + 1); st.pop = Math.min(100, st.pop + 6);
        animar('agito', 3000); legenda(pick(tx.agito));
      }
      break;
    case 3: // passar pano
      if (!st.esc) { animar('ombros', 1400); legenda(T.comum.panoVazio); }
      else {
        const esc = st.esc;
        st.esc = 0; st.tInvest = 0; st.pop = Math.min(100, st.pop + 2);
        animar('pano', 2500, { esc }); legenda(pick(tx.pano));
      }
      break;
    case 4: // status
      ui.modo = 'status'; ui.pagina = 0;
      break;
    case 5: { // advogado
      const curou = st.invest;
      st.invest = false; st.tInvest = 0;
      animar('advogado', 2200, { curou });
      legenda(curou ? T.comum.advogadoOk : T.comum.advogadoAtoa);
      break;
    }
    case 6: // som
      st.som = !st.som; animar('som', 1000);
      break;
  }
  salvar();
}

function escolher(d) {
  const j = ui.jogo, r = Math.random();
  j.res = r < 1 / 7 ? 0 : r < 4 / 7 ? -1 : 1;
  j.acertou = j.res === d;
  if (j.acertou) j.acertos++;
  j.fase = 'mostra'; j.t0 = Date.now();
  if (j.res === 0) legenda(T.comum.centrao);
  j.acertou ? (bip(2000, 0.05), bip(2600, 0.08, 0.08)) : bip(700, 0.15);
}

// b: 0 = A (esquerda), 1 = B (meio), 2 = C (direita)
function apertar(b) {
  if (!st || st.morto) return;
  bip(); vibrar();
  const m = ui.modo;
  if (m === 'chocar' || m === 'anim') return;
  if (m === 'status') {
    if (b === 2 || ++ui.pagina > 3) ui.modo = 'idle';
    return;
  }
  if (m === 'jogo') {
    if (ui.jogo.fase === 'espera' && b !== 1) escolher(b === 0 ? -1 : 1);
    return;
  }
  if (b === 0) ui.sel = (ui.sel + 1) % 7;
  else if (b === 1 && ui.sel >= 0) executar(ui.sel);
  else if (b === 2) ui.sel = -1;
}

// Toque direto na telinha (atalho pra quem não sabe usar os botões)
function tocarTela(e) {
  if (!st || st.morto) return;
  const r = cv.getBoundingClientRect();
  const lx = Math.floor(((e.clientX - r.left) / r.width) * W);
  const ly = Math.floor(((e.clientY - r.top) / r.height) * H);
  const m = ui.modo;
  if (m === 'status') return apertar(1);
  if (m === 'jogo') return ui.jogo.fase === 'espera' && apertar(lx < W / 2 ? 0 : 2);
  if (m !== 'idle') return;
  let idx = -1;
  if (ly <= 10) idx = Math.min(3, Math.floor(lx / 16));
  else if (ly >= 42 && lx < 48) idx = 4 + Math.floor(lx / 16);
  if (idx >= 0) { bip(); vibrar(); ui.sel = idx; executar(idx); return; }
  if (lx >= ui.hx && lx < ui.hx + 20) { bip(2200, 0.04); animar('carinho', 1000); }
}

// ================= Loop =================
let ultimoSave = 0;
function tick() {
  if (!st) return;
  const agora = Date.now();

  if (ui.modo === 'chocar') {
    if (agora - ui.anim.t0 > 4400) {
      st.chocado = true; st.nascido = agora; st.ultimo = agora;
      st.proxEsc = agora + rand(CFG.escMin, CFG.escMax);
      ui.modo = 'idle'; salvar();
      legenda(pick(TX().nasceu)); bip(1500, 0.06); bip(2000, 0.06, 0.1); bip(2600, 0.1, 0.2);
    }
    return;
  }

  // tempo do jogo
  const dt = agora - st.ultimo;
  if (dt >= 1000) {
    const ev = simular(dt, agora);
    st.ultimo = agora;
    tratarEventos(ev);
  }

  if (ui.modo === 'anim' && agora - ui.anim.t0 >= ui.anim.dur) { ui.modo = 'idle'; ui.anim = null; }
  if (ui.modo === 'jogo') {
    const j = ui.jogo;
    if (j.fase === 'mostra' && agora - j.t0 > 1300) {
      if (j.rodada < 5) { j.rodada++; j.fase = 'espera'; }
      else {
        j.fase = 'fim'; j.t0 = agora;
        if (j.acertos >= 3) st.humor = Math.min(4, st.humor + (j.acertos === 5 ? 2 : 1));
        legenda(`Acertou ${j.acertos} de 5. ` + (j.acertos >= 3 ? 'Ficou feliz!' : 'Ficou emburrado.'));
        salvar();
      }
    } else if (j.fase === 'fim' && agora - j.t0 > 2200) ui.modo = 'idle';
  }

  // andar de um lado pro outro e piscar
  if (agora > ui.proxPasso) {
    ui.proxPasso = agora + 900;
    ui.pulo = ui.pulo ? 0 : 1;
    if (ui.modo === 'idle') ui.hx = Math.max(8, Math.min(limiteX(), ui.hx + pick([-2, 0, 2])));
  }
  if (agora > ui.proxPisca) { ui.piscaAte = agora + 160; ui.proxPisca = agora + rand(2000, 5000); }

  if (agora - ultimoSave > 5000) { ultimoSave = agora; salvar(); }
}

function tratarEventos(ev) {
  if (!ev.length) return;
  const tx = TX();
  for (const e of ev) {
    if (e === 'escandalo') legenda(pick(tx.escandalo));
    if (e === 'investigado') legenda(T.comum.investigado);
    if (e === 'fome') legenda(pick(tx.fome));
    if (e === 'humor') legenda(pick(tx.humor));
  }
  if (ev.includes('morreu')) { salvar(); mostrarFim(); return; }
  alarme();
  salvar();
}

function frame() { tick(); render(); requestAnimationFrame(frame); }

// ================= Telas (HTML) =================
const $ = (id) => document.getElementById(id);
const telas = ['tela-escolha', 'tela-convite', 'tela-jogo'];
function mostrar(id) { telas.forEach((t) => ($(t).hidden = t !== id)); }

function montarOvo() {
  const p = P();
  document.body.dataset.pet = st.pet;
  $('titulo').textContent = p.nome;
  document.title = p.nome;
  $('ovo-img').src = p.img;
  Object.assign(cv.style, { left: p.lcd.l + '%', top: p.lcd.t + '%', width: p.lcd.w + '%', height: p.lcd.h + '%' });
  document.querySelectorAll('.btn').forEach((el, i) => {
    el.style.left = p.btns[i][0] + '%';
    el.style.top = p.btns[i][1] + '%';
  });
}

function iniciarJogo(novo) {
  montarOvo();
  mostrar('tela-jogo');
  $('fim').hidden = true;
  $('dica').hidden = false;
  if (novo) {
    ui.modo = 'chocar'; ui.anim = { t0: Date.now() }; ui.sel = -1;
    legenda('Chocando...');
  } else if (st.morto) {
    mostrarFim();
  } else {
    // recupera o tempo que passou com o app fechado
    const fora = Date.now() - st.ultimo;
    const passos = Math.min(Math.floor(fora / 1000), 7 * 24 * 3600);
    const ev = [];
    for (let i = 0; i < passos && !st.morto; i++) ev.push(...simular(1000, st.ultimo + (i + 1) * 1000));
    st.ultimo = Date.now();
    ui.modo = 'idle';
    if (st.morto) { salvar(); mostrarFim(); return; }
    legenda(fora > MIN ? `Você ficou ${duracao(fora)} fora. ` + (atencao() ? 'Ele precisa de você!' : 'Tá tudo sob controle.') : 'De volta ao trabalho!');
    salvar();
  }
}

function adotar(pet) {
  st = novoEstado(pet);
  salvar();
  iniciarJogo(true);
}

function mostrarFim() {
  ui.modo = 'idle'; ui.sel = -1;
  $('fim').hidden = false;
  $('dica').hidden = true;
  const dur = duracao(st.mortoEm - st.nascido);
  const msg = `Seu ${P().nome} ${TX().morreu} depois de ${dur} de mandato.`;
  legenda(msg);
  $('fim-texto').textContent = 'Fim de mandato!';
}

// ---------- Compartilhar ----------
function linkPara(pet, de, para) {
  const u = new URL(location.href);
  u.search = ''; u.hash = '';
  u.searchParams.set('pet', pet);
  if (de) u.searchParams.set('de', de);
  if (para) u.searchParams.set('para', para);
  return u.toString();
}
function abrirWhats(txt) { window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener'); }
async function compartilharNativo(txt) {
  if (navigator.share) { try { await navigator.share({ text: txt }); return true; } catch (e) { return true; } }
  return false;
}
async function copiar(txt, botao) {
  try { await navigator.clipboard.writeText(txt); const o = botao.textContent; botao.textContent = 'Copiado!'; setTimeout(() => (botao.textContent = o), 1500); } catch (e) { prompt('Copie o link:', txt); }
}
const limpaNome = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 20);

function mensagemConvite() {
  const pet = document.querySelector('input[name=pet-amigo]:checked').value;
  const de = limpaNome($('nome-meu').value), para = limpaNome($('nome-amigo').value);
  try { localStorage.setItem('politigotchi_nome', de); } catch (e) {}
  const quem = PETS[pet].politico;
  return `${para ? para + ', já' : 'Já'} que você passa tanto pano pro ${quem}, agora toma conta dele 🐣👇\n${linkPara(pet, de, para)}`;
}
function mensagemResultado() {
  const dur = duracao(st.mortoEm - st.nascido);
  return `Meu ${P().nome} ${TX().morreu} depois de ${dur} de mandato 😭 Duvido você aguentar mais tempo 👇\n${linkPara(st.pet)}`;
}

// ================= Início =================
function ligarEventos() {
  document.querySelectorAll('.btn').forEach((el) => {
    const b = Number(el.dataset.b);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.classList.add('apertado'); apertar(b); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => el.addEventListener(t, () => el.classList.remove('apertado')));
  });
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); tocarTela(e); });
  document.addEventListener('keydown', (e) => {
    if ($('tela-jogo').hidden || $('dlg-mandar').open || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key.toLowerCase();
    const b = ['arrowleft', 'a'].includes(k) ? 0 : ['arrowdown', 'enter', ' ', 'b', 's'].includes(k) ? 1 : ['arrowright', 'c', 'd', 'escape'].includes(k) ? 2 : -1;
    if (b < 0) return;
    e.preventDefault();
    const el = document.querySelector(`.btn[data-b="${b}"]`);
    el.classList.add('apertado'); setTimeout(() => el.classList.remove('apertado'), 120);
    apertar(b);
  });

  document.querySelectorAll('[data-adotar]').forEach((el) => el.addEventListener('click', () => adotar(el.dataset.adotar)));
  $('trocar').addEventListener('click', () => {
    if (st && !st.morto && !confirm(`Abandonar seu ${P().nome}?`)) return;
    st = null; try { localStorage.removeItem(CHAVE); } catch (e) {}
    document.body.dataset.pet = '';
    $('titulo').textContent = 'Politigotchi';
    mostrar('tela-escolha');
  });
  $('de-novo').addEventListener('click', () => adotar(st.pet));

  // diálogo "mandar pra um amigo"
  const dlg = $('dlg-mandar');
  $('btn-mandar').addEventListener('click', () => {
    try { $('nome-meu').value = localStorage.getItem('politigotchi_nome') || ''; } catch (e) {}
    const r = document.querySelector(`input[name=pet-amigo][value=${st ? st.pet : 'lula'}]`);
    if (r) r.checked = true;
    dlg.showModal();
  });
  $('dlg-fechar').addEventListener('click', () => dlg.close());
  $('dlg-whats').addEventListener('click', () => { abrirWhats(mensagemConvite()); dlg.close(); });
  $('dlg-copiar').addEventListener('click', (e) => copiar(mensagemConvite(), e.currentTarget));
  $('dlg-outros').addEventListener('click', async () => { if (await compartilharNativo(mensagemConvite())) dlg.close(); else copiar(mensagemConvite(), $('dlg-copiar')); });
  if (!navigator.share) $('dlg-outros').hidden = true;

  // resultado
  $('fim-whats').addEventListener('click', () => abrirWhats(mensagemResultado()));
  $('fim-outros').addEventListener('click', async () => { if (!(await compartilharNativo(mensagemResultado()))) copiar(mensagemResultado(), $('fim-outros')); });
}

function iniciar() {
  ligarEventos();
  const q = new URLSearchParams(location.search);
  const petConvite = q.get('pet');
  st = carregar();

  if (PETS[petConvite]) {
    const de = limpaNome(q.get('de')), para = limpaNome(q.get('para'));
    const p = PETS[petConvite];
    document.body.dataset.pet = petConvite;
    $('titulo').textContent = p.nome;
    $('convite-img').src = p.img;
    $('convite-texto').textContent =
      `${para ? para + ', ' : ''}${de ? 'o ' + de : 'alguém'} acha que você passa pano pro ${p.politico}. Agora toma conta dele!`;
    $('convite-btn').textContent = `Adotar meu ${p.nome} 🐣`;
    $('convite-btn').onclick = () => {
      if (st && !st.morto && st.chocado && !confirm(`Você já tem um ${PETS[st.pet].nome}. Trocar por esse?`)) {
        history.replaceState(null, '', location.pathname); iniciarJogo(false); return;
      }
      history.replaceState(null, '', location.pathname);
      adotar(petConvite);
    };
    mostrar('tela-convite');
  } else if (st) {
    iniciarJogo(!st.chocado);
  } else {
    mostrar('tela-escolha');
  }
  requestAnimationFrame(frame);
}

iniciar();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
