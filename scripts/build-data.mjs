// Gera data/pokedex.json com tudo que o site precisa (151 de Kanto + tabela de tipos).
// Roda no GitHub Actions a cada deploy, mas também funciona local: `npm run build:data`.
// Usa o espelho estático da PokéAPI no GitHub (mesmos dados, sem limite de requisições).

import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://raw.githubusercontent.com/PokeAPI/api-data/master/data/api/v2";
const TOTAL = 151;

const idDaUrl = (url) => Number(url.split("/").filter(Boolean).pop());

async function pegar(caminho, tentativas = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(`${BASE}/${caminho}/index.json`);
      if (!r.ok) throw new Error(`${r.status} em ${caminho}`);
      return await r.json();
    } catch (erro) {
      if (i >= tentativas) throw erro;
      await new Promise((ok) => setTimeout(ok, 500 * 2 ** i));
    }
  }
}

// roda `tarefa` para cada item, no máximo `limite` ao mesmo tempo
async function emLotes(itens, limite, tarefa) {
  const saida = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      saida[i] = await tarefa(itens[i]);
    }
  };
  await Promise.all(Array.from({ length: limite }, trabalhador));
  return saida;
}

const limparTexto = (t) =>
  t.replace(/[\f\n\r\u00ad]+/g, " ").replace(/POKéMON/g, "Pokémon").replace(/\s+/g, " ").trim();

function comoEvolui(detalhes) {
  const d = detalhes?.[0];
  if (!d) return null;
  return {
    gatilho: d.trigger?.name ?? null,
    nivel: d.min_level ?? null,
    item: d.item?.name ?? null,
    amizade: d.min_happiness ?? null,
  };
}

// achata a árvore de evolução em estágios: [[bulbasaur], [ivysaur], [venusaur]]
function estagiosDaCadeia(no, profundidade = 0, estagios = []) {
  (estagios[profundidade] ??= []).push({
    id: idDaUrl(no.species.url),
    nome: no.species.name,
    como: comoEvolui(no.evolution_details),
  });
  no.evolves_to.forEach((filho) => estagiosDaCadeia(filho, profundidade + 1, estagios));
  return estagios;
}

async function main() {
  const ids = Array.from({ length: TOTAL }, (_, i) => i + 1);
  console.log(`Baixando ${TOTAL} Pokémon e espécies...`);

  const brutos = await emLotes(ids, 16, async (id) => {
    const [p, s] = await Promise.all([pegar(`pokemon/${id}`), pegar(`pokemon-species/${id}`)]);
    return { p, s };
  });

  const cadeiasIds = [...new Set(brutos.map(({ s }) => idDaUrl(s.evolution_chain.url)))];
  console.log(`Baixando ${cadeiasIds.length} cadeias de evolução...`);
  const cadeias = new Map(
    await emLotes(cadeiasIds, 16, async (id) => [id, estagiosDaCadeia((await pegar(`evolution-chain/${id}`)).chain)])
  );

  console.log("Baixando tabela de tipos...");
  const nomesTipos = ["normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground",
    "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"];
  const tipos = {};
  // o espelho só indexa tipos por número (1 = normal ... 18 = fairy)
  const idsTipos = Array.from({ length: 18 }, (_, i) => i + 1);
  for (const t of await emLotes(idsTipos, 6, (id) => pegar(`type/${id}`))) {
    const r = t.damage_relations;
    const nomes = (lista) => lista.map((x) => x.name).filter((n) => nomesTipos.includes(n));
    tipos[t.name] = { dobro: nomes(r.double_damage_to), metade: nomes(r.half_damage_to), nada: nomes(r.no_damage_to) };
  }

  const pokemon = brutos.map(({ p, s }) => {
    const textos = s.flavor_text_entries.filter((f) => f.language.name === "en");
    return {
      id: p.id,
      nome: p.name,
      tipos: p.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      altura: p.height / 10, // metros
      peso: p.weight / 10, // kg
      stats: p.stats.map((x) => x.base_stat), // hp, atk, def, spa, spd, spe
      habilidades: p.abilities.map((a) => ({ nome: a.ability.name, oculta: a.is_hidden })),
      especie: s.genera.find((g) => g.language.name === "en")?.genus ?? "",
      registro: textos.length ? limparTexto(textos[0].flavor_text) : "",
      captura: s.capture_rate,
      lendario: s.is_legendary,
      mitico: s.is_mythical,
      habitat: s.habitat?.name ?? null,
      cor: s.color?.name ?? null,
      evolucao: cadeias.get(idDaUrl(s.evolution_chain.url)),
    };
  });

  await mkdir("data", { recursive: true });
  const saida = { fonte: "https://pokeapi.co", tipos, pokemon }; // sem data de geração: assim o arquivo só muda quando os dados mudam
  const texto = JSON.stringify(saida);
  await writeFile("data/pokedex.json", texto); // usado pelo backend (server/server.js)
  await writeFile("data/pokedex.js", `window.POKEDEX = ${texto};\n`); // usado pelo site; funciona até abrindo o index.html direto
  console.log(`Pronto: data/pokedex.json e data/pokedex.js (${pokemon.length} Pokémon).`);
}

main().catch((erro) => {
  console.error("Falhou ao gerar os dados:", erro.message);
  process.exit(1);
});
