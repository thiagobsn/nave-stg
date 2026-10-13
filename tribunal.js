// =============================================================
//  O Tribunal
//  - 'previa' (ciclo 6): ao ser derrotado se divide em três —
//     um cai, outro foge como foguete e o terceiro ('mini') luta no CICLO EXTRA
//  - 'final' (ciclo 12): chefe final com 3 fases
// =============================================================

const PEDRA = '#d8d0c0';
const SOMBRA = '#9a9080';
const ESCURO = '#2a2030';
const CONTORNO = '#1a1020';
const OURO = '#f0c040';
const OURO_ESCURO = '#a87a20';

function novaTela(l, a) {
  const c = document.createElement('canvas');
  c.width = l;
  c.height = a;
  const g = c.getContext('2d');
  const ret = (cor, x, y, w, h) => { g.fillStyle = cor; g.fillRect(x, y, w, h); };
  return [c, ret];
}

// Prédio grande (96x72): colunas, frontão, escadaria e a balança no topo
function criarPredioTribunal() {
  const [c, ret] = novaTela(96, 72);

  // interior escuro atrás das colunas
  ret(CONTORNO, 6, 36, 84, 27);
  ret(ESCURO, 7, 37, 82, 25);

  // colunas
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 14;
    ret(CONTORNO, x - 1, 37, 8, 25);
    ret(PEDRA, x, 39, 6, 21);
    ret(SOMBRA, x + 4, 39, 2, 21);
    ret('#f4f0e8', x + 1, 39, 1, 21);
    ret(PEDRA, x - 1, 37, 8, 2); // capitel
    ret(SOMBRA, x - 1, 60, 8, 2); // base
  }

  // escadaria (cada degrau mais largo)
  [[8, 62, 80], [4, 65, 88], [0, 68, 96]].forEach(([x, y, w]) => {
    ret(CONTORNO, x, y, w, 4);
    ret(PEDRA, x + 1, y + 1, w - 2, 2);
    ret(SOMBRA, x + 1, y + 2, w - 2, 1);
  });

  // entablamento (onde vai o letreiro)
  ret(CONTORNO, 3, 27, 90, 10);
  ret(PEDRA, 4, 28, 88, 8);
  ret(SOMBRA, 4, 35, 88, 1);

  // frontão triangular
  for (let r = 0; r < 16; r++) {
    const meia = 4 + r * 2.75;
    ret(CONTORNO, Math.round(48 - meia - 1), 11 + r, Math.round(meia * 2 + 2), 1);
    if (r > 0 && r < 15) ret(r > 11 ? SOMBRA : PEDRA, Math.round(48 - meia + 1), 11 + r, Math.round(meia * 2 - 2), 1);
  }
  // brasão dourado no frontão
  ret(CONTORNO, 44, 17, 8, 7);
  ret(OURO, 45, 18, 6, 5);
  ret(OURO_ESCURO, 47, 19, 2, 3);

  // balança da justiça no topo
  ret(CONTORNO, 46, 0, 4, 12);
  ret(OURO, 47, 1, 2, 10);
  ret(CONTORNO, 33, 2, 30, 3);
  ret(OURO, 34, 3, 28, 1);
  for (const px of [34, 61]) {
    ret(OURO_ESCURO, px, 4, 1, 4); // correntes
    ret(CONTORNO, px - 4, 8, 9, 3);
    ret(OURO, px - 3, 8, 7, 2);
  }
  return c;
}

