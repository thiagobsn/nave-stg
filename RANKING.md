# Ranking e publicação gratuita

## Como o ranking funciona hoje

- **Sem configurar nada:** cada aparelho guarda o próprio Top 10 no navegador (`localStorage`). Funciona offline e no GitHub Pages, mas cada jogador só vê os recordes do próprio aparelho.
- **Com o Supabase configurado em `config.js`:** todos os jogadores veem o mesmo Top 10. Se a internet ou o serviço falharem, o jogo usa o ranking local automaticamente, e o recorde continua salvo no aparelho.

Cada registro guarda: nome (até 10 letras), pontos, ciclo alcançado, sigla da nave, quantas horas extras a pessoa fez e se venceu o Tribunal. Na tabela, o `*` marca quem fez hora extra.

## Por que o Supabase

O GitHub Pages só serve arquivos estáticos, então ele não consegue gravar os recordes. Para um ranking único é preciso um serviço externo gratuito:

| Opção | Custo | Prós | Contras |
|---|---|---|---|
| **Supabase** (recomendado) | grátis (500 MB) | banco Postgres de verdade, API REST pronta, regras de acesso no próprio banco | projetos grátis pausam após 7 dias sem uso (reativa com 1 clique) |
| Firebase Firestore | grátis (cota diária) | muito usado, SDK completo | exige o SDK do Google; regras de segurança em linguagem própria |
| Google Planilhas + Apps Script | grátis | fácil de ver os dados | lento, limites de cota, mais frágil |
| Issues do GitHub | grátis | tudo no GitHub | exige token, o que é inseguro em site público |

O código já fala com o Supabase pela API REST, sem precisar instalar biblioteca.

## Passo a passo do ranking online (cerca de 10 minutos)

1. Crie uma conta em https://supabase.com e um projeto novo (região São Paulo).
2. No menu **SQL Editor**, rode:

```sql
create table ranking (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(nome) between 1 and 10),
  pontos integer not null check (pontos between 1 and 2000000),
  ciclo integer not null check (ciclo between 1 and 12),
  nave text not null check (nave in ('CE', 'SC', 'RS', 'PR', 'MS')),
  horas_extras integer not null default 0 check (horas_extras between 0 and 999),
  venceu boolean not null default false,
  criado_em timestamptz not null default now()
);

create index ranking_pontos on ranking (pontos desc);

-- regras de acesso: qualquer pessoa pode LER e INSERIR; ninguém pode alterar nem apagar
alter table ranking enable row level security;
create policy "todos leem" on ranking for select using (true);
create policy "todos inserem" on ranking for insert with check (true);
```

3. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
4. Cole as duas em `config.js`:

```js
const CONFIG_RANKING = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseChave: 'eyJhbGciOi...',
};
```

5. Abra o jogo: a tabela passa a mostrar **RANKING ONLINE** em vez de **NESTE APARELHO**.

A chave `anon` foi feita para ficar no navegador. O que protege o banco são as regras acima: com elas, ninguém consegue apagar nem editar recordes.

## Limitação importante: trapaça

Em qualquer jogo que roda inteiro no navegador, alguém com conhecimento técnico consegue enviar uma pontuação falsa. As regras acima já barram valores absurdos (pontos acima de 2 milhões, ciclo fora de 1 a 12, nave inexistente). Para um ranking entre amigos, isso basta. Se ele virar competição séria, os próximos passos seriam:

- uma *Edge Function* no Supabase que valide a partida (duração mínima, pontos possíveis por ciclo);
- limitar o número de envios por minuto;
- moderar o ranking manualmente pelo painel do Supabase (dá para apagar linhas de lá).

## Publicar no GitHub Pages (grátis)

O jogo já está pronto para isso: são só arquivos estáticos com caminhos relativos. O `server.js` serve apenas para testar no computador e não é usado no Pages.

1. Crie um repositório no GitHub (por exemplo, `nave-stg`) e envie os arquivos desta pasta:

```bash
git init
git add .
git commit -m "feat: primeira versão do Nave STG"
git branch -M main
git remote add origin https://github.com/thiagobsn/nave-stg.git
git push -u origin main
```

2. No repositório, vá em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)` e salve.
3. Em 1 ou 2 minutos o jogo estará em `https://thiagobsn.github.io/nave-stg/`.

O endereço é HTTPS, o que o celular precisa para o som e o ranking online funcionarem bem. No celular, dá para usar **Adicionar à tela inicial** para abrir o jogo como se fosse um app.
