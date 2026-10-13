// =============================================================
//  Nave do jogador: movimento, tiros, dano e desenho
// =============================================================

const nave = {
  tipo: null,
  x: LARGURA / 2,
  y: ALTURA - 30,
  largura: 16,
  altura: 16,
  recarga: 0,
  inclinacao: 0, // -1 esquerda, 0 reto, 1 direita (efeito visual)
  flash: 0,
  alternar: false, // usado pelos tiros que saem de lados alternados
  invencivel: 0, // quadros piscando após renascer
  morta: 0, // quadros até renascer (0 = viva)
  // melhorias vindas dos buffs
  arma: 1, // nível 1 a 3
  escudo: 0, // quantos tiros o escudo ainda aguenta
  reajuste: 1, // multiplicador de dano permanente (dissídio)
  recargaApoio: 0,
  pegouDecimo1: false,
};

function reiniciarMelhorias() {
  nave.arma = 1;
  nave.escudo = 0;
  nave.reajuste = 1;
  nave.pegouDecimo1 = false;
}

const tiros = [];

function posicionarNave() {
  nave.x = LARGURA / 2;
  nave.y = ALTURA - 30;
  nave.recarga = 0;
  nave.inclinacao = 0;
  nave.morta = 0;
  nave.invencivel = 120;
}

function atualizarNave() {
  if (nave.morta > 0) {
    if (--nave.morta === 0) {
      if (vidas > 0) posicionarNave();
      else {
        nave.morta = 1; // continua fora de cena até decidir sobre a hora extra
        fimDeJogo();
      }
    }
    return;
  }
  if (nave.invencivel > 0) nave.invencivel--;

  let dx = 0;
  let dy = 0;
  if (teclas.has('esquerda')) dx -= 1;
  if (teclas.has('direita')) dx += 1;
  if (teclas.has('cima')) dy -= 1;
  if (teclas.has('baixo')) dy += 1;

  // normaliza a diagonal para não andar mais rápido
  if (dx && dy) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  // no celular, o manete analógico controla também a intensidade
  if (analogico.ativo) {
    dx = analogico.x;
    dy = analogico.y;
  }

  const vel = teclas.has('lento') ? nave.tipo.velocidade / 2 : nave.tipo.velocidade;
  nave.x += dx * vel;
  nave.y += dy * vel;

  const meiaL = nave.largura / 2;
  const meiaA = nave.altura / 2;
  nave.x = Math.min(LARGURA - meiaL, Math.max(meiaL, nave.x));
  nave.y = Math.min(ALTURA - meiaA - 4, Math.max(meiaA + 22, nave.y));

  // inclinação suave para dar sensação de peso
  nave.inclinacao += (dx - nave.inclinacao) * 0.2;

  if (nave.recarga > 0) nave.recarga--;
  if (nave.recargaApoio > 0) nave.recargaApoio--;
  if (teclas.has('tiro')) {
    if (nave.recarga === 0) {
      disparar();
      nave.recarga = nave.tipo.recarga;
    }
    // tiros de apoio da arma melhorada, com ritmo próprio
    if (nave.arma >= 2 && nave.recargaApoio === 0) {
      dispararApoio();
      nave.recargaApoio = 8;
    }
  }
}

function atingirNave() {
  if (nave.invencivel > 0 || nave.morta > 0) return;

  // o escudo absorve o golpe
  if (nave.escudo > 0) {
    nave.escudo--;
    nave.invencivel = 45;
    explodir(nave.x, nave.y, 0, ['#4ab0ff', '#c8f0ff', '#ffffff']);
    tocarSom('escudo');
    if (nave.escudo === 0) mostrarMensagem('ESCUDO QUEBROU!', '#8fd8ff');
    return;
  }

  explodir(nave.x, nave.y, 3, ['#ffffff', ...Object.values(nave.tipo.paleta).slice(1)]);
  tocarSom('morte');
  vidas--;
  nave.morta = 90;
  nave.arma = Math.max(1, nave.arma - 1); // morrer custa um nível de arma
  balas.length = 0;
}

// ---------- Tiros: cada estado tem o seu ----------
// dano: quanto tira de vida; perfura: atravessa inimigos menores
const DADOS_TIRO = {
  leque: { dano: 1, perfura: false },
  laser: { dano: 0.7, perfura: false },
  boleadeira: { dano: 5, perfura: true },
  pinhao: { dano: 1.4, perfura: false },
  agulha: { dano: 2.2, perfura: true },
  apoio: { dano: 0.6, perfura: false }, // tiros extras da arma nível 2 e 3
};

