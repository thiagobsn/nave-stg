// =============================================================
//  Buffs (itens de melhoria)
//  - comuns, em todo ciclo: ARMA (sobe o nível do tiro) e ESCUDO (aguenta 3 tiros)
//  - especiais: PLR (ciclo 3), 1ª parcela do décimo (ciclo 6),
//    dissídio (ciclo 8) e 2ª parcela do décimo (ciclo 12)
// =============================================================

const VIDAS_INICIAIS = 3;
const VIDAS_MAX = 5;
const ARMA_MAX = 3;
const ESCUDO_POR_ITEM = 3;
const ESCUDO_MAX = 6;

const TIPOS_BUFF = {
  arma: {
    letra: 'A', cor: '#ff6a20',
    aplicar() {
      nave.arma = Math.min(ARMA_MAX, nave.arma + 1);
      mostrarMensagem(nave.arma === ARMA_MAX ? 'ARMA NO MÁXIMO!' : `ARMA NÍVEL ${nave.arma}`, '#ff8a40');
    },
  },
  escudo: {
    letra: 'E', cor: '#2a8aff',
    aplicar() {
      nave.escudo = Math.min(ESCUDO_MAX, nave.escudo + ESCUDO_POR_ITEM);
      mostrarMensagem(`ESCUDO: ${nave.escudo} TIROS`, '#8fd8ff');
    },
  },

  // ---------- especiais ----------
  plr: {
    especial: true, rotulo: 'PLR',
    aplicar() {
      vidas = Math.max(vidas, VIDAS_INICIAIS);
      nave.arma = ARMA_MAX;
      nave.escudo = ESCUDO_MAX;
      placar += 10000;
      mostrarMensagem('PLR! TODAS AS VIDAS DE VOLTA', '#ffd030');
    },
  },
  decimo1: {
    especial: true, rotulo: 'DÉCIMO 1/2',
    aplicar() {
      vidas = Math.min(VIDAS_MAX, vidas + 1);
      nave.escudo = Math.min(ESCUDO_MAX, nave.escudo + ESCUDO_POR_ITEM);
      nave.pegouDecimo1 = true;
      placar += 5000;
      mostrarMensagem('PRIMEIRA PARCELA DO DÉCIMO', '#ffd030');
    },
  },
  dissidio: {
    especial: true, rotulo: 'DISSÍDIO',
    aplicar() {
      nave.reajuste += 0.25; // permanente: não se perde ao morrer
      placar += 5000;
      mostrarMensagem(`DISSÍDIO: PODER +${Math.round((nave.reajuste - 1) * 100)}%`, '#ffd030');
    },
  },
  decimo2: {
    especial: true, rotulo: 'DÉCIMO 2/2',
    aplicar() {
      vidas = Math.min(VIDAS_MAX, vidas + 1);
      nave.arma = ARMA_MAX;
      nave.escudo = Math.min(ESCUDO_MAX, nave.escudo + ESCUDO_POR_ITEM);
      placar += 5000;
      if (nave.pegouDecimo1) {
        placar += 13000;
        mostrarMensagem('DÉCIMO COMPLETO! +13000', '#ffd030');
      } else {
        mostrarMensagem('SEGUNDA PARCELA DO DÉCIMO', '#ffd030');
      }
    },
  },
};

const buffs = [];

function soltarBuff(tipo, x = aleatorio(40, LARGURA - 40), y = -10) {
  const d = TIPOS_BUFF[tipo];
  buffs.push({
    tipo, d, x, y, x0: x, t: 0,
    // os especiais quicam pela tela até serem pegos; os comuns só descem
    vx: d.especial ? escolher([-0.7, 0.7]) : 0,
    vy: d.especial ? 0.6 : 0.45,
  });
}

function soltarBuffComum() {
  soltarBuff(Math.random() < 0.5 ? 'arma' : 'escudo');
}

function atualizarBuffs() {
  for (let i = buffs.length - 1; i >= 0; i--) {
    const b = buffs[i];
    b.t++;
    if (b.d.especial) {
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > 40) {
        if (b.x < 16 || b.x > LARGURA - 16) b.vx *= -1;
        if (b.y < 40 || b.y > ALTURA - 14) b.vy *= -1;
      }
    } else {
      b.y += b.vy;
      b.x = b.x0 + Math.sin(b.t / 25) * 10;
      if (b.y > ALTURA + 12) {
        buffs.splice(i, 1);
        continue;
      }
    }

    // coleta
    if (nave.morta === 0) {
      const alcance = b.d.especial ? 14 : 10;
      if (Math.abs(b.x - nave.x) < alcance && Math.abs(b.y - nave.y) < alcance) {
        b.d.aplicar();
        tocarSom(b.d.especial ? 'especial' : 'buff');
        placar += 500;
        explodir(b.x, b.y, 0, ['#ffffff', '#ffd030', b.d.cor ?? '#5ac85a']);
        buffs.splice(i, 1);
      }
    }
  }
}

function desenharBuffs() {
  for (const b of buffs) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    if (b.d.especial) desenharCedula(b, x, y);
    else desenharCapsula(b, x, y);
  }
}

// cápsula comum com a letra do buff
function desenharCapsula(b, x, y) {
  const piscar = (quadro >> 3) % 2;
  ctx.fillStyle = '#000000';
  ctx.fillRect(x - 8, y - 6, 16, 13);
  ctx.fillRect(x - 7, y - 7, 14, 15);
  ctx.fillStyle = piscar ? '#ffffff' : b.d.cor;
  ctx.fillRect(x - 7, y - 5, 14, 11);
  ctx.fillRect(x - 6, y - 6, 12, 13);
  ctx.fillStyle = piscar ? b.d.cor : '#ffffff';
  ctx.fillRect(x - 5, y - 4, 10, 9);
  ctx.font = `8px ${FONTE}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000000';
  ctx.fillText(b.d.letra, x - 3, y - 3);
}

// buff especial: uma cédula verde com o nome por cima
function desenharCedula(b, x, y) {
  // brilho pulsante em volta
  const raio = 13 + Math.round(Math.sin(quadro / 6) * 2);
  ctx.strokeStyle = (quadro >> 2) % 2 ? '#ffd030' : '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + 0.5, y + 0.5, raio, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#06200c';
  ctx.fillRect(x - 12, y - 7, 24, 14);
  ctx.fillStyle = '#1f8a3a';
  ctx.fillRect(x - 11, y - 6, 22, 12);
  ctx.fillStyle = '#5ac85a';
  ctx.fillRect(x - 9, y - 4, 18, 8);
  ctx.fillStyle = '#1f8a3a';
  ctx.fillRect(x - 4, y - 4, 8, 8);
  texto('$', x, y - 3, '#ffd030', 8, 'center');

  // nome do buff, preso dentro da tela
  const meia = (b.d.rotulo.length * 8) / 2;
  const lx = Math.min(LARGURA - meia - 2, Math.max(meia + 2, x));
  texto(b.d.rotulo, lx, y - 20, (quadro >> 3) % 2 ? '#ffd030' : '#ffffff', 8, 'center');
}