// Prédio pequeno (48x36): os três pedaços em que a prévia se divide
function criarMiniTribunal() {
  const [c, ret] = novaTela(48, 36);

  ret(CONTORNO, 3, 18, 42, 13);
  ret(ESCURO, 4, 19, 40, 11);
  for (const x of [5, 13, 31, 39]) {
    ret(CONTORNO, x - 1, 18, 6, 13);
    ret(PEDRA, x, 19, 4, 11);
    ret(SOMBRA, x + 3, 19, 1, 11);
    ret(PEDRA, x - 1, 18, 6, 1);
  }
  [[4, 30, 40], [2, 32, 44], [0, 34, 48]].forEach(([x, y, w]) => {
    ret(CONTORNO, x, y, w, 2);
    ret(PEDRA, x + 1, y, w - 2, 1);
  });

  ret(CONTORNO, 1, 13, 46, 5);
  ret(PEDRA, 2, 14, 44, 3);
  for (let r = 0; r < 8; r++) {
    const meia = 2 + r * 2.7;
    ret(CONTORNO, Math.round(24 - meia - 1), 5 + r, Math.round(meia * 2 + 2), 1);
    if (r > 0 && r < 7) ret(PEDRA, Math.round(24 - meia + 1), 5 + r, Math.round(meia * 2 - 2), 1);
  }
  ret(OURO, 22, 8, 4, 3);

  ret(CONTORNO, 23, 0, 2, 6);
  ret(CONTORNO, 16, 1, 16, 2);
  ret(OURO, 17, 1, 14, 1);
  ret(OURO, 14, 4, 5, 1);
  ret(OURO, 29, 4, 5, 1);
  return c;
}

const PREDIO_GRANDE = criarPredioTribunal();
const PREDIO_MINI = criarMiniTribunal();

const MODOS_TRIBUNAL = {
  previa: { hp: 240, sprite: PREDIO_GRANDE, escala: 1, rotulo: 'PRÉVIA', caixa: [-46, -24, 92, 58] },
  mini: { hp: 160, sprite: PREDIO_MINI, escala: 0.5, rotulo: 'EXTRA', caixa: [-22, -10, 44, 28] },
  final: { hp: 700, sprite: PREDIO_GRANDE, escala: 1, rotulo: 'TRIBUNAL', caixa: [-46, -24, 92, 58] },
};
for (const m of Object.values(MODOS_TRIBUNAL)) {
  m.branco = silhueta(m.sprite);
  m.vermelho = silhueta(m.sprite, '#ff2040');
}

let tribunal = null;
const destrocos = []; // os pedaços que caem e fogem na divisão

function criarTribunal(modo, x = LARGURA / 2, y = -40) {
  const m = MODOS_TRIBUNAL[modo];
  tribunal = {
    modo, m, hp: m.hp, hpMax: m.hp,
    x, y, t: 0, flash: 0, fase: 1, ang: 0,
    entrando: true, morrendo: 0, dividindo: 0,
    soltouBuff: false,
  };
}

function tribunalVulneravel() {
  const b = tribunal;
  return b && !b.entrando && b.morrendo === 0 && b.dividindo === 0;
}

// caixa de colisão do prédio (sem a balança do topo)
function caixaTribunal() {
  const [dx, dy, w, h] = tribunal.m.caixa;
  return [tribunal.x + dx, tribunal.y + dy, w, h];
}

function ferirTribunal(dano) {
  const b = tribunal;
  b.hp -= dano;
  b.flash = 2;
  tocarSom('acerto');
  if (b.hp > 0) return;

  b.hp = 0;
  balas.length = 0;
  tocarSom('explosaoGrande');
  if (b.modo === 'previa') {
    // a prévia não morre: treme e se divide em três
    b.dividindo = 100;
    placar += 5000;
    mostrarMensagem('O TRIBUNAL SE DIVIDIU!', '#ff5a6a');
  } else {
    b.morrendo = b.modo === 'final' ? 200 : 90;
    placar += b.modo === 'final' ? 20000 : 8000;
  }
}

function dividirTribunal() {
  const { x, y } = tribunal;
  for (let i = 0; i < 3; i++) explodir(x + (i - 1) * 30, y, 3);
  destrocos.push({ tipo: 'cai', x: x - 30, y, vx: -1, vy: -1.5, ang: 0, t: 0 });
  destrocos.push({ tipo: 'foge', x: x + 30, y, vx: 0.4, vy: 0, t: 0 });
  criarTribunal('mini', x, y);
  iniciarCicloExtra();
}

