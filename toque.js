// =============================================================
//  Controles de toque (celular/tablet)
//  - manete analógico à esquerda, botões A (tiro) e B (lento/voltar) à direita
//  - START e SOM no meio; tocar na tela do jogo também navega nos menus
// =============================================================

// qualquer toque real liga o modo toque (cobre aparelhos que não se anunciam como "coarse")
addEventListener('touchstart', ativarModoToque, { passive: true });

function pressionarAcao(acao) {
  if (!teclas.has(acao)) acoesPressionadas.add(acao);
  teclas.add(acao);
}

function soltarAcao(acao) {
  teclas.delete(acao);
}

// ---------- Botões ----------
// o B é "lento" durante o jogo e "voltar" nos menus
function acaoDoBotao(botao) {
  switch (botao) {
    case 'a': return 'tiro';
    case 'b': return estado === 'jogando' ? 'lento' : 'voltar';
    default: return botao; // 'start' e 'som'
  }
}

const acaoPorDedo = new Map(); // pointerId -> ação em andamento

// segura o dedo no elemento mesmo se ele escorregar para fora (falhar aqui não pode travar o controle)
function capturar(el, e) {
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    // ponteiro já liberado: segue sem captura
  }
}

document.querySelectorAll('[data-botao]').forEach((el) => {
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capturar(el, e);
    const acao = acaoDoBotao(el.dataset.botao);
    acaoPorDedo.set(e.pointerId, acao);
    pressionarAcao(acao);
    el.classList.add('ativo');
  });
  const soltar = (e) => {
    const acao = acaoPorDedo.get(e.pointerId);
    if (acao) soltarAcao(acao);
    acaoPorDedo.delete(e.pointerId);
    el.classList.remove('ativo');
  };
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
});

// ---------- Manete analógico ----------
const areaAnalogico = document.getElementById('area-analogico');
const baseAnalogico = document.getElementById('base-analogico');
const manete = document.getElementById('manete');
const RAIO_MANETE = 48;
const ZONA_MORTA = 0.18;
let dedoAnalogico = null;

// direções digitais derivadas do manete, para navegar nos menus
const DIRECOES = [
  ['esquerda', (x) => x < -0.5],
  ['direita', (x) => x > 0.5],
  ['cima', (_, y) => y < -0.5],
  ['baixo', (_, y) => y > 0.5],
];

function moverManete(e) {
  const r = baseAnalogico.getBoundingClientRect();
  let dx = (e.clientX - (r.left + r.width / 2)) / RAIO_MANETE;
  let dy = (e.clientY - (r.top + r.height / 2)) / RAIO_MANETE;
  const dist = Math.hypot(dx, dy);
  if (dist > 1) {
    dx /= dist;
    dy /= dist;
  }
  manete.style.transform = `translate(${dx * RAIO_MANETE}px, ${dy * RAIO_MANETE}px)`;

  const vivo = dist > ZONA_MORTA;
  analogico.ativo = true;
  analogico.x = vivo ? dx : 0;
  analogico.y = vivo ? dy : 0;
  for (const [acao, passou] of DIRECOES) {
    if (passou(dx, dy)) pressionarAcao(acao);
    else soltarAcao(acao);
  }
}

function soltarManete(e) {
  if (e.pointerId !== dedoAnalogico) return;
  dedoAnalogico = null;
  analogico.ativo = false;
  analogico.x = 0;
  analogico.y = 0;
  manete.style.transform = '';
  for (const [acao] of DIRECOES) soltarAcao(acao);
}

areaAnalogico.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (dedoAnalogico !== null) return;
  dedoAnalogico = e.pointerId;
  capturar(areaAnalogico, e);
  moverManete(e);
});
areaAnalogico.addEventListener('pointermove', (e) => {
  if (e.pointerId === dedoAnalogico) moverManete(e);
});
areaAnalogico.addEventListener('pointerup', soltarManete);
areaAnalogico.addEventListener('pointercancel', soltarManete);

// ---------- Toque/clique direto na tela do jogo ----------
tela.addEventListener('pointerdown', (e) => {
  const r = tela.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * LARGURA;
  const y = ((e.clientY - r.top) / r.height) * ALTURA;
  tocarTela(x, y);
});
