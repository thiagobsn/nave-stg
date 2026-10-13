// =============================================================
//  Os 12 ciclos de dúvidas
//  - ciclos comuns: ondas de inimigos; a duração depende da dificuldade
//  - ciclo 6: prévia do Tribunal (dura até a vida dele acabar)
//  - ciclo 12: o Tribunal, chefe final
// =============================================================

const TOTAL_CICLOS = 12;

// a dificuldade define quanto dura cada ciclo comum
const DIFICULDADES = [
  { letra: 'J', nome: 'JÚNIOR', segundos: 10, cor: '#5ac85a' },
  { letra: 'P', nome: 'PLENO', segundos: 20, cor: '#ffd030' },
  { letra: 'S', nome: 'SÊNIOR', segundos: 30, cor: '#ff5a6a' },
];
let dificuldade = DIFICULDADES[1];
const duracaoCiclo = () => dificuldade.segundos * 60; // em quadros (60 por segundo)

// Férias: bônus que aparece uma única vez por partida, num ciclo sorteado (nunca o 6 nem o 12)
let cicloFerias = null;

function sortearCicloFerias(cicloInicial) {
  const possiveis = [];
  for (let n = cicloInicial; n < TOTAL_CICLOS; n++) if (!ehCicloChefe(n)) possiveis.push(n);
  cicloFerias = possiveis.length ? escolher(possiveis) : null;
}

const TITULOS_CICLO = [
  'PRAZO INICIAL',
  'OBRA PARADA',
  'AUTOS CONCLUSOS',
  'DESVIO NA RODOVIA',
  'PEDIDO DE VISTA',
  'O TRIBUNAL SE APROXIMA',
  'EMBARGOS',
  'ADITIVO DE OBRA',
  'RECURSO NEGADO',
  'PEDÁGIO',
  'ÚLTIMA INSTÂNCIA',
  'O JULGAMENTO',
];

const jogo = {
  ciclo: 1,
  etapa: 'banner', // 'banner' | 'ondas' | 'limpando' | 'chefe' | 'fim'
  t: 0, // quadros desde o início da etapa
  tempo: 0, // quadros jogados no ciclo (para o cronômetro)
  proxOnda: 0,
  estrada: false,
  estradaY: 0,
  pontosInicio: 0, // placar no começo do ciclo (usado ao continuar)
  mensagem: null,
  extra: false, // true durante o CICLO EXTRA (o Tribunal dividido, após o ciclo 6)
  agendaBuffs: [], // [{ quando (quadro do ciclo), tipo }]
};

// buffs especiais que caem no meio de ciclos comuns (os dos chefes caem do próprio Tribunal)
const BUFFS_ESPECIAIS = { 3: 'plr', 8: 'dissidio' };
const INTERVALO_BUFF_CHEFE = 20 * 60; // nas lutas com chefe, um buff comum a cada 20 s

const ehCicloChefe = (n) => n === 6 || n === 12;

// a dificuldade cresce um pouco a cada ciclo
function dif() {
  return 1 + (jogo.ciclo - 1) * 0.07;
}

function iniciarCiclo(n) {
  jogo.ciclo = n;
  jogo.etapa = 'banner';
  jogo.t = 0;
  jogo.tempo = 0;
  jogo.proxOnda = 30;
  jogo.estrada = n % 2 === 0 && !ehCicloChefe(n); // ciclos pares acontecem na rodovia
  jogo.pontosInicio = placar;
  jogo.extra = false;
  jogo.agendaBuffs = agendarBuffs(n);

  // as férias valem só para o ciclo em que foram pegas (e somem se não foram pegas)
  for (let i = buffs.length - 1; i >= 0; i--) if (buffs[i].tipo === 'ferias') buffs.splice(i, 1);
  if (nave.ferias) {
    nave.ferias = false;
    mostrarMensagem('AS FÉRIAS ACABARAM...', '#8fd8ff');
  }
}

// 2 ou 3 buffs comuns em momentos aleatórios, o especial do ciclo (no meio dele)
// e, se este for o ciclo sorteado, as Férias logo no começo
function agendarBuffs(n) {
  if (ehCicloChefe(n)) return [];
  const duracao = duracaoCiclo();
  const agenda = [];
  const qtd = Math.random() < 0.4 ? 3 : 2;
  const inicio = duracao * 0.12;
  const fatia = (duracao * 0.85 - inicio) / qtd;
  for (let i = 0; i < qtd; i++) {
    agenda.push({ quando: Math.round(inicio + fatia * i + aleatorio(0, fatia)), tipo: null });
  }
  if (BUFFS_ESPECIAIS[n]) agenda.push({ quando: duracao / 2, tipo: BUFFS_ESPECIAIS[n] });
  if (n === cicloFerias) agenda.push({ quando: Math.round(duracao * aleatorio(0.1, 0.35)), tipo: 'ferias' });
  return agenda;
}

function soltarBuffsAgendados() {
  for (let i = jogo.agendaBuffs.length - 1; i >= 0; i--) {
    const item = jogo.agendaBuffs[i];
    if (jogo.tempo < item.quando) continue;
    if (item.tipo) soltarBuff(item.tipo);
    else soltarBuffComum();
    if (item.tipo === 'ferias') cicloFerias = null; // já saiu: não aparece de novo
    jogo.agendaBuffs.splice(i, 1);
  }
}

// a prévia derrotada se dividiu: o pedaço que ficou luta no ciclo extra
function iniciarCicloExtra() {
  jogo.extra = true;
  jogo.etapa = 'banner';
  jogo.t = 0;
}

