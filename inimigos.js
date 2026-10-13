// =============================================================
//  Inimigos menores
//  - Servos do Tribunal: processo, martelo, carimbo, balança
//  - Obras e rodovias: cone, betoneira, rolo compactador, barreira
// =============================================================

// ---------- Formas de movimento ----------
const MOVIMENTOS = {
  // desce ondulando de um lado para o outro
  seno(e) {
    e.y += e.vel ?? 0.9;
    e.x = e.x0 + Math.sin(e.t * 0.05 + (e.fase ?? 0)) * (e.amp ?? 28);
  },
  // desce até uma altura, hesita e mergulha na direção da nave
  mergulho(e) {
    if (e.etapa === 0) {
      e.y += (e.yAlvo - e.y) * 0.05;
      if (e.t > 70) {
        const ang = anguloAteNave(e.x, e.y);
        e.vx = Math.cos(ang) * 3.2;
        e.vy = Math.sin(ang) * 3.2;
        e.etapa = 1;
      }
    } else {
      e.x += e.vx;
      e.y += e.vy;
    }
  },
  // desce, fica parado atirando por um tempo e depois vai embora
  parar(e) {
    if (e.etapa === 0) {
      e.y += (e.yAlvo - e.y) * 0.04;
      if (e.t > (e.espera ?? 240)) e.etapa = 1;
    } else {
      e.y += 1.2;
    }
  },
  reto(e) {
    e.y += e.vel ?? 1;
    e.x += e.vx ?? 0;
  },
  horizontal(e) {
    e.x += e.vx;
    e.y += 0.15;
  },
};