// cada nível de arma acima do 1 soma 20% de dano; o dissídio multiplica tudo
const multiplicadorDano = () => (1 + (nave.arma - 1) * 0.2) * nave.reajuste;

function novoTiro(tipo, x, y, vx, vy) {
  const d = DADOS_TIRO[tipo];
  tiros.push({
    tipo, x, y, vx, vy, t: 0,
    dano: d.dano * multiplicadorDano(),
    acertou: d.perfura ? new Set() : null,
  });
}

function dispararApoio() {
  const { x, y } = nave;
  novoTiro('apoio', x - 7, y - 2, 0, -7);
  novoTiro('apoio', x + 7, y - 2, 0, -7);
  if (nave.arma >= 3) {
    novoTiro('apoio', x - 7, y - 2, -1.4, -6.8);
    novoTiro('apoio', x + 7, y - 2, 1.4, -6.8);
  }
}

const TIROS = {
  // Ceará: três raios de sol em leque
  leque(x, y) {
    for (const ang of [-0.25, 0, 0.25]) novoTiro('leque', x, y, Math.sin(ang) * 5, -Math.cos(ang) * 5);
  },
  // Santa Catarina: dois feixes finos e muito rápidos, como os cabos da ponte
  laser(x, y) {
    novoTiro('laser', x - 5, y + 4, 0, -9);
    novoTiro('laser', x + 4, y + 4, 0, -9);
  },
  // Rio Grande do Sul: boleadeira girando enquanto sobe
  boleadeira(x, y) {
    novoTiro('boleadeira', x, y, 0, -3.2);
  },
  // Paraná: pinhões saindo alternadamente de cada lado, com leve dispersão
  pinhao(x, y) {
    nave.alternar = !nave.alternar;
    const lado = nave.alternar ? -1 : 1;
    novoTiro('pinhao', x + lado * 5, y + 2, lado * 0.3, -6);
  },
  // Mato Grosso do Sul: uma agulha longa e veloz, como o bico do tuiuiú
  agulha(x, y) {
    novoTiro('agulha', x, y - 4, 0, -10);
  },
};

function disparar() {
  TIROS[nave.tipo.tiro](nave.x, nave.y - 8);
  nave.flash = 3;
  tocarSom('tiro');
}

// retângulo de colisão de cada tiro: [x, y, largura, altura]
function caixaTiro(t) {
  switch (t.tipo) {
    case 'leque': return [t.x - 2, t.y - 2, 4, 6];
    case 'laser': return [t.x, t.y, 1, 12];
    case 'boleadeira': return [t.x - 8, t.y - 8, 16, 16];
    case 'pinhao': return [t.x - 1, t.y - 1, 3, 7];
    case 'agulha': return [t.x, t.y, 1, 14];
    case 'apoio': return [t.x - 1, t.y, 2, 5];
  }
}

function atualizarTiros() {
  for (let i = tiros.length - 1; i >= 0; i--) {
    const t = tiros[i];
    t.x += t.vx;
    t.y += t.vy;
    t.t++;
    if (t.y < -16 || t.x < -8 || t.x > LARGURA + 8) tiros.splice(i, 1);
  }
}

function desenharTiros() {
  for (const t of tiros) {
    const x = Math.round(t.x);
    const y = Math.round(t.y);
    switch (t.tipo) {
      case 'leque':
        ctx.fillStyle = '#ff8a20';
        ctx.fillRect(x - 2, y - 1, 4, 4);
        ctx.fillStyle = '#ffe060';
        ctx.fillRect(x - 1, y - 2, 2, 6);
        ctx.fillRect(x - 2, y, 4, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 1, y, 2, 2);
        break;
      case 'laser':
        ctx.fillStyle = '#8fd8ff';
        ctx.fillRect(x, y, 1, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 6);
        break;
      case 'boleadeira': {
        // duas bolas presas por uma corda, girando
        const ang = t.t * 0.35;
        const ox = Math.round(Math.cos(ang) * 6);
        const oy = Math.round(Math.sin(ang) * 6);
        ctx.strokeStyle = '#c8a070';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - ox + 0.5, y - oy + 0.5);
        ctx.lineTo(x + ox + 0.5, y + oy + 0.5);
        ctx.stroke();
        for (const s of [-1, 1]) {
          const bx = x + ox * s;
          const by = y + oy * s;
          ctx.fillStyle = '#5a3a1a';
          ctx.fillRect(bx - 2, by - 1, 5, 3);
          ctx.fillRect(bx - 1, by - 2, 3, 5);
          ctx.fillStyle = '#c8d0dc';
          ctx.fillRect(bx - 1, by - 1, 2, 2);
        }
        break;
      }
      case 'pinhao':
        ctx.fillStyle = '#7a3a1a';
        ctx.fillRect(x - 1, y, 3, 5);
        ctx.fillRect(x, y - 1, 1, 7);
        ctx.fillStyle = '#e0a060';
        ctx.fillRect(x, y + 1, 1, 2);
        break;
      case 'agulha':
        ctx.fillStyle = '#e02a2a';
        ctx.fillRect(x, y + 10, 1, 4);
        ctx.fillStyle = '#d8c8a0';
        ctx.fillRect(x, y, 1, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 3);
        break;
      case 'apoio':
        ctx.fillStyle = '#4ab0ff';
        ctx.fillRect(x - 1, y, 2, 5);
        ctx.fillStyle = '#e8f8ff';
        ctx.fillRect(x - 1, y, 2, 2);
        break;
    }
  }
}