// pontos de onde saem os disparos (proporcionais ao tamanho do prédio)
const pontoTribunal = (b, dx, dy) => [b.x + dx * b.m.escala, b.y + dy * b.m.escala];
const olhoEsq = (b) => pontoTribunal(b, -14, 8);
const olhoDir = (b) => pontoTribunal(b, 14, 8);
const porta = (b) => pontoTribunal(b, 0, 16);
const fronte = (b) => pontoTribunal(b, 0, -18);

function atualizarTribunal() {
  atualizarDestrocos();
  const b = tribunal;
  if (!b) return;
  b.t++;
  if (b.flash > 0) b.flash--;

  if (b.dividindo > 0) {
    b.dividindo--;
    b.flash = b.dividindo % 4 < 2 ? 2 : 0;
    if (b.dividindo % 5 === 0) {
      explodir(b.x + aleatorio(-44, 44), b.y + aleatorio(-30, 32), 2);
      tocarSom('explosao');
    }
    if (b.dividindo === 0) dividirTribunal();
    return;
  }

  if (b.morrendo > 0) {
    b.morrendo--;
    b.y += 0.12;
    const raio = 44 * b.m.escala;
    if (b.morrendo % 6 === 0) {
      explodir(b.x + aleatorio(-raio, raio), b.y + aleatorio(-raio * 0.7, raio * 0.7), 2);
      tocarSom('explosao');
    }
    if (b.morrendo === 0) {
      tocarSom('explosaoGrande');
      const n = b.modo === 'final' ? 6 : 3;
      for (let i = 0; i < n; i++) explodir(b.x + aleatorio(-raio, raio) * 0.6, b.y + aleatorio(-20, 20) * b.m.escala, 4);
      tribunal = null;
      chefeDerrotado();
    }
    return;
  }

  if (b.entrando) {
    if (b.modo === 'mini') {
      // o pedaço que fica se ajeita enquanto aparece o aviso de CICLO EXTRA
      b.y += (60 - b.y) * 0.03;
      if (b.t > 150) b.entrando = false;
    } else {
      b.y += 0.6;
      if (b.y >= 62) b.entrando = false;
    }
    if (!b.entrando) b.t = 0;
    return;
  }

  // buffs especiais que o Tribunal deixa cair
  if (b.modo === 'previa' && !b.soltouBuff && b.hp < b.hpMax * 0.6) {
    b.soltouBuff = true;
    soltarBuff('decimo1', b.x, b.y + 20);
  }

  // o chefe final muda de fase conforme perde vida
  const proporcao = b.hp / b.hpMax;
  const fase = b.modo !== 'final' ? 1 : proporcao > 0.66 ? 1 : proporcao > 0.33 ? 2 : 3;
  if (fase !== b.fase) {
    b.fase = fase;
    for (const bl of balas) faisca(bl.x, bl.y);
    balas.length = 0;
    b.flash = 20;
    mostrarMensagem(fase === 2 ? 'SESSÃO EXTRAORDINÁRIA!' : 'JULGAMENTO FINAL!', '#ff5a6a');
    if (fase === 3) soltarBuff('decimo2', b.x, b.y + 20);
  }

  // movimento
  if (b.modo === 'mini') {
    b.x = LARGURA / 2 + Math.sin(b.t / 50) * 70;
    b.y = 60 + Math.sin(b.t / 30) * 10;
  } else {
    const amp = fase === 3 ? 66 : 50;
    const periodo = fase === 3 ? 70 : 100;
    b.x = LARGURA / 2 + Math.sin(b.t / periodo) * amp;
    b.y = 62 + Math.sin(b.t / 37) * 4;
  }

  if (nave.morta > 0) return;
  const t = b.t;

  if (b.modo === 'previa') {
    if (t % 60 === 0) leque(...porta(b), 3, 0.25, 1.7, '#f0c040');
    if (t % 150 === 75) anel(...fronte(b), 12, 1.3, '#ff4a8a', t * 0.05);
    return;
  }

  if (b.modo === 'mini') {
    // menor e mais nervoso: mira rápido e solta anéis
    if (t % 40 === 0) leque(...porta(b), 3, 0.3, 2.1, '#f0c040');
    if (t % 110 === 55) anel(...fronte(b), 10, 1.4, '#ff4a8a', t * 0.07);
    return;
  }

  if (fase === 1) {
    if (t % 45 === 0) leque(...porta(b), 5, 0.2, 1.9, '#f0c040');
    if (t % 120 === 60) anel(...fronte(b), 16, 1.3, '#ff4a8a', (t / 120) * 0.2);
  } else if (fase === 2) {
    // espiral saindo do frontão + olhos mirando + convoca martelos
    if (t % 8 === 0) {
      b.ang += 0.32;
      bala(...fronte(b), b.ang, 1.5, '#b04aff');
      bala(...fronte(b), b.ang + Math.PI, 1.5, '#b04aff');
    }
    if (t % 80 === 0) {
      balaMirada(...olhoEsq(b), 2.2, '#ff2040');
      balaMirada(...olhoDir(b), 2.2, '#ff2040');
    }
    if (t % 240 === 120) {
      criarInimigo('martelo', b.x - 40, b.y + 10, { yAlvo: b.y + 30 });
      criarInimigo('martelo', b.x + 40, b.y + 10, { yAlvo: b.y + 30 });
    }
  } else {
    // espirais em sentidos opostos + leque largo
    if (t % 6 === 0) {
      b.ang += 0.27;
      bala(...fronte(b), b.ang, 1.6, '#b04aff');
      bala(...fronte(b), -b.ang + Math.PI, 1.6, '#ff4a8a');
    }
    if (t % 70 === 0) leque(...porta(b), 7, 0.16, 2, '#f0c040');
  }
}

