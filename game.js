// =============================================================
//  Nave STG — estados do jogo, telas, colisões e laço principal
// =============================================================

// 'titulo' | 'selecao' | 'jogando' | 'pausa' | 'gameover' | 'nome' | 'ranking' | 'vitoria' | 'creditos'
let estado = 'titulo';
let placar = 0;
let vidas = 3;
let horasExtras = 0; // quantas vezes o jogador continuou após o game over
let opcaoHoraExtra = 0; // 0 = SIM, 1 = NÃO

// para testar um ciclo específico: index.html?ciclo=6
const CICLO_INICIAL = Math.min(TOTAL_CICLOS, Math.max(1, Number(new URLSearchParams(location.search).get('ciclo')) || 1));

function limparCampo() {
  tiros.length = 0;
  balas.length = 0;
  inimigos.length = 0;
  particulas.length = 0;
  ondasChoque.length = 0;
  buffs.length = 0;
  destrocos.length = 0;
  tribunal = null;
  jogo.mensagem = null;
}

function iniciarPartida(tipo) {
  nave.tipo = tipo;
  placar = 0;
  vidas = VIDAS_INICIAIS;
  horasExtras = 0;
  reiniciarMelhorias();
  limparCampo();
  posicionarNave();
  iniciarCiclo(CICLO_INICIAL);
}

function fimDeJogo() {
  estado = 'gameover';
  opcaoHoraExtra = 0;
  tocarSom('gameover');
}

// hora extra: restaura as vidas e continua exatamente de onde parou
function fazerHoraExtra() {
  horasExtras++;
  vidas = VIDAS_INICIAIS;
  balas.length = 0;
  posicionarNave();
  estado = 'jogando';
  tocarSom('especial');
  mostrarMensagem('HORA EXTRA! VIDAS RESTAURADAS', '#ffd030');
}

// fim da partida (desistiu ou venceu): pede o nome se entrou no ranking
function encerrarPartida(venceu) {
  const entrada = {
    pontos: placar,
    ciclo: jogo.ciclo,
    nave: nave.tipo.sigla,
    horasExtras,
    venceu,
  };
  rankingDestaque = -1;
  if (entraNoRanking(placar)) {
    estado = 'nome';
    pedirNome(entrada);
  } else {
    estado = 'ranking';
  }
}

// ---------- Colisões ----------
const sobrepoe = (ax, ay, aw, ah, bx, by, bw, bh) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

function verificarColisoes() {
  // tiros do jogador contra inimigos e Tribunal
  for (let i = tiros.length - 1; i >= 0; i--) {
    const t = tiros[i];
    const [tx, ty, tw, th] = caixaTiro(t);
    let consumido = false;

    for (const e of inimigos) {
      if (e.hp <= 0 || t.acertou?.has(e)) continue;
      const mw = e.d.sprite.width / 2 - 2;
      const mh = e.d.sprite.height / 2 - 2;
      if (sobrepoe(tx, ty, tw, th, e.x - mw, e.y - mh, mw * 2, mh * 2)) {
        ferirInimigo(e, t.dano);
        if (t.acertou) t.acertou.add(e);
        else {
          consumido = true;
          break;
        }
      }
    }

    // no Tribunal todo tiro para, inclusive os que perfuram
    if (!consumido && tribunalVulneravel() && sobrepoe(tx, ty, tw, th, ...caixaTribunal())) {
      ferirTribunal(t.dano);
      consumido = true;
    }

    if (consumido) {
      faisca(t.x, t.y);
      tiros.splice(i, 1);
    }
  }

  if (nave.morta > 0 || nave.invencivel > 0) return;

  // balas inimigas contra a nave (hitbox pequena, como nos STGs clássicos)
  for (const b of balas) {
    const dx = b.x - nave.x;
    const dy = b.y - nave.y;
    if (dx * dx + dy * dy < 9) {
      atingirNave();
      return;
    }
  }

  // encostar em inimigos também machuca
  for (const e of inimigos) {
    const mw = e.d.sprite.width / 2 - 3;
    const mh = e.d.sprite.height / 2 - 3;
    if (Math.abs(e.x - nave.x) < mw + 2 && Math.abs(e.y - nave.y) < mh + 2) {
      ferirInimigo(e, 10);
      atingirNave();
      return;
    }
  }

  if (tribunal && !tribunal.entrando && sobrepoe(nave.x - 2, nave.y - 2, 4, 4, ...caixaTribunal())) {
    atingirNave();
  }
}