// Desenha uma nave com as chamas dos motores. Usada no jogo e no menu.
function desenharSpriteNave(tipo, cx, cy, escala = 1, inclinacao = 0, lento = false) {
  const tam = 16 * escala;
  const x = Math.round(cx - tam / 2);
  const y = Math.round(cy - tam / 2);

  // chamas dos motores, piscando
  const tamanhoChama = 2 + ((quadro >> 1) % 3);
  for (const ox of tipo.motores) {
    ctx.fillStyle = lento ? '#4ab0ff' : '#ff6a00';
    ctx.fillRect(x + ox * escala, y + 15 * escala, escala, (tamanhoChama + 1) * escala);
    ctx.fillStyle = lento ? '#c8f0ff' : '#ffe060';
    ctx.fillRect(x + ox * escala, y + 15 * escala, escala, (tamanhoChama - 1) * escala);
  }

  const metade = 8;
  if (Math.abs(inclinacao) > 0.5) {
    // inclinação: comprime 2px a asa do lado da curva
    const e = escala;
    if (inclinacao < 0) {
      ctx.drawImage(tipo.sprite, 0, 0, metade, 16, x + 2 * e, y, (metade - 2) * e, tam);
      ctx.drawImage(tipo.sprite, metade, 0, metade, 16, x + metade * e, y, metade * e, tam);
    } else {
      ctx.drawImage(tipo.sprite, 0, 0, metade, 16, x, y, metade * e, tam);
      ctx.drawImage(tipo.sprite, metade, 0, metade, 16, x + metade * e, y, (metade - 2) * e, tam);
    }
  } else {
    ctx.drawImage(tipo.sprite, x, y, tam, tam);
  }
}

function desenharNave() {
  if (nave.morta > 0) return;
  if (nave.invencivel > 0 && (quadro >> 2) % 2) return; // pisca enquanto invencível

  const lento = teclas.has('lento');
  desenharSpriteNave(nave.tipo, nave.x, nave.y, 1, nave.inclinacao, lento);

  // clarão na ponta da nave ao disparar
  if (nave.flash > 0) {
    ctx.fillStyle = '#fffbe0';
    ctx.fillRect(Math.round(nave.x) - 2, Math.round(nave.y) - 10, 4, 2);
    nave.flash--;
  }

  // no modo lento, mostra o ponto de colisão (hitbox) como nos STGs clássicos
  if (lento) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(nave.x) - 1, Math.round(nave.y), 2, 2);
  }

  desenharEscudo();
}

// bolha azul com uma bolinha girando para cada tiro que o escudo ainda aguenta
function desenharEscudo() {
  if (nave.escudo <= 0) return;
  const cx = Math.round(nave.x);
  const cy = Math.round(nave.y) + 1;
  ctx.globalAlpha = 0.35 + Math.sin(quadro / 5) * 0.15;
  ctx.strokeStyle = '#4ab0ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx + 0.5, cy + 0.5, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < nave.escudo; i++) {
    const ang = quadro * 0.07 + (i / nave.escudo) * Math.PI * 2;
    ctx.fillStyle = i % 2 ? '#c8f0ff' : '#4ab0ff';
    ctx.fillRect(Math.round(cx + Math.cos(ang) * 12) - 1, Math.round(cy + Math.sin(ang) * 12) - 1, 2, 2);
  }
}