// ---------- Os pedaços da divisão ----------
function atualizarDestrocos() {
  for (let i = destrocos.length - 1; i >= 0; i--) {
    const d = destrocos[i];
    d.t++;
    if (d.tipo === 'cai') {
      // despenca girando e soltando fumaça até se espatifar
      d.vy += 0.08;
      d.x += d.vx;
      d.y += d.vy;
      d.ang += 0.09;
      if (d.t % 3 === 0) rastro(d.x, d.y, '#5a5a6a', -0.3);
      if (d.y > ALTURA - 12) {
        for (let k = 0; k < 3; k++) explodir(d.x + aleatorio(-16, 16), d.y - aleatorio(0, 12), 4);
        mostrarMensagem('UM TRIBUNAL CAIU!', '#ffd030');
        tocarSom('explosaoGrande');
        destrocos.splice(i, 1);
      }
    } else {
      // treme no lugar acendendo os motores e dispara para cima como foguete
      if (d.t === 111) tocarSom('foguete');
      if (d.t > 110) {
        d.vy -= 0.15;
        d.y += d.vy;
        d.x += d.vx;
      }
      const forca = d.t > 110 ? 3 : 1;
      for (let k = 0; k < forca; k++) rastro(d.x + aleatorio(-10, 10), d.y + 18, escolher(['#ffe060', '#ff8a20', '#ff4a20']), 1.5);
      if (d.y < -60) {
        mostrarMensagem('OUTRO FUGIU COMO FOGUETE!', '#ff8a40');
        destrocos.splice(i, 1);
      }
    }
  }
}