// ---------- Tipos de inimigo ----------
const TIPOS_INIMIGO = {
  // Tribunal --------------------------------------------------
  processo: {
    hp: 2, pontos: 100, mover: 'seno', intervalo: 160,
    atirar(e) { balaMirada(e.x, e.y + 6, 1.5 * dif(), '#ff4a8a'); },
    paleta: { a: '#2a1a08', p: '#e8d8a8', l: '#8a8a8a', r: '#c03030', f: '#c89a50' },
    metade: [
      '........',
      '.aaaaaaa',
      '.apppppp',
      '.aplllll',
      '.apppppp',
      '.aplllll',
      '.apppppp',
      '.apppprr',
      '.affffrr',
      '.affffff',
      '.affffff',
      '.aaaaaaa',
    ],
  },
  martelo: {
    hp: 3, pontos: 150, mover: 'mergulho', gira: true,
    paleta: { a: '#1a0a04', m: '#8a4a1a', l: '#c8783a', g: '#f0c040' },
    metade: [
      'aaaaaaaa',
      'amllgmmm',
      'amllgmmm',
      'aaaaaaaa',
      '......am',
      '......al',
      '......am',
      '......al',
      '......am',
      '......al',
      '.....aga',
      '.....aaa',
    ],
  },
  carimbo: {
    hp: 4, pontos: 200, mover: 'parar', intervalo: 75,
    atirar(e) { if (e.etapa === 0) leque(e.x, e.y + 8, 3, 0.3, 1.6 * dif(), '#e02a3a'); },
    paleta: { a: '#100010', k: '#3a2a5a', w: '#7a6ab8', b: '#5a4a98', r: '#d02a3a' },
    metade: [
      '.....aaa',
      '....akkk',
      '....akkk',
      '.....akk',
      '......ak',
      '......ak',
      '..aaaaaa',
      '.awwwwww',
      '.abbbbbb',
      '.abbbbbb',
      '.aaaaaaa',
      '.arrrrrr',
      '..aaaaaa',
    ],
  },
  balanca: {
    hp: 18, pontos: 500, mover: 'parar', intervalo: 55, explosao: 2,
    atirar(e) {
      if (e.etapa !== 0) return;
      e.alterna = !e.alterna;
      if (e.alterna) anel(e.x, e.y, 10, 1.2 * dif(), '#f0c040', e.t * 0.1);
      else leque(e.x, e.y + 6, 5, 0.22, 1.6 * dif(), '#f0c040');
    },
    paleta: { a: '#100800', g: '#f0c040', d: '#a87a20', w: '#fff0a0' },
    metade: [
      '.......a',
      '......ag',
      '......aw',
      'aaaaaaag',
      'adggggwg',
      'aaaaaaag',
      '.a.a..ag',
      '.a.a..ag',
      'a...a.ag',
      'aaaaa.ag',
      'agwga.ag',
      '.aaa..ag',
      '.....aag',
      '....aggg',
      '...adddd',
      '...aaaaa',
    ],
  },

  // Obras e rodovias ------------------------------------------
  cone: {
    hp: 1, pontos: 50, mover: 'reto',
    paleta: { a: '#2a0a00', o: '#ff7a10', w: '#ffffff', d: '#c04a00' },
    metade: [
      '.......a',
      '......ao',
      '......ao',
      '.....aoo',
      '.....aww',
      '.....aoo',
      '....aooo',
      '....awww',
      '....aooo',
      '...aoooo',
      '.aaaaaaa',
      '.adddddd',
      '.aaaaaaa',
    ],
  },
  betoneira: {
    hp: 8, pontos: 300, mover: 'reto', intervalo: 110, explosao: 2,
    atirar(e) { balaMirada(e.x, e.y + 8, 1.3 * dif(), '#b8b0a0'); },
    paleta: {
      a: '#101010', g: '#9aa0a8', s: '#d0d6dc', t: '#202020', y: '#f0b020', c: '#5ac0ff',
    },
    metade: [
      '...aaaaa',
      '..agsgsg',
      '.tasgsgs',
      '.tagsgsg',
      '..asgsgs',
      '..agsgsg',
      '.tasgsgs',
      '.taaaaaa',
      '..ayyyyy',
      '..ayyyyy',
      '.tayyyyy',
      '.taccccc',
      '..accccc',
      '..ayyyyy',
      '...aaaaa',
    ],
  },
  rolo: {
    hp: 16, pontos: 600, mover: 'reto', intervalo: 90, explosao: 2,
    atirar(e) { leque(e.x, e.y + 8, 3, 0.35, 1.4 * dif(), '#f0c020', Math.PI / 2); },
    paleta: {
      a: '#101010', y: '#f0c020', k: '#3a3a3a', c: '#5ac0ff', t: '#202020',
      g: '#8a8a8a', s: '#c8c8c8',
    },
    metade: [
      '..aaaaaa',
      '..ayyyyy',
      '.tayyyyy',
      '.tayykkk',
      '..ayykcc',
      '..ayykcc',
      '.tayyyyy',
      '.tayyyyy',
      '..aaaaaa',
      '...ak..k',
      'aaaaaaaa',
      'agsgsgsg',
      'asgsgsgs',
      'agsgsgsg',
      'aaaaaaaa',
    ],
  },
  barreira: {
    hp: 5, pontos: 250, mover: 'horizontal', intervalo: 100,
    atirar(e) { bala(e.x, e.y + 4, Math.PI / 2, 1.5 * dif(), '#ff7a10'); },
    paleta: { a: '#200800', o: '#ff7a10', w: '#ffffff', k: '#3a3a3a' },
    metade: [
      'aaaaaaaa',
      'aoowwoow',
      'aowwooww',
      'awwoowwo',
      'aaaaaaaa',
      '..ak....',
      '..ak....',
      '.aaka...',
    ],
  },
};

for (const d of Object.values(TIPOS_INIMIGO)) {
  d.sprite = criarSprite(d.metade, d.paleta);
  d.branco = silhueta(d.sprite);
}

// ---------- Inimigos em jogo ----------
const inimigos = [];

function criarInimigo(tipo, x, y, extra = {}) {
  const d = TIPOS_INIMIGO[tipo];
  const e = {
    d, x, y,
    hp: d.hp * (1 + (jogo.ciclo - 1) * 0.06),
    t: 0, flash: 0, etapa: 0,
    recarga: d.intervalo ? d.intervalo * aleatorio(0.4, 1) : Infinity,
    ...extra,
  };
  e.x0 ??= x;
  inimigos.push(e);
  return e;
}

function ferirInimigo(e, dano) {
  if (e.hp <= 0) return;
  e.hp -= dano;
  e.flash = 3;
  if (e.hp <= 0) {
    explodir(e.x, e.y, e.d.explosao ?? 1);
    tocarSom('explosao');
    placar += e.d.pontos;
  } else {
    tocarSom('acerto');
  }
}