// ---------- HUD ----------
function desenharHUD() {
  texto(nave.tipo.sigla, 6, 4, '#ff5a6a');
  texto(String(placar).padStart(7, '0'), 26, 4);
  for (let i = 0; i < vidas; i++) {
    ctx.drawImage(nave.tipo.sprite, 0, 0, 16, 16, 242 - i * 10, 3, 8, 8);
  }
  texto(jogo.extra ? 'CICLO EXTRA' : `CICLO ${jogo.ciclo}/${TOTAL_CICLOS}`, 6, 14, jogo.extra ? '#ff5aff' : '#ffd030');
  texto(textoCronometro(), 250, 14, '#8fd8ff', 8, 'right');

  // nível da arma, cargas do escudo e reajuste do dissídio
  texto(`A${nave.arma}`, 96, 4, '#ff8a40');
  for (let i = 0; i < nave.escudo; i++) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(117 + i * 5, 4, 4, 8);
    ctx.fillStyle = '#4ab0ff';
    ctx.fillRect(117 + i * 5, 4, 3, 7);
  }
  if (nave.reajuste > 1) texto(`+${Math.round((nave.reajuste - 1) * 100)}%`, 104, 14, '#5ac85a');
  desenharBarraTribunal();
}

// ---------- Telas ----------
const piscaLento = () => (quadro >> 5) % 2 === 0;