function desenharDestrocos() {
  for (const d of destrocos) {
    ctx.save();
    if (d.tipo === 'cai') {
      ctx.translate(Math.round(d.x), Math.round(d.y));
      ctx.rotate(d.ang);
      ctx.drawImage(PREDIO_MINI, -24, -18);
    } else {
      const tremor = d.t <= 110 ? Math.round(aleatorio(-1, 1)) : 0;
      const x = Math.round(d.x) + tremor;
      const y = Math.round(d.y);
      // chamas dos "motores" embaixo da escadaria
      const chama = (d.t > 110 ? 14 : 5) + ((quadro >> 1) % 3) * 2;
      for (const ox of [-14, -2, 10]) {
        ctx.fillStyle = '#ff6a00';
        ctx.fillRect(x + ox, y + 18, 4, chama);
        ctx.fillStyle = '#ffe060';
        ctx.fillRect(x + ox + 1, y + 18, 2, Math.round(chama * 0.6));
      }
      ctx.drawImage(PREDIO_MINI, x - 24, y - 18);
    }
    ctx.restore();
  }
}

// ---------- Desenho ----------
function desenharTribunal() {
  desenharDestrocos();
  const b = tribunal;
  if (!b) return;
  const { sprite, branco, vermelho, escala } = b.m;
  const tremor = b.morrendo > 0 || b.dividindo > 0 ? Math.round(aleatorio(-2, 2)) : 0;
  const x = Math.round(b.x - sprite.width / 2) + tremor;
  const y = Math.round(b.y - sprite.height / 2);

  const piscando = b.flash > 0 && b.flash % 2 === 0;
  ctx.drawImage(piscando ? branco : sprite, x, y);

  // na fase final o prédio pulsa em vermelho
  if (b.fase === 3 && !piscando) {
    ctx.globalAlpha = 0.15 + Math.sin(quadro / 6) * 0.1;
    ctx.drawImage(vermelho, x, y);
    ctx.globalAlpha = 1;
  }
  if (piscando) return;

  const olhar = Math.max(-1, Math.min(1, Math.round((nave.x - b.x) / 40)));
  const brilho = b.fase === 3 && (quadro >> 2) % 2 ? '#ffffff' : '#ff2040';

  if (escala === 1) {
    // letreiro
    ctx.font = `8px ${FONTE}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#3a3040';
    ctx.fillText('TRIBUNAL', x + 16, y + 28);

    // olhos vermelhos entre as colunas, acompanhando a nave
    for (const ox of [30, 58]) {
      ctx.fillStyle = '#5a0010';
      ctx.fillRect(x + ox + 1, y + 42, 6, 4);
      ctx.fillStyle = brilho;
      ctx.fillRect(x + ox + 3 + olhar, y + 43, 2, 2);
    }

    // a porta central se acende quando ele está prestes a atirar
    const aceso = b.modo === 'final' ? b.t % 45 > 35 || b.fase > 1 : b.t % 60 > 48;
    ctx.fillStyle = aceso && !b.entrando ? '#ffd030' : '#120a18';
    ctx.fillRect(x + 45, y + 50, 6, 12);
  } else {
    for (const ox of [9, 35]) {
      ctx.fillStyle = brilho;
      ctx.fillRect(x + ox + 1 + olhar, y + 22, 2, 2);
    }
    ctx.fillStyle = b.t % 40 > 30 && !b.entrando ? '#ffd030' : '#120a18';
    ctx.fillRect(x + 21, y + 23, 6, 7);
  }
}

function desenharBarraTribunal() {
  const b = tribunal;
  if (!b || b.entrando) return;
  texto(b.m.rotulo, 6, 26, '#ff5a6a');
  const x = 80;
  const largura = 168;
  ctx.fillStyle = '#000000';
  ctx.fillRect(x - 1, 26, largura + 2, 8);
  ctx.fillStyle = '#3a1020';
  ctx.fillRect(x, 27, largura, 6);
  ctx.fillStyle = b.fase === 3 ? '#ff2040' : b.fase === 2 ? '#ff8a20' : '#f0c040';
  ctx.fillRect(x, 27, Math.ceil((largura * b.hp) / b.hpMax), 6);
  // marcas das fases do chefe final
  if (b.modo === 'final') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + Math.round(largura * 0.33), 27, 1, 6);
    ctx.fillRect(x + Math.round(largura * 0.66), 27, 1, 6);
  }
}
