// =============================================================
//  Som: efeitos e música chiptune sintetizados com Web Audio
//  (nenhum arquivo de áudio; o navegador só libera o som após
//   o primeiro toque ou tecla, por isso o áudio nasce "dormindo")
// =============================================================

const CHAVE_MUDO = 'nave-stg:mudo';

const som = {
  ctx: null,
  mestre: null,
  efeitos: null,
  musica: null,
  ruido: null,
  mudo: false,
  ultimo: {}, // último instante em que cada efeito tocou (evita "metralhar" o mesmo som)
  faixa: null,
  passo: 0,
  proxNota: 0,
};

try {
  som.mudo = localStorage.getItem(CHAVE_MUDO) === '1';
} catch {
  // sem armazenamento: começa com som
}

function iniciarAudio() {
  if (!som.ctx) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    const ctxA = new Contexto();
    som.ctx = ctxA;
    som.mestre = ctxA.createGain();
    som.mestre.gain.value = som.mudo ? 0 : 1;
    som.mestre.connect(ctxA.destination);
    som.efeitos = ctxA.createGain();
    som.efeitos.gain.value = 0.5;
    som.efeitos.connect(som.mestre);
    som.musica = ctxA.createGain();
    som.musica.gain.value = 0.22;
    som.musica.connect(som.mestre);

    // um segundo de ruído branco, reaproveitado por explosões
    som.ruido = ctxA.createBuffer(1, ctxA.sampleRate, ctxA.sampleRate);
    const dados = som.ruido.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
  }
  if (som.ctx.state === 'suspended') som.ctx.resume();
}
addEventListener('pointerdown', iniciarAudio, true);
addEventListener('keydown', iniciarAudio, true);

function alternarSom() {
  som.mudo = !som.mudo;
  if (som.mestre) som.mestre.gain.value = som.mudo ? 0 : 1;
  try {
    localStorage.setItem(CHAVE_MUDO, som.mudo ? '1' : '0');
  } catch {
    // ignora: só não lembra a preferência
  }
  const botao = document.getElementById('botao-som');
  if (botao) botao.textContent = som.mudo ? 'MUDO' : 'SOM';
}

document.getElementById('botao-som').textContent = som.mudo ? 'MUDO' : 'SOM';

const audioPronto = () => som.ctx && som.ctx.state === 'running';
const freqDaNota = (midi) => 440 * 2 ** ((midi - 69) / 12);

// ---------- Blocos básicos ----------
function tom({ tipo = 'square', freq, freqFim, dur, vol = 0.1, quando = som.ctx.currentTime, destino = som.efeitos }) {
  const o = som.ctx.createOscillator();
  const g = som.ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, quando);
  if (freqFim) o.frequency.exponentialRampToValueAtTime(freqFim, quando + dur);
  g.gain.setValueAtTime(vol, quando);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  o.connect(g).connect(destino);
  o.start(quando);
  o.stop(quando + dur + 0.02);
}

function chiado({ dur, vol = 0.3, filtroIni = 3000, filtroFim = 150, quando = som.ctx.currentTime, destino = som.efeitos }) {
  const fonte = som.ctx.createBufferSource();
  fonte.buffer = som.ruido;
  const filtro = som.ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(filtroIni, quando);
  filtro.frequency.exponentialRampToValueAtTime(filtroFim, quando + dur);
  const g = som.ctx.createGain();
  g.gain.setValueAtTime(vol, quando);
  g.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
  fonte.connect(filtro).connect(g).connect(destino);
  fonte.start(quando, Math.random() * 0.5);
  fonte.stop(quando + dur + 0.02);
}

function arpejo(notas, passo, tipo = 'square', vol = 0.09) {
  const t = som.ctx.currentTime;
  notas.forEach((n, i) => tom({ tipo, freq: freqDaNota(n), dur: passo * 1.6, vol, quando: t + i * passo }));
}

