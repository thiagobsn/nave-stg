// =============================================================
//  Núcleo: tela, entrada, texto, sprites e efeitos compartilhados
//  Resolução nativa: 256x224 (igual ao SNES), ampliada por inteiro
// =============================================================

const LARGURA = 256;
const ALTURA = 224;
const PASSO = 1000 / 60; // lógica fixa a 60 quadros por segundo

const tela = document.getElementById('tela');
const ctx = tela.getContext('2d');
ctx.imageSmoothingEnabled = false;

let quadro = 0;

// ---------- Aparelho com toque (celular/tablet) ----------
const ehToque = () => document.body.classList.contains('toque');

function ativarModoToque() {
  if (ehToque()) return;
  document.body.classList.add('toque');
  ajustarEscala();
}

// ---------- Escala da tela ----------
// No computador a escala é inteira, para os pixels ficarem nítidos.
// No celular aproveita todo o espaço, deixando lugar para os controles quando em pé.
function ajustarEscala() {
  const emPe = innerHeight > innerWidth;
  const alturaLivre = ehToque() && emPe ? innerHeight - Math.max(230, innerHeight * 0.36) : innerHeight;
  let escala = Math.min(innerWidth / LARGURA, alturaLivre / ALTURA);
  if (!ehToque()) escala = Math.max(1, Math.floor(escala));
  tela.style.width = Math.floor(LARGURA * escala) + 'px';
  tela.style.height = Math.floor(ALTURA * escala) + 'px';
  // o CSS usa a borda de baixo da tela para centralizar os controles no espaço livre
  document.documentElement.style.setProperty('--fim-tela', Math.round(tela.getBoundingClientRect().bottom) + 'px');
}
addEventListener('resize', ajustarEscala);
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('toque');
ajustarEscala();

// ---------- Entrada (teclado) ----------
const teclas = new Set();
const MAPA_TECLAS = {
  ArrowLeft: 'esquerda', KeyA: 'esquerda',
  ArrowRight: 'direita', KeyD: 'direita',
  ArrowUp: 'cima', KeyW: 'cima',
  ArrowDown: 'baixo', KeyS: 'baixo',
  Space: 'tiro', KeyZ: 'tiro', KeyJ: 'tiro',
  ShiftLeft: 'lento', ShiftRight: 'lento', KeyX: 'lento',
  Enter: 'start', KeyP: 'pausa', Escape: 'voltar', KeyM: 'som',
};
const acoesPressionadas = new Set(); // ações disparadas uma vez por toque

// manete analógico da tela de toque: x e y de -1 a 1
const analogico = { x: 0, y: 0, ativo: false };

addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return; // deixa digitar o nome em paz
  const acao = MAPA_TECLAS[e.code];
  if (!acao) return;
  e.preventDefault();
  if (!teclas.has(acao)) acoesPressionadas.add(acao);
  teclas.add(acao);
});
addEventListener('keyup', (e) => {
  const acao = MAPA_TECLAS[e.code];
  if (acao) teclas.delete(acao);
});
addEventListener('blur', () => teclas.clear());

// ---------- Utilidades ----------
const aleatorio = (min, max) => min + Math.random() * (max - min);
const escolher = (lista) => lista[Math.floor(Math.random() * lista.length)];

// ---------- Sprites em pixel art ----------
// Cada sprite é descrito pela metade esquerda e espelhado,
// garantindo simetria perfeita. '.' = transparente.
function criarSprite(metade, paleta) {
  const linhas = metade.map((l) => l + [...l].reverse().join(''));
  const c = document.createElement('canvas');
  c.width = linhas[0].length;
  c.height = linhas.length;
  const g = c.getContext('2d');
  linhas.forEach((linha, y) => {
    [...linha].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = paleta[ch];
      g.fillRect(x, y, 1, 1);
    });
  });
  return c;
}

