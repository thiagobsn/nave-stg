// Servidor estático mínimo para rodar o jogo localmente: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORTA = process.env.PORT || 8080;
const RAIZ = __dirname;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

http.createServer((req, res) => {
  const caminhoUrl = decodeURIComponent(req.url.split('?')[0]);
  const arquivo = path.join(RAIZ, caminhoUrl === '/' ? 'index.html' : caminhoUrl);
  if (!arquivo.startsWith(RAIZ)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(arquivo, (erro, dados) => {
    if (erro) {
      res.writeHead(404).end('Não encontrado');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(dados);
  });
}).listen(PORTA, () => console.log(`Jogo rodando em http://localhost:${PORTA}`));