// ---------- Efeitos ----------
// [intervalo mínimo em segundos, função]
const EFEITOS = {
  tiro: [0.05, () => tom({ freq: 1400, freqFim: 500, dur: 0.05, vol: 0.035 })],
  acerto: [0.04, () => chiado({ dur: 0.03, vol: 0.12, filtroIni: 6000, filtroFim: 2000 })],
  explosao: [0.03, () => chiado({ dur: 0.3, vol: 0.35, filtroIni: 2500, filtroFim: 100 })],
  explosaoGrande: [0.1, () => {
    chiado({ dur: 1.1, vol: 0.55, filtroIni: 1800, filtroFim: 60 });
    tom({ tipo: 'sine', freq: 120, freqFim: 30, dur: 0.8, vol: 0.4 });
  }],
  morte: [0.2, () => {
    tom({ freq: 600, freqFim: 60, dur: 0.6, vol: 0.12 });
    chiado({ dur: 0.7, vol: 0.4, filtroIni: 3000, filtroFim: 80 });
  }],
  escudo: [0.1, () => tom({ tipo: 'triangle', freq: 1500, freqFim: 500, dur: 0.25, vol: 0.2 })],
  buff: [0.1, () => arpejo([72, 76, 79, 84], 0.05)],
  especial: [0.2, () => arpejo([67, 72, 76, 79, 84, 88, 91], 0.07, 'square', 0.1)],
  alerta: [1, () => {
    const t = som.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      tom({ freq: 880, dur: 0.18, vol: 0.08, quando: t + i * 0.4 });
      tom({ freq: 660, dur: 0.18, vol: 0.08, quando: t + i * 0.4 + 0.2 });
    }
  }],
  foguete: [0.5, () => {
    chiado({ dur: 1.4, vol: 0.3, filtroIni: 300, filtroFim: 5000 });
    tom({ tipo: 'sawtooth', freq: 80, freqFim: 900, dur: 1.4, vol: 0.06 });
  }],
  menu: [0.05, () => tom({ freq: 990, dur: 0.05, vol: 0.06 })],
  confirmar: [0.1, () => arpejo([76, 83], 0.06)],
  vitoria: [1, () => arpejo([60, 64, 67, 72, 67, 72, 76, 79, 84], 0.12, 'square', 0.11)],
  gameover: [1, () => arpejo([67, 63, 60, 55, 51, 48], 0.18, 'triangle', 0.18)],
};

function tocarSom(nome) {
  if (!audioPronto() || som.mudo) return;
  const [intervalo, tocar] = EFEITOS[nome];
  const agora = som.ctx.currentTime;
  if (agora - (som.ultimo[nome] ?? -1) < intervalo) return;
  som.ultimo[nome] = agora;
  tocar();
}

// ---------- Música ----------
// cada faixa: andamento, acordes (notas MIDI) e o padrão do baixo por colcheia
const FAIXAS_MUSICA = {
  // fases comuns: Lá menor, animada
  fase: {
    bpm: 138,
    acordes: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],
    arpejo: [0, 1, 2, 1, 0, 1, 2, 3],
  },
  // lutas com o Tribunal: Ré menor, mais rápida e tensa
  chefe: {
    bpm: 168,
    acordes: [[50, 53, 57], [50, 53, 56], [46, 50, 53], [45, 49, 52]],
    arpejo: [0, 2, 1, 2, 0, 2, 3, 2],
  },
  // menus: lenta e só com o baixo e um arpejo suave
  menu: {
    bpm: 96,
    acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    arpejo: [0, 1, 2, 3, 2, 1, 0, 1],
    suave: true,
  },
};

function tocarMusica(nome) {
  if (som.faixa === nome) return;
  som.faixa = nome;
  som.passo = 0;
  if (som.ctx) som.proxNota = som.ctx.currentTime + 0.05;
}

// chamada a cada quadro: agenda as notas um pouco à frente do tempo atual
function atualizarMusica() {
  if (!audioPronto() || !som.faixa) return;
  const f = FAIXAS_MUSICA[som.faixa];
  const semicolcheia = 60 / f.bpm / 4;
  if (som.proxNota < som.ctx.currentTime) som.proxNota = som.ctx.currentTime + 0.02;

  while (som.proxNota < som.ctx.currentTime + 0.12) {
    const passo = som.passo;
    const acorde = f.acordes[Math.floor(passo / 32) % f.acordes.length]; // 2 compassos por acorde
    const t = som.proxNota;

    // baixo nas colcheias: fundamental, com oitava no contratempo
    if (passo % 2 === 0) {
      const raiz = acorde[0] - 24 + (passo % 8 === 4 ? 12 : 0);
      tom({ tipo: 'triangle', freq: freqDaNota(raiz), dur: semicolcheia * 1.8, vol: 0.5, quando: t, destino: som.musica });
    }

    // arpejo nas semicolcheias (o índice 3 é a fundamental uma oitava acima)
    const i = f.arpejo[passo % f.arpejo.length];
    const nota = i === 3 ? acorde[0] + 12 : acorde[i];
    if (!f.suave || passo % 2 === 0) {
      tom({ tipo: 'square', freq: freqDaNota(nota + 12), dur: semicolcheia * 0.9, vol: f.suave ? 0.08 : 0.12, quando: t, destino: som.musica });
    }

    // caixa (ruído curto) nos tempos 2 e 4, fora dos menus
    if (!f.suave && passo % 8 === 4) {
      chiado({ dur: 0.06, vol: 0.25, filtroIni: 5000, filtroFim: 1500, quando: t, destino: som.musica });
    }

    som.proxNota += semicolcheia;
    som.passo++;
  }
}
