// =============================================================
//  Ranking dos melhores jogadores
//  - sempre guarda no aparelho (localStorage)
//  - se o config.js tiver Supabase configurado, usa o ranking online
//    (e cai para o local se a internet ou o serviço falharem)
// =============================================================

const CHAVE_RANKING = 'nave-stg:ranking';
const CHAVE_ULTIMO_NOME = 'nave-stg:nome';
const TAMANHO_RANKING = 10;
const rankingOnline = Boolean(CONFIG_RANKING.supabaseUrl && CONFIG_RANKING.supabaseChave);

let ranking = []; // lista atual, melhores primeiro
let rankingFonte = 'local'; // 'local' | 'online'
let rankingDestaque = -1; // posição recém-conquistada, para piscar na tabela

function lerArmazenamento(chave, padrao) {
  try {
    return JSON.parse(localStorage.getItem(chave)) ?? padrao;
  } catch {
    return padrao;
  }
}

function gravarArmazenamento(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // modo privado ou armazenamento cheio: o ranking local só não persiste
  }
}

const ordenarRanking = (lista) => [...lista].sort((a, b) => b.pontos - a.pontos).slice(0, TAMANHO_RANKING);

// ---------- Supabase (API REST, sem biblioteca) ----------
async function chamarSupabase(caminho, opcoes = {}) {
  const chave = CONFIG_RANKING.supabaseChave;
  const resposta = await fetch(`${CONFIG_RANKING.supabaseUrl}/rest/v1/${caminho}`, {
    ...opcoes,
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      'Content-Type': 'application/json',
      ...opcoes.headers,
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!resposta.ok) throw new Error(`ranking online respondeu ${resposta.status}`);
  const corpo = await resposta.text();
  return corpo ? JSON.parse(corpo) : null;
}

const deOnline = (r) => ({
  nome: r.nome, pontos: r.pontos, ciclo: r.ciclo, nave: r.nave,
  horasExtras: r.horas_extras, venceu: r.venceu,
});

const paraOnline = (e) => ({
  nome: e.nome, pontos: e.pontos, ciclo: e.ciclo, nave: e.nave,
  horas_extras: e.horasExtras, venceu: e.venceu,
});

// ---------- Operações ----------
async function carregarRanking() {
  if (rankingOnline) {
    try {
      const campos = 'nome,pontos,ciclo,nave,horas_extras,venceu';
      const lista = await chamarSupabase(`ranking?select=${campos}&order=pontos.desc&limit=${TAMANHO_RANKING}`);
      ranking = lista.map(deOnline);
      rankingFonte = 'online';
      return;
    } catch (erro) {
      console.warn('Ranking online indisponível, usando o local.', erro);
    }
  }
  ranking = ordenarRanking(lerArmazenamento(CHAVE_RANKING, []));
  rankingFonte = 'local';
}

function entraNoRanking(pontos) {
  return pontos > 0 && (ranking.length < TAMANHO_RANKING || pontos > ranking[ranking.length - 1].pontos);
}

async function registrarNoRanking(entrada) {
  gravarArmazenamento(CHAVE_RANKING, ordenarRanking([...lerArmazenamento(CHAVE_RANKING, []), entrada]));
  gravarArmazenamento(CHAVE_ULTIMO_NOME, entrada.nome);
  if (rankingOnline) {
    try {
      await chamarSupabase('ranking', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(paraOnline(entrada)),
      });
    } catch (erro) {
      console.warn('Não foi possível enviar ao ranking online; ficou salvo no aparelho.', erro);
    }
  }
  await carregarRanking();
  rankingDestaque = ranking.findIndex((r) => r.nome === entrada.nome && r.pontos === entrada.pontos);
}

// letras (com acento), números, espaço, ponto e hífen; até 10 caracteres
function limparNome(nome) {
  return nome.toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇÀ .-]/g, '').trim().slice(0, 10);
}

// ---------- Entrada do nome ----------
const formNome = document.getElementById('form-nome');
const campoNome = document.getElementById('campo-nome');
let entradaPendente = null;

function pedirNome(entrada) {
  entradaPendente = entrada;
  campoNome.value = lerArmazenamento(CHAVE_ULTIMO_NOME, '');
  formNome.hidden = false;
  teclas.clear();
  setTimeout(() => campoNome.focus(), 50);
}

formNome.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!entradaPendente) return;
  const entrada = { ...entradaPendente, nome: limparNome(campoNome.value) || 'PILOTO' };
  entradaPendente = null;
  campoNome.blur();
  formNome.hidden = true;
  estado = 'ranking';
  await registrarNoRanking(entrada);
});

// ---------- Tabela ----------
function desenharTabelaRanking(y0) {
  texto('MELHORES JOGADORES', LARGURA / 2, y0, '#ffd030', 8, 'center');
  texto(rankingFonte === 'online' ? 'RANKING ONLINE' : 'NESTE APARELHO', LARGURA / 2, y0 + 11, '#6a6a8a', 8, 'center');

  if (ranking.length === 0) {
    texto('NINGUÉM AINDA.', LARGURA / 2, y0 + 50, '#ffffff', 8, 'center');
    texto('SEJA O PRIMEIRO!', LARGURA / 2, y0 + 62, '#ffffff', 8, 'center');
    return;
  }

  ranking.forEach((r, i) => {
    const y = y0 + 28 + i * 11;
    let cor = i === 0 ? '#ffd030' : i < 3 ? '#ffb070' : '#ffffff';
    if (i === rankingDestaque) cor = (quadro >> 3) % 2 ? '#5aff8a' : '#ffffff'; // pisca a posição nova
    const fim = r.venceu ? 'FIM' : `C${String(r.ciclo).padStart(2, '0')}`;
    const linha = `${String(i + 1).padStart(2, ' ')} ${r.nome.padEnd(10, ' ')} ${String(r.pontos).padStart(7, '0')} ${r.nave} ${fim}${r.horasExtras > 0 ? '*' : ''}`;
    texto(linha, 8, y, cor);
  });
  if (ranking.some((r) => r.horasExtras > 0)) {
    texto('* FEZ HORA EXTRA', LARGURA / 2, y0 + 28 + ranking.length * 11 + 3, '#6a6a8a', 8, 'center');
  }
}

carregarRanking();
