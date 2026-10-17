// Backend opcional: serve o site e uma API REST em cima de data/pokedex.json.
// Zero dependências — só Node 18+. Rode com `npm start` e abra http://localhost:3000
//
//   GET /api/pokemon            lista resumida (id, nome, tipos)
//   GET /api/pokemon/:idOuNome  ficha completa (ex: /api/pokemon/25 ou /api/pokemon/pikachu)
//   GET /api/pokemon/aleatorio  um Pokémon sorteado
//   GET /api/dia                o Pokémon do dia (o mesmo para todo mundo, muda à meia-noite UTC)
//   GET /api/tipos              tabela de vantagens entre tipos

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PORTA = Number(process.env.PORT) || 3000;
const dados = JSON.parse(await readFile(join(RAIZ, "data/pokedex.json"), "utf8"));

const TIPOS_MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const json = (res, status, corpo) => {
  res.writeHead(status, {
    "Content-Type": TIPOS_MIME[".json"],
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
  });
  res.end(JSON.stringify(corpo));
};

const pokemonDoDia = () => {
  const dia = Math.floor(Date.now() / 86_400_000);
  return dados.pokemon[(dia * 2654435761) % dados.pokemon.length];
};

function api(caminho, res) {
  const partes = caminho.split("/").filter(Boolean).slice(1); // tira o "api"
  const [recurso, chave] = partes;

  if (recurso === "tipos") return json(res, 200, dados.tipos);
  if (recurso === "dia") return json(res, 200, pokemonDoDia());
  if (recurso !== "pokemon") return json(res, 404, { erro: "Rota não existe. Tente /api/pokemon" });

  if (!chave) return json(res, 200, dados.pokemon.map(({ id, nome, tipos }) => ({ id, nome, tipos })));
  if (chave === "aleatorio") {
    return json(res, 200, dados.pokemon[Math.floor(Math.random() * dados.pokemon.length)]);
  }
  const alvo = decodeURIComponent(chave).toLowerCase();
  const achado = dados.pokemon.find((p) => String(p.id) === alvo || p.nome === alvo);
  return achado ? json(res, 200, achado) : json(res, 404, { erro: `Não achei "${alvo}" entre os 151 de Kanto.` });
}

async function estatico(caminho, res) {
  const seguro = normalize(caminho).replace(/^(\.\.[/\\])+/, "");
  const arquivo = join(RAIZ, seguro.endsWith("/") ? `${seguro}index.html` : seguro);
  if (!arquivo.startsWith(RAIZ) || arquivo.includes(`${RAIZ}server`)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const conteudo = await readFile(arquivo);
    res.writeHead(200, { "Content-Type": TIPOS_MIME[extname(arquivo)] ?? "application/octet-stream" });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Não encontrado");
  }
}

createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  if (req.method !== "GET") return json(res, 405, { erro: "Só GET por aqui." });
  if (pathname.startsWith("/api")) return api(pathname, res);
  return estatico(pathname, res);
}).listen(PORTA, () => console.log(`Pokédex rodando em http://localhost:${PORTA}`));