function fundoEscuro(alfa) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alfa})`;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
}

function desenharTitulo() {
  fundoEscuro(0.45);

  // a tela de título alterna com o ranking, como nos fliperamas
  if (Math.floor(quadro / 420) % 2 === 1) {
    texto('NAVE STG', LARGURA / 2, 6, '#ffd030', 16, 'center');
    desenharTabelaRanking(30);
    return;
  }

  texto('NAVE STG', LARGURA / 2, 46, '#ffd030', 16, 'center');
  texto('CONTRA O TRIBUNAL', LARGURA / 2, 68, '#ff5a6a', 8, 'center');
  if (piscaLento()) {
    texto(ehToque() ? 'TOQUE PARA COMEÇAR' : 'PRESSIONE ENTER', LARGURA / 2, 110, '#ffffff', 8, 'center');
  }
  const ajuda = ehToque()
    ? ['MANETE      MOVER', 'A           ATIRAR', 'B           LENTO', 'START       PAUSA']
    : ['SETAS/WASD  MOVER', 'ESPAÇO/Z    ATIRAR', 'SHIFT/X     LENTO', 'P PAUSA    M SOM'];
  ajuda.forEach((linha, i) => texto(linha, LARGURA / 2, 150 + i * 12, '#8fd8ff', 8, 'center'));
  if (som.mudo) texto('SOM DESLIGADO', LARGURA / 2, 206, '#6a6a8a', 8, 'center');
}

let selecionada = 0;

function mudarSelecao(nova) {
  selecionada = (nova + NAVES.length) % NAVES.length;
  tocarSom('menu');
}

function atualizarSelecao() {
  if (acoesPressionadas.has('esquerda')) mudarSelecao(selecionada - 1);
  if (acoesPressionadas.has('direita')) mudarSelecao(selecionada + 1);
  if (acoesPressionadas.has('voltar')) estado = 'titulo';
  if (acoesPressionadas.has('start') || acoesPressionadas.has('tiro')) {
    tocarSom('confirmar');
    iniciarPartida(NAVES[selecionada]);
    estado = 'jogando';
  }
}

const xMiniatura = (i) => Math.round((LARGURA / (NAVES.length + 1)) * (i + 1));

function desenharSelecao() {
  const tipo = NAVES[selecionada];
  fundoEscuro(0.35);

  texto('ESCOLHA SUA NAVE', LARGURA / 2, 8, '#ffd030', 8, 'center');

  // miniaturas das cinco naves
  NAVES.forEach((n, i) => {
    const cx = xMiniatura(i);
    const ativa = i === selecionada;
    if (ativa) {
      ctx.strokeStyle = (quadro >> 3) % 2 ? '#ffd030' : '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 12.5, 21.5, 24, 24);
    }
    ctx.globalAlpha = ativa ? 1 : 0.5;
    ctx.drawImage(n.sprite, cx - 8, 25);
    ctx.globalAlpha = 1;
    texto(n.sigla, cx, 49, ativa ? '#ffffff' : '#6a6a8a', 8, 'center');
  });

  // faixa com as cores da bandeira do estado
  ctx.globalAlpha = 0.3;
  tipo.bandeira.forEach((cor, i) => {
    ctx.fillStyle = cor;
    ctx.fillRect(0, 64 + i * 16, LARGURA, 16);
  });
  ctx.globalAlpha = 1;

  // nave ampliada, flutuando
  const flutuar = Math.round(Math.sin(quadro / 20) * 2);
  desenharSpriteNave(tipo, LARGURA / 2, 86 + flutuar, 3);

  texto(tipo.nome, LARGURA / 2, 118, '#ffd030', 16, 'center');
  texto(tipo.estado, LARGURA / 2, 138, '#8fd8ff', 8, 'center');
  texto(tipo.descricao[0], LARGURA / 2, 152, '#ffffff', 8, 'center');
  texto(tipo.descricao[1], LARGURA / 2, 162, '#ffffff', 8, 'center');

  const atributos = [
    ['VELOC.', tipo.atributos.velocidade],
    ['PODER', tipo.atributos.poder],
    ['CADÊNCIA', tipo.atributos.cadencia],
  ];
  atributos.forEach(([rotulo, valor], i) => {
    const y = 177 + i * 10;
    texto(rotulo, 48, y, '#8fd8ff');
    for (let b = 0; b < 5; b++) {
      ctx.fillStyle = b < valor ? '#ffd030' : '#2a2a4a';
      ctx.fillRect(130 + b * 16, y, 13, 7);
    }
  });

  if (piscaLento()) {
    texto(ehToque() ? 'TOQUE NA NAVE OU EM A' : 'ENTER CONFIRMA', LARGURA / 2, 210, '#ffffff', 8, 'center');
  }
}

function desenharPausa() {
  fundoEscuro(0.5);
  texto('PAUSA', LARGURA / 2, ALTURA / 2 - 10, '#ffffff', 8, 'center');
  texto(ehToque() ? 'B: TROCAR NAVE' : 'ESC: TROCAR NAVE', LARGURA / 2, ALTURA / 2 + 6, '#8fd8ff', 8, 'center');
}

// caixas clicáveis do SIM e do NÃO
const OPCOES_HORA_EXTRA = [[64, 112, 56, 22], [136, 112, 56, 22]];

function atualizarGameOver() {
  if (acoesPressionadas.has('esquerda') || acoesPressionadas.has('direita')) {
    opcaoHoraExtra = 1 - opcaoHoraExtra;
    tocarSom('menu');
  }
  if (acoesPressionadas.has('voltar')) opcaoHoraExtra = 1;
  if (acoesPressionadas.has('start') || acoesPressionadas.has('tiro')) {
    if (opcaoHoraExtra === 0) fazerHoraExtra();
    else encerrarPartida(false);
  }
}

function desenharGameOver() {
  fundoEscuro(0.65);
  texto('GAME OVER', LARGURA / 2, 50, '#ff2040', 16, 'center');
  texto(`PARADO NO CICLO ${jogo.extra ? 'EXTRA' : jogo.ciclo}`, LARGURA / 2, 74, '#ffffff', 8, 'center');
  texto('FAZER HORA EXTRA?', LARGURA / 2, 96, '#ffd030', 8, 'center');

  ['SIM', 'NÃO'].forEach((rotulo, i) => {
    const [x, y, w, h] = OPCOES_HORA_EXTRA[i];
    const ativa = i === opcaoHoraExtra;
    ctx.fillStyle = ativa ? '#ffd030' : '#1a1030';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = ativa && (quadro >> 3) % 2 ? '#ffffff' : '#ffd030';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    texto(rotulo, x + w / 2, y + 7, ativa ? '#000000' : '#ffffff', 8, 'center');
  });

  texto('A HORA EXTRA RESTAURA', LARGURA / 2, 150, '#8fd8ff', 8, 'center');
  texto('TODAS AS VIDAS', LARGURA / 2, 161, '#8fd8ff', 8, 'center');
  if (horasExtras > 0) texto(`HORAS EXTRAS FEITAS: ${horasExtras}`, LARGURA / 2, 180, '#6a6a8a', 8, 'center');
  texto(ehToque() ? 'TOQUE PARA ESCOLHER' : 'SETAS ESCOLHEM  ENTER OK', LARGURA / 2, 204, '#6a6a8a', 8, 'center');
}

function desenharTelaRanking() {
  fundoEscuro(0.6);
  desenharTabelaRanking(10);
  if (piscaLento()) texto(ehToque() ? 'TOQUE PARA CONTINUAR' : 'ENTER PARA CONTINUAR', LARGURA / 2, 210, '#ffd030', 8, 'center');
}

function desenharVitoria() {
  fundoEscuro(0.5);
  texto('VITÓRIA!', LARGURA / 2, 56, '#ffd030', 16, 'center');
  texto('O TRIBUNAL FOI VENCIDO', LARGURA / 2, 86, '#ffffff', 8, 'center');
  texto(`${nave.tipo.nome} - ${nave.tipo.estado}`, LARGURA / 2, 104, '#8fd8ff', 8, 'center');
  texto(`PONTOS ${String(placar).padStart(7, '0')}`, LARGURA / 2, 130, '#ffffff', 8, 'center');
  desenharSpriteNave(nave.tipo, LARGURA / 2, 166 + Math.round(Math.sin(quadro / 20) * 2), 2);
  if (piscaLento()) texto(ehToque() ? 'TOQUE PARA CONTINUAR' : 'ENTER PARA CONTINUAR', LARGURA / 2, 200, '#ffd030', 8, 'center');
}

// ---------- Créditos finais (depois da vitória) ----------
// [texto, cor, tamanho]; linhas vazias viram espaço
const CREDITOS = [
  ['NAVE STG', '#ffd030', 16],
  ['CONTRA O TRIBUNAL', '#ff5a6a', 8],
  [''], [''], [''],
  ['CRIADO POR', '#8fd8ff', 8],
  [''],
  ['THIAGO', '#ffffff', 16],
  ['BERNARDO', '#ffffff', 16],
  [''], [''], [''],
  ['DESENVOLVIDO COM', '#8fd8ff', 8],
  [''],
  ['CLAUDE', '#ff9a5a', 16],
  [''], [''], [''],
  ['PILOTOS', '#8fd8ff', 8],
  [''],
  ...NAVES.map((n) => [`${n.nome} - ${n.sigla}`, '#ffffff', 8]),
  [''], [''], [''],
  ['O TRIBUNAL FOI VENCIDO.', '#ffd030', 8],
  ['MAS UM DELES FUGIU...', '#ff5a6a', 8],
  [''], [''], [''], [''],
  ['OBRIGADO POR JOGAR!', '#ffd030', 8],
];
// posição vertical de cada linha: as de 16px ocupam mais espaço que as de 8px
const Y_CREDITOS = [];
let alturaCreditos = 0;
for (const [, , tamanho = 8] of CREDITOS) {
  Y_CREDITOS.push(alturaCreditos);
  alturaCreditos += tamanho === 16 ? 22 : 12;
}
let rolagemCreditos = 0;
let esperaCreditos = 0; // quadros parados depois que a última linha chega ao meio

function iniciarCreditos() {
  rolagemCreditos = 0;
  esperaCreditos = 0;
  estado = 'creditos';
}

function atualizarCreditos() {
  // a última linha para no meio da tela; depois de 3 segundos segue para o ranking
  // (segurar o tiro acelera; START pula)
  const fim = Y_CREDITOS[Y_CREDITOS.length - 1] + ALTURA / 2;
  if (rolagemCreditos < fim) rolagemCreditos = Math.min(fim, rolagemCreditos + (teclas.has('tiro') ? 1.6 : 0.45));
  else esperaCreditos++;
  if (acoesPressionadas.has('start') || esperaCreditos > 180) encerrarPartida(true);
}

function desenharCreditos() {
  fundoEscuro(0.7);
  // a nave do jogador acompanha os créditos no rodapé, por baixo do texto
  desenharSpriteNave(nave.tipo, LARGURA / 2, ALTURA - 20 + Math.round(Math.sin(quadro / 20) * 2), 1);
  CREDITOS.forEach(([linha, cor, tamanho], i) => {
    if (!linha) return;
    const y = ALTURA + Y_CREDITOS[i] - rolagemCreditos;
    if (y < -16 || y > ALTURA) return;
    texto(linha, LARGURA / 2, Math.round(y), cor, tamanho, 'center');
  });
}

// ---------- Toque/clique direto na tela (chamado pelo toque.js) ----------
function tocarTela(x, y) {
  switch (estado) {
    case 'titulo':
    case 'ranking':
    case 'vitoria':
    case 'creditos':
    case 'pausa':
      acoesPressionadas.add('start');
      break;
    case 'selecao':
      if (y < 60) {
        // tocar numa miniatura escolhe; tocar de novo na escolhida confirma
        const i = NAVES.findIndex((_, k) => Math.abs(x - xMiniatura(k)) < 20);
        if (i === selecionada) acoesPressionadas.add('start');
        else if (i >= 0) mudarSelecao(i);
      } else if (y < 172) {
        acoesPressionadas.add('start');
      }
      break;
    case 'gameover':
      OPCOES_HORA_EXTRA.forEach(([ox, oy, w, h], i) => {
        if (x >= ox && x <= ox + w && y >= oy - 6 && y <= oy + h + 6) {
          opcaoHoraExtra = i;
          acoesPressionadas.add('start');
        }
      });
      break;
  }
}

// ---------- Música de cada momento ----------
function musicaDoMomento() {
  if (estado === 'jogando') return ehCicloChefe(jogo.ciclo) || jogo.extra ? 'chefe' : 'fase';
  if (['titulo', 'selecao', 'ranking', 'creditos'].includes(estado)) return 'menu';
  return null; // pausa, game over, nome e vitória ficam sem música
}

// ---------- Atualização ----------
function atualizarJogo() {
  atualizarCiclo();
  atualizarNave();
  atualizarTiros();
  atualizarInimigos();
  atualizarTribunal();
  atualizarBuffs();
  atualizarBalas();
  verificarColisoes();
  atualizarParticulas();
}

function atualizar() {
  quadro++;
  atualizarEstrelas();
  const apertou = (...acoes) => acoes.some((a) => acoesPressionadas.has(a));
  if (apertou('som')) alternarSom();

  switch (estado) {
    case 'titulo':
      if (apertou('start', 'tiro')) {
        tocarSom('confirmar');
        estado = 'selecao';
      }
      break;
    case 'selecao':
      atualizarSelecao();
      break;
    case 'jogando':
      if (apertou('pausa', 'start', 'voltar')) estado = 'pausa';
      else atualizarJogo();
      break;
    case 'pausa':
      if (apertou('voltar')) estado = 'selecao';
      else if (apertou('pausa', 'start')) estado = 'jogando';
      break;
    case 'gameover':
      atualizarParticulas();
      atualizarGameOver();
      break;
    case 'nome':
      // o formulário HTML cuida da digitação (ranking.js)
      break;
    case 'ranking':
      if (apertou('start', 'tiro', 'voltar')) estado = 'titulo';
      break;
    case 'vitoria':
      atualizarParticulas();
      if (apertou('start', 'tiro')) iniciarCreditos();
      break;
    case 'creditos':
      atualizarCreditos();
      break;
  }

  tocarMusica(musicaDoMomento());
  atualizarMusica();
  acoesPressionadas.clear();
}

// ---------- Desenho ----------
function desenhar() {
  ctx.fillStyle = '#05030f';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  desenharEstrelas();

  const emJogo = ['jogando', 'pausa', 'gameover', 'vitoria', 'nome'].includes(estado);
  if (emJogo) {
    desenharEstrada();
    desenharInimigos();
    desenharTribunal();
    desenharBuffs();
    desenharTiros();
    desenharNave();
    desenharBalas();
    desenharParticulas();
    desenharBannerCiclo();
    desenharMensagem();
    desenharHUD();
  }

  if (estado === 'titulo') desenharTitulo();
  if (estado === 'selecao') desenharSelecao();
  if (estado === 'pausa') desenharPausa();
  if (estado === 'gameover') desenharGameOver();
  if (estado === 'ranking') desenharTelaRanking();
  if (estado === 'vitoria') desenharVitoria();
  if (estado === 'creditos') desenharCreditos();
}

// ---------- Laço principal com passo fixo ----------
let acumulado = 0;
let ultimo = performance.now();

function laco(agora) {
  acumulado += Math.min(agora - ultimo, 250); // evita "espiral da morte" após trocar de aba
  ultimo = agora;
  while (acumulado >= PASSO) {
    atualizar();
    acumulado -= PASSO;
  }
  desenhar();
  requestAnimationFrame(laco);
}

// espera a fonte pixelada carregar antes de começar (com fallback)
Promise.race([
  document.fonts.load(`8px ${FONTE}`),
  new Promise((r) => setTimeout(r, 1500)),
]).finally(() => requestAnimationFrame(laco));