function atualizarInimigos() {
  for (let i = inimigos.length - 1; i >= 0; i--) {
    const e = inimigos[i];
    e.t++;
    if (e.flash > 0) e.flash--;
    MOVIMENTOS[e.d.mover](e);

    // só atira dentro da tela e longe da base, para ser justo com o jogador
    if (e.d.atirar && --e.recarga <= 0) {
      e.recarga = e.d.intervalo / dif();
      if (e.y > 4 && e.y < ALTURA * 0.65 && nave.morta === 0) e.d.atirar(e);
    }

    const saiu = e.t > 30 && (e.y > ALTURA + 24 || e.y < -80 || e.x < -40 || e.x > LARGURA + 40);
    if (e.hp <= 0 || saiu) inimigos.splice(i, 1);
  }
}

function desenharInimigos() {
  for (const e of inimigos) {
    const img = e.flash > 0 ? e.d.branco : e.d.sprite;
    const w = img.width;
    const h = img.height;
    if (e.d.gira && e.etapa === 1) {
      // o martelo gira em passos de 90° enquanto mergulha
      ctx.save();
      ctx.translate(Math.round(e.x), Math.round(e.y));
      ctx.rotate((Math.floor(e.t / 4) % 4) * (Math.PI / 2));
      ctx.drawImage(img, -w / 2, -h / 2);
      ctx.restore();
    } else {
      ctx.drawImage(img, Math.round(e.x - w / 2), Math.round(e.y - h / 2));
    }
  }
}

// ---------- Ondas (formações) ----------
const FAIXAS = [91, 128, 165]; // centro das faixas da rodovia

const ONDAS = {
  tribunal: [
    // fila de processos ondulando
    () => {
      const x0 = aleatorio(60, 196);
      for (let i = 0; i < 5; i++) criarInimigo('processo', x0, -12 - i * 18, { x0, fase: i * 0.6, amp: 30 });
    },
    // martelos que mergulham na nave
    () => {
      for (let i = 0; i < 3; i++) criarInimigo('martelo', aleatorio(30, 226), -12 - i * 30, { yAlvo: aleatorio(36, 80) });
    },
    // dupla de carimbos
    () => {
      criarInimigo('carimbo', 70, -12, { yAlvo: 54, espera: 260 });
      criarInimigo('carimbo', 186, -12, { yAlvo: 54, espera: 260 });
    },
    // balança da justiça: só a partir do ciclo 3
    () => jogo.ciclo >= 3 && criarInimigo('balanca', aleatorio(80, 176), -16, { yAlvo: 50, espera: 360 }),
  ],
  obras: [
    // coluna de cones descendo numa faixa
    () => {
      const x = escolher(FAIXAS);
      for (let i = 0; i < 6; i++) criarInimigo('cone', x, -10 - i * 16, { vel: 2.2 });
    },
    // cones em formação de V
    () => {
      for (let i = -2; i <= 2; i++) criarInimigo('cone', 128 + i * 18, -10 - Math.abs(i) * 14, { vel: 1.9 });
    },
    // betoneiras nas faixas laterais
    () => {
      criarInimigo('betoneira', FAIXAS[0], -16, { vel: 0.9 });
      criarInimigo('betoneira', FAIXAS[2], -56, { vel: 0.9 });
    },
    // rolo compactador: só a partir do ciclo 4
    () => jogo.ciclo >= 4 && criarInimigo('rolo', FAIXAS[1], -16, { vel: 0.5 }),
    // barreira de obra atravessando a tela
    () => {
      const daEsquerda = Math.random() < 0.5;
      criarInimigo('barreira', daEsquerda ? -20 : LARGURA + 20, aleatorio(40, 84), { vx: daEsquerda ? 0.9 : -0.9 });
    },
  ],
};

function lancarOnda() {
  // nos ciclos de rodovia predominam as obras; nos outros, os servos do Tribunal
  const tema = Math.random() < (jogo.estrada ? 0.7 : 0.3) ? 'obras' : 'tribunal';
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    if (escolher(ONDAS[tema])() !== false) return;
  }
}