function mostrarMensagem(textoMsg, cor) {
  jogo.mensagem = { texto: textoMsg, cor, t: 150 };
}

function chefeDerrotado() {
  if (jogo.ciclo === TOTAL_CICLOS) {
    jogo.etapa = 'fim';
    jogo.t = 0;
  } else {
    iniciarCiclo(jogo.ciclo + 1);
  }
}

function atualizarCiclo() {
  jogo.t++;
  if (jogo.estrada) jogo.estradaY = (jogo.estradaY + 1.4) % 16;
  if (jogo.mensagem && --jogo.mensagem.t <= 0) jogo.mensagem = null;

  switch (jogo.etapa) {
    case 'banner':
      if (jogo.t === 1 && (ehCicloChefe(jogo.ciclo) || jogo.extra)) tocarSom('alerta');
      if (jogo.t >= 150) {
        jogo.t = 0;
        if (jogo.extra) {
          jogo.etapa = 'chefe'; // o Tribunal menor já está em cena
        } else if (ehCicloChefe(jogo.ciclo)) {
          criarTribunal(jogo.ciclo === TOTAL_CICLOS ? 'final' : 'previa');
          jogo.etapa = 'chefe';
        } else {
          jogo.etapa = 'ondas';
        }
      }
      break;

    case 'ondas':
      jogo.tempo++;
      soltarBuffsAgendados();
      if (--jogo.proxOnda <= 0) {
        lancarOnda();
        jogo.proxOnda = Math.max(45, 120 - jogo.ciclo * 6) * aleatorio(0.8, 1.2);
      }
      if (jogo.tempo >= duracaoCiclo()) {
        jogo.etapa = 'limpando';
        jogo.t = 0;
      }
      break;

    case 'limpando':
      // espera os inimigos restantes saírem (ou no máximo 5 segundos)
      if (inimigos.length === 0 || jogo.t > 300) iniciarCiclo(jogo.ciclo + 1);
      break;

    case 'chefe':
      // o próprio Tribunal avisa quando acaba (chefeDerrotado)
      if (jogo.t % INTERVALO_BUFF_CHEFE === INTERVALO_BUFF_CHEFE / 2) soltarBuffComum();
      break;

    case 'fim':
      if (jogo.t > 150) {
        tiros.length = 0;
        balas.length = 0;
        estado = 'vitoria';
        tocarSom('vitoria');
      }
      break;
  }
}

// ---------- Rodovia dos ciclos pares ----------
function desenharEstrada() {
  if (!jogo.estrada) return;
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(68, 0, 120, ALTURA);
  ctx.fillStyle = '#24242c';
  ctx.fillRect(72, 0, 112, ALTURA);
  ctx.fillStyle = '#f0c020';
  ctx.fillRect(74, 0, 1, ALTURA);
  ctx.fillRect(181, 0, 1, ALTURA);
  ctx.fillStyle = '#c8c8d0';
  for (let y = -16 + jogo.estradaY; y < ALTURA; y += 16) {
    ctx.fillRect(109, Math.round(y), 2, 8);
    ctx.fillRect(146, Math.round(y), 2, 8);
  }
}

// ---------- Faixas de anúncio ----------
function desenharBannerCiclo() {
  if (jogo.etapa !== 'banner') return;
  const chefe = ehCicloChefe(jogo.ciclo);
  // a faixa abre e fecha suavemente
  const abertura = Math.min(1, jogo.t / 12, (150 - jogo.t) / 12);
  const altura = Math.round(44 * abertura);
  if (altura <= 0) return;

  ctx.fillStyle = jogo.extra ? 'rgba(60, 0, 90, 0.8)' : chefe ? 'rgba(80, 0, 16, 0.75)' : 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 100 - altura / 2, LARGURA, altura);
  if (abertura < 1) return;

  if (jogo.extra) {
    const cor = (quadro >> 3) % 2 ? '#ffd030' : '#ff5aff';
    texto('CICLO EXTRA', LARGURA / 2, 86, cor, 16, 'center');
    texto('O TRIBUNAL SE DIVIDIU EM 3', LARGURA / 2, 106, '#ffffff', 8, 'center');
    return;
  }

  if (chefe) {
    if ((quadro >> 3) % 2 === 0) texto('! ALERTA !', LARGURA / 2, 84, '#ff2040', 8, 'center');
    texto(jogo.ciclo === TOTAL_CICLOS ? 'CHEFE FINAL' : 'PRÉVIA DO CHEFE', LARGURA / 2, 96, '#ffffff', 8, 'center');
  } else {
    texto(`CICLO ${String(jogo.ciclo).padStart(2, '0')}`, LARGURA / 2, 86, '#ffd030', 16, 'center');
  }
  texto(TITULOS_CICLO[jogo.ciclo - 1], LARGURA / 2, chefe ? 108 : 106, '#8fd8ff', 8, 'center');
}

function desenharMensagem() {
  const m = jogo.mensagem;
  if (!m || (m.t < 40 && (quadro >> 2) % 2)) return;
  texto(m.texto, LARGURA / 2, jogo.etapa === 'banner' ? 136 : 150, m.cor, 8, 'center');
}

function textoCronometro() {
  if (ehCicloChefe(jogo.ciclo)) return '--';
  if (jogo.etapa === 'banner') return `0:${String(dificuldade.segundos).padStart(2, '0')}`;
  if (jogo.etapa !== 'ondas') return '0:00';
  const s = Math.ceil((duracaoCiclo() - jogo.tempo) / 60);
  return `0:${String(s).padStart(2, '0')}`;
}