// Cópia do sprite pintada de uma cor só (usada no "piscar" ao levar dano)
function silhueta(sprite, cor = '#ffffff') {
  const c = document.createElement('canvas');
  c.width = sprite.width;
  c.height = sprite.height;
  const g = c.getContext('2d');
  g.drawImage(sprite, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = cor;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

// ---------- Texto ----------
const FONTE = '"Press Start 2P", monospace';

// A fonte pixelada não tem maiúsculas acentuadas, então os acentos
// são desenhados à mão (coordenadas na grade 8x8 de cada letra).
const ACENTOS = {
  '́': [[4, -2], [3, -1]], // agudo
  '̀': [[3, -2], [4, -1]], // grave
  '̂': [[2, -1], [3, -2], [4, -2], [5, -1]], // circunflexo
  '̃': [[2, -1], [3, -2], [4, -1], [5, -2]], // til
};

function texto(str, x, y, cor = '#ffffff', tamanho = 8, alinhamento = 'left') {
  const letras = [];
  const marcas = [];
  for (const ch of str.normalize('NFD')) {
    if (ACENTOS[ch]) marcas.push([letras.length - 1, ACENTOS[ch]]);
    else if (/[̀-ͯ]/.test(ch)) letras[letras.length - 1] += ch; // ex.: cedilha
    else letras.push(ch);
  }
  const base = letras.join('').normalize('NFC');

  // fonte monoespaçada: cada letra ocupa exatamente 'tamanho' pixels
  let x0 = x;
  if (alinhamento === 'center') x0 = x - (letras.length * tamanho) / 2;
  if (alinhamento === 'right') x0 = x - letras.length * tamanho;
  const u = tamanho / 8;

  ctx.font = `${tamanho}px ${FONTE}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const [dx, c] of [[1, '#000000'], [0, cor]]) {
    ctx.fillStyle = c;
    ctx.fillText(base, x0 + dx, y + dx);
    for (const [i, pontos] of marcas) {
      for (const [px, py] of pontos) {
        ctx.fillRect(x0 + dx + (i * 8 + px) * u, y + dx + py * u, u, u);
      }
    }
  }
}

// ---------- Campo de estrelas em camadas (parallax) ----------
const CAMADAS = [
  { qtd: 50, vel: 0.25, cor: '#3a3a6a' },
  { qtd: 30, vel: 0.6, cor: '#7a7ab8' },
  { qtd: 14, vel: 1.4, cor: '#e8e8ff' },
];
const estrelas = [];
for (const camada of CAMADAS) {
  for (let i = 0; i < camada.qtd; i++) {
    estrelas.push({ x: Math.random() * LARGURA, y: Math.random() * ALTURA, camada });
  }
}

function atualizarEstrelas() {
  for (const s of estrelas) {
    s.y += s.camada.vel;
    if (s.y >= ALTURA) {
      s.y -= ALTURA;
      s.x = Math.random() * LARGURA;
    }
  }
}

function desenharEstrelas() {
  for (const s of estrelas) {
    ctx.fillStyle = s.camada.cor;
    // a camada mais rápida vira um risco, dando sensação de velocidade
    const comprimento = s.camada.vel > 1 ? 2 : 1;
    ctx.fillRect(s.x | 0, s.y | 0, 1, comprimento);
  }
}

// ---------- Explosões e faíscas ----------
const particulas = [];
const ondasChoque = [];
const CORES_EXPLOSAO = ['#fff4a0', '#ffb030', '#ff5a20', '#8a2a10'];

function explodir(x, y, tamanho = 1, cores = CORES_EXPLOSAO) {
  const qtd = 6 + tamanho * 8;
  for (let i = 0; i < qtd; i++) {
    const ang = Math.random() * Math.PI * 2;
    const vel = aleatorio(0.3, 1.5) * (0.8 + tamanho * 0.35);
    const vida = aleatorio(16, 32) * (0.8 + tamanho * 0.2);
    particulas.push({
      x, y,
      vx: Math.cos(ang) * vel,
      vy: Math.sin(ang) * vel,
      vida, max: vida,
      cor: escolher(cores),
      tam: Math.random() < 0.35 ? 2 : 1,
    });
  }
  if (tamanho >= 1) ondasChoque.push({ x, y, r: 2, max: 6 + tamanho * 5 });
}

function faisca(x, y) {
  for (let i = 0; i < 3; i++) {
    particulas.push({
      x, y, vx: aleatorio(-1, 1), vy: aleatorio(-1.5, 0.2),
      vida: 8, max: 8, cor: '#fff4a0', tam: 1,
    });
  }
}

// fumaça/fogo: partículas que mantêm a cor até sumir
function rastro(x, y, cor, vy = 0.6) {
  particulas.push({
    x: x + aleatorio(-2, 2), y, vx: aleatorio(-0.3, 0.3), vy,
    vida: 20, max: 20, cor, tam: 2, fixa: true,
  });
}

function atualizarParticulas() {
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    if (--p.vida <= 0) particulas.splice(i, 1);
  }
  for (let i = ondasChoque.length - 1; i >= 0; i--) {
    const o = ondasChoque[i];
    o.r += 1;
    if (o.r > o.max) ondasChoque.splice(i, 1);
  }
}

function desenharParticulas() {
  ctx.lineWidth = 1;
  for (const o of ondasChoque) {
    ctx.strokeStyle = o.r < o.max / 2 ? '#fff4a0' : '#ff8a30';
    ctx.beginPath();
    ctx.arc(Math.round(o.x) + 0.5, Math.round(o.y) + 0.5, o.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const p of particulas) {
    // a cor escurece conforme a partícula "esfria"
    const idx = Math.min(3, Math.floor((1 - p.vida / p.max) * 4));
    ctx.fillStyle = p.fixa || p.vida > p.max * 0.6 ? p.cor : CORES_EXPLOSAO[Math.max(idx, 2)];
    ctx.fillRect(Math.round(p.x), Math.round(p.y), p.tam, p.tam);
  }
}

// ---------- Balas inimigas ----------
const balas = [];

function bala(x, y, ang, vel, cor = '#ff4a8a') {
  balas.push({ x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel, cor });
}

function anguloAteNave(x, y) {
  return Math.atan2(nave.y - y, nave.x - x);
}

function balaMirada(x, y, vel, cor) {
  bala(x, y, anguloAteNave(x, y), vel, cor);
}

// n balas abertas em leque, centradas no ângulo dado (por padrão, mira na nave)
function leque(x, y, n, abertura, vel, cor, ang = anguloAteNave(x, y)) {
  for (let i = 0; i < n; i++) bala(x, y, ang + (i - (n - 1) / 2) * abertura, vel, cor);
}

function anel(x, y, n, vel, cor, deslocamento = 0) {
  for (let i = 0; i < n; i++) bala(x, y, deslocamento + (i / n) * Math.PI * 2, vel, cor);
}

function atualizarBalas() {
  for (let i = balas.length - 1; i >= 0; i--) {
    const b = balas[i];
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < -8 || b.x > LARGURA + 8 || b.y < -8 || b.y > ALTURA + 8) balas.splice(i, 1);
  }
}

function desenharBalas() {
  for (const b of balas) {
    const x = Math.round(b.x);
    const y = Math.round(b.y);
    ctx.fillStyle = b.cor;
    ctx.fillRect(x - 2, y - 1, 4, 2);
    ctx.fillRect(x - 1, y - 2, 2, 4);
    ctx.fillStyle = (quadro >> 2) % 2 ? '#ffffff' : '#ffe8f0';
    ctx.fillRect(x - 1, y - 1, 2, 2);
  }
}
