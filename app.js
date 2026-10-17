// Pokédex Kanto — JavaScript puro.
// Os dados (151 Pokémon + tabela de tipos) chegam prontos em window.POKEDEX,
// gerados por scripts/build-data.mjs. Daqui pra baixo é só interface.

const { pokemon: TODOS, tipos: TABELA } = window.POKEDEX;
const POR_ID = new Map(TODOS.map((p) => [p.id, p]));
const POR_NOME = new Map(TODOS.map((p) => [p.nome, p]));

// ---------- textos e imagens ----------

const TIPOS_PT = {
  normal: "Normal", fire: "Fogo", water: "Água", grass: "Planta", electric: "Elétrico", ice: "Gelo",
  fighting: "Lutador", poison: "Venenoso", ground: "Terrestre", flying: "Voador", psychic: "Psíquico",
  bug: "Inseto", rock: "Pedra", ghost: "Fantasma", dragon: "Dragão", dark: "Sombrio", steel: "Aço", fairy: "Fada",
};
const STATS_PT = ["HP", "Ataque", "Defesa", "Atq. Esp.", "Def. Esp.", "Velocidade"];
const HABITAT_PT = {
  cave: "Cavernas", forest: "Florestas", grassland: "Campos", mountain: "Montanhas", rare: "Lugares raros",
  "rough-terrain": "Terreno acidentado", sea: "Mar", urban: "Cidades", "waters-edge": "Beira d'água",
};
const ITENS_PT = {
  "fire-stone": "Pedra do Fogo", "water-stone": "Pedra da Água", "thunder-stone": "Pedra do Trovão",
  "leaf-stone": "Pedra da Folha", "moon-stone": "Pedra da Lua", "sun-stone": "Pedra do Sol",
  "dawn-stone": "Pedra da Alvorada", "shiny-stone": "Pedra Brilhante", "dusk-stone": "Pedra do Anoitecer",
  "ice-stone": "Pedra do Gelo",
};
const NOMES_ESPECIAIS = {
  "nidoran-f": "Nidoran♀", "nidoran-m": "Nidoran♂", "mr-mime": "Mr. Mime", farfetchd: "Farfetch'd",
  "mime-jr": "Mime Jr.", "mr-rime": "Mr. Rime", sirfetchd: "Sirfetch'd",
};

const nomeBonito = (nome) =>
  NOMES_ESPECIAIS[nome] ?? nome.split("-").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
const num = (id) => `#${String(id).padStart(3, "0")}`;
const semAcento = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const decimal = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const img = {
  pixel: (id) => `${SPRITES}/${id}.png`,
  arte: (id) => `${SPRITES}/other/official-artwork/${id}.png`,
  arteShiny: (id) => `${SPRITES}/other/official-artwork/shiny/${id}.png`,
  grito: (id) => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
};

const chipTipo = (t) => `<span class="tipo" style="--cor: var(--t-${t})">${TIPOS_PT[t]}</span>`;

// ---------- progresso salvo no navegador ----------

const salvo = (() => {
  let estado = { vistos: [], recorde: 0, acertos: 0, jogadas: 0, som: true };
  try {
    estado = { ...estado, ...JSON.parse(localStorage.getItem("pokedex-kanto") || "{}") };
  } catch { /* modo anônimo ou storage bloqueado: segue sem salvar */ }
  const vistos = new Set(estado.vistos);
  return {
    estado,
    vistos,
    gravar() {
      try {
        localStorage.setItem("pokedex-kanto", JSON.stringify({ ...estado, vistos: [...vistos] }));
      } catch { /* idem */ }
    },
  };
})();

function avisar(texto) {
  const caixa = document.getElementById("avisos");
  const el = document.createElement("div");
  el.className = "aviso-toast";
  el.textContent = texto;
  caixa.append(el);
  setTimeout(() => el.classList.add("saindo"), 3200);
  setTimeout(() => el.remove(), 3700);
}

const MARCOS_VISTOS = { 1: "Primeiro registro na Pokédex!", 10: "10 vistos — você está pegando o jeito.",
  25: "25 vistos! Um sexto de Kanto.", 50: "50 vistos. O Professor Carvalho está impressionado.",
  100: "100 vistos! Só faltam 51.", 151: "151/151 — Pokédex de Kanto completa! 🏆" };

function marcarVisto(id) {
  if (salvo.vistos.has(id)) return;
  salvo.vistos.add(id);
  salvo.gravar();
  atualizarProgresso();
  document.querySelector(`.mini-card[data-id="${id}"]`)?.classList.add("visto");
  if (MARCOS_VISTOS[salvo.vistos.size]) avisar(MARCOS_VISTOS[salvo.vistos.size]);
}

function atualizarProgresso() {
  const n = salvo.vistos.size;
  document.getElementById("vistosNum").textContent = n;
  document.getElementById("vistosBarra").style.width = `${(n / 151) * 100}%`;
}

// ---------- matemática dos tipos ----------

function multiplicador(ataque, defensores) {
  const t = TABELA[ataque];
  return defensores.reduce((m, d) => m * (t.dobro.includes(d) ? 2 : t.metade.includes(d) ? 0.5 : t.nada.includes(d) ? 0 : 1), 1);
}

function defesa(p) {
  const grupos = { fraco: [], resiste: [], imune: [] };
  for (const atk of Object.keys(TIPOS_PT)) {
    const m = multiplicador(atk, p.tipos);
    if (m > 1) grupos.fraco.push([atk, m]);
    else if (m === 0) grupos.imune.push([atk, m]);
    else if (m < 1) grupos.resiste.push([atk, m]);
  }
  grupos.fraco.sort((a, b) => b[1] - a[1]);
  return grupos;
}

// ---------- curiosidades geradas a partir dos números ----------

const total = (p) => p.stats.reduce((a, b) => a + b, 0);
const RANK_PODER = [...TODOS].sort((a, b) => total(b) - total(a)).map((p) => p.id);
const percentil = (i, valor) => Math.round((TODOS.filter((p) => p.stats[i] < valor).length / (TODOS.length - 1)) * 100);
const chaveTipos = (p) => [...p.tipos].sort().join("+");

function comparaPeso(kg) {
  if (kg < 1) return "mais leve que uma garrafa de 1 litro de água";
  if (kg <= 6) return "mais ou menos o peso de um gato";
  if (kg <= 20) return "o peso de um cachorro de porte médio";
  if (kg <= 45) return "o peso de uma criança de 10 anos";
  if (kg <= 110) return "o peso de um adulto";
  if (kg <= 300) return "o peso de um piano";
  return "mais que um cavalo adulto";
}

function curiosidades(p) {
  const fatos = [];
  const d = defesa(p);
  const quadruplo = d.fraco.find(([, m]) => m === 4);

  const melhor = p.stats.indexOf(Math.max(...p.stats));
  const pct = percentil(melhor, p.stats[melhor]);
  if (pct === 100) fatos.push(`Tem a maior <b>${STATS_PT[melhor]}</b> de todos os 151 de Kanto (${p.stats[melhor]}).`);
  else if (pct >= 50) fatos.push(`Seu ponto forte é <b>${STATS_PT[melhor]}</b>: supera <b>${pct}%</b> dos Pokémon de Kanto.`);

  const posicao = RANK_PODER.indexOf(p.id) + 1;
  if (posicao <= 15) fatos.push(`É o <b>${posicao}º mais poderoso</b> de Kanto em atributos somados (${total(p)}).`);
  else if (posicao >= 137) fatos.push(`Está entre os <b>15 mais fracos</b> de Kanto em atributos (${total(p)}) — mas fofura não entra na conta.`);

  if (quadruplo) fatos.push(`Ponto fraco crítico: golpes de <b>${TIPOS_PT[quadruplo[0]]}</b> causam <b>4× de dano</b>.`);
  if (d.imune.length) fatos.push(`É <b>imune</b> a ${d.imune.map(([t]) => TIPOS_PT[t]).join(" e ")} — esses golpes simplesmente não funcionam.`);

  const iguais = TODOS.filter((o) => chaveTipos(o) === chaveTipos(p)).length;
  if (p.tipos.length === 2 && iguais === 1) fatos.push(`É o <b>único</b> de Kanto com a combinação ${p.tipos.map((t) => TIPOS_PT[t]).join(" + ")}.`);

  if (p.lendario) fatos.push("É um <b>Pokémon lendário</b>: só existe um em todo o jogo.");
  if (p.mitico) fatos.push("É <b>mítico</b>: nos jogos originais, só dava para conseguir em eventos oficiais.");
  else if (p.captura <= 10) fatos.push(`Taxa de captura <b>${p.captura}/255</b>: uma das mais difíceis de todas.`);
  else if (p.captura === 255) fatos.push("Taxa de captura <b>255/255</b>: um dos mais fáceis de pegar.");

  fatos.push(`Pesa ${decimal(p.peso)} kg — ${comparaPeso(p.peso)}.`);
  if (p.altura >= 3.4) fatos.push(`Com ${decimal(p.altura)} m, é <b>${decimal(p.altura / 1.7)}× mais alto</b> que uma pessoa.`);

  const foraDeKanto = p.evolucao.flat().filter((e) => e.id > 151);
  if (foraDeKanto.length) {
    fatos.push(`Tem parentes de outras regiões: <b>${foraDeKanto.map((e) => nomeBonito(e.nome)).join(", ")}</b>.`);
  }
  const oculta = p.habilidades.find((h) => h.oculta);
  if (oculta) fatos.push(`Habilidade oculta: <b>${nomeBonito(oculta.nome)}</b>.`);

  return fatos;
}

// ---------- grito (som) ----------

let audio;
function tocarGrito(id) {
  try {
    audio?.pause();
    audio = new Audio(img.grito(id));
    audio.volume = 0.35;
    audio.play().catch(() => {}); // Safari não toca .ogg: falha em silêncio
  } catch { /* sem áudio, sem problema */ }
}

// ---------- jogo: Quem é esse Pokémon? ----------

const jogo = {
  atual: null,
  respondido: false,
  recentes: [],
  sequencia: 0,
  el: {
    img: document.getElementById("jogoImg"),
    opcoes: document.getElementById("jogoOpcoes"),
    resultado: document.getElementById("jogoResultado"),
    depois: document.getElementById("jogoDepois"),
    curiosidade: document.getElementById("jogoCuriosidade"),
    dica: document.getElementById("jogoDica"),
    som: document.getElementById("jogoSom"),
    card: document.getElementById("jogoCard"),
  },
};

const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];
const embaralhar = (lista) => lista.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

function preCarregar(url) {
  return new Promise((ok) => {
    const i = new Image();
    i.onload = i.onerror = ok;
    i.src = url;
  });
}

let proximoSorteado = null;
function sortearRodada() {
  const livres = TODOS.filter((p) => !jogo.recentes.includes(p.id));
  const alvo = sortear(livres);
  // um dos erros é do mesmo tipo, para não ficar óbvio demais
  const mesmoTipo = TODOS.filter((p) => p.id !== alvo.id && p.tipos[0] === alvo.tipos[0]);
  const erradas = new Set(mesmoTipo.length ? [sortear(mesmoTipo).id] : []);
  while (erradas.size < 3) {
    const r = sortear(TODOS);
    if (r.id !== alvo.id) erradas.add(r.id);
  }
  return { alvo, opcoes: embaralhar([alvo, ...[...erradas].map((id) => POR_ID.get(id))]) };
}

async function novaRodada() {
  const rodada = proximoSorteado ?? sortearRodada();
  await preCarregar(img.arte(rodada.alvo.id));
  proximoSorteado = sortearRodada();
  preCarregar(img.arte(proximoSorteado.alvo.id)); // a próxima já vem carregando

  jogo.atual = rodada.alvo;
  jogo.respondido = false;
  jogo.recentes = [...jogo.recentes, rodada.alvo.id].slice(-30);

  const { el } = jogo;
  el.card.classList.remove("acertou", "errou", "revelado");
  el.img.classList.add("silhueta");
  el.img.src = img.arte(rodada.alvo.id);
  el.img.alt = "Silhueta de um Pokémon misterioso";
  el.resultado.textContent = "";
  el.depois.hidden = true;
  el.dica.disabled = false;
  el.dica.textContent = "Dica: mostrar o tipo";
  el.opcoes.innerHTML = rodada.opcoes
    .map((p, i) => `<button class="opcao" type="button" data-id="${p.id}"><kbd>${i + 1}</kbd>${esc(nomeBonito(p.nome))}</button>`)
    .join("");
}

function responder(id) {
  if (jogo.respondido) return;
  jogo.respondido = true;
  const { atual, el } = jogo;
  const acertou = id === atual.id;
  const s = salvo.estado;

  s.jogadas++;
  if (acertou) {
    s.acertos++;
    jogo.sequencia++;
    if (jogo.sequencia > s.recorde) {
      s.recorde = jogo.sequencia;
      if (s.recorde >= 3) avisar(`Novo recorde: ${s.recorde} seguidas!`);
    }
  } else {
    jogo.sequencia = 0;
  }

  el.opcoes.querySelectorAll(".opcao").forEach((b) => {
    b.disabled = true;
    const bid = Number(b.dataset.id);
    if (bid === atual.id) b.classList.add("certa");
    else if (bid === id) b.classList.add("errada");
  });
  el.card.classList.add("revelado", acertou ? "acertou" : "errou");
  el.img.classList.remove("silhueta");
  el.img.alt = nomeBonito(atual.nome);
  el.resultado.innerHTML = acertou
    ? `É o <b>${esc(nomeBonito(atual.nome))}</b>! ${frasesAcerto(jogo.sequencia)}`
    : `Era o <b>${esc(nomeBonito(atual.nome))}</b>. A sequência zerou.`;
  el.curiosidade.innerHTML = `<span>Você sabia?</span> ${sortear(curiosidades(atual))}`;
  el.depois.hidden = false;
  el.dica.disabled = true;

  if (s.som) tocarGrito(atual.id);
  marcarVisto(atual.id);
  salvo.gravar();
  atualizarPlacar();
  document.getElementById("jogoProximo").focus({ preventScroll: true });
}

function frasesAcerto(seq) {
  if (seq >= 25) return "Nível Mestre Pokémon.";
  if (seq >= 10) return `${seq} seguidas. Isso é raro.`;
  if (seq >= 5) return `${seq} seguidas — você passou da maioria.`;
  if (seq >= 2) return `${seq} seguidas!`;
  return "";
}

function atualizarPlacar() {
  const s = salvo.estado;
  document.getElementById("placarSeq").textContent = jogo.sequencia;
  document.getElementById("placarRecorde").textContent = s.recorde;
  document.getElementById("placarTaxa").textContent = s.jogadas ? `${Math.round((s.acertos / s.jogadas) * 100)}%` : "—";
  jogo.el.som.textContent = `Som: ${s.som ? "ligado" : "desligado"}`;
  jogo.el.som.setAttribute("aria-pressed", String(s.som));
}

async function compartilhar(texto, url = location.href.split("#")[0]) {
  try {
    if (navigator.share) return await navigator.share({ text: texto, url });
    await navigator.clipboard.writeText(`${texto} ${url}`);
    avisar("Link copiado! É só colar para quem você quiser.");
  } catch { /* usuário cancelou */ }
}

function iniciarJogo() {
  const { el } = jogo;
  el.opcoes.addEventListener("click", (e) => {
    const b = e.target.closest(".opcao");
    if (b) responder(Number(b.dataset.id));
  });
  el.dica.addEventListener("click", () => {
    el.dica.innerHTML = `Tipo: ${jogo.atual.tipos.map(chipTipo).join(" ")}`;
    el.dica.disabled = true;
  });
  el.som.addEventListener("click", () => {
    salvo.estado.som = !salvo.estado.som;
    salvo.gravar();
    atualizarPlacar();
  });
  document.getElementById("jogoProximo").addEventListener("click", novaRodada);
  document.getElementById("jogoFicha").addEventListener("click", () => abrirFicha(jogo.atual.nome));
  document.getElementById("jogoDesafiar").addEventListener("click", () => {
    const r = salvo.estado.recorde;
    compartilhar(r ? `Meu recorde no "Quem é esse Pokémon?" é ${r} seguidas. Duvido você bater:` :
      "Você reconhece os 151 Pokémon de Kanto só pela sombra? Testa aqui:");
  });

  document.addEventListener("keydown", (e) => {
    if (document.getElementById("ficha").open || e.target.matches("input, select, textarea")) return;
    const noJogo = el.card.getBoundingClientRect().bottom > 0 && el.card.getBoundingClientRect().top < innerHeight;
    if (!noJogo) return;
    if (!jogo.respondido && ["1", "2", "3", "4"].includes(e.key)) {
      el.opcoes.querySelectorAll(".opcao")[Number(e.key) - 1]?.click();
    } else if (jogo.respondido && e.key === "Enter" && !e.target.matches("button")) {
      novaRodada();
    }
  });

  atualizarPlacar();
  novaRodada();
}

// ---------- Pokémon do dia ----------

function pokemonDoDia() {
  const dia = Math.floor(Date.now() / 86_400_000); // mesma fórmula do backend
  return TODOS[(dia * 2654435761) % TODOS.length];
}

function iniciarDia() {
  const p = pokemonDoDia();
  document.getElementById("diaImg").src = img.arte(p.id);
  document.getElementById("diaImg").alt = nomeBonito(p.nome);
  document.getElementById("diaNome").innerHTML = `${esc(nomeBonito(p.nome))} <small>${num(p.id)}</small>`;
  document.getElementById("diaFato").innerHTML = curiosidades(p)[0];
  document.getElementById("diaCard").style.setProperty("--cor", `var(--t-${p.tipos[0]})`);
  document.getElementById("diaCard").addEventListener("click", () => abrirFicha(p.nome));
}

// ---------- grade + filtros ----------

const filtro = { texto: "", tipo: null, ordem: "id" };

const ORDENS = {
  id: (a, b) => a.id - b.id,
  nome: (a, b) => a.nome.localeCompare(b.nome),
  poder: (a, b) => total(b) - total(a),
  velocidade: (a, b) => b.stats[5] - a.stats[5],
  peso: (a, b) => b.peso - a.peso,
  naovistos: (a, b) => salvo.vistos.has(a.id) - salvo.vistos.has(b.id) || a.id - b.id,
};

function combina(p) {
  if (filtro.tipo && !p.tipos.includes(filtro.tipo)) return false;
  const q = semAcento(filtro.texto.trim().replace(/^#/, ""));
  if (!q) return true;
  if (/^\d+$/.test(q)) return String(p.id).startsWith(String(Number(q)));
  return semAcento(nomeBonito(p.nome)).includes(q) || p.tipos.some((t) => semAcento(TIPOS_PT[t]).startsWith(q));
}

function desenharGrade() {
  const lista = TODOS.filter(combina).sort(ORDENS[filtro.ordem]);
  const grade = document.getElementById("grade");
  document.getElementById("contagem").textContent =
    lista.length === 151 ? "Mostrando todos os 151" : `${lista.length} de 151 encontrados`;

  if (!lista.length) {
    grade.innerHTML = `<li class="vazio">Nenhum Pokémon com "${esc(filtro.texto)}". Tente pelo número (ex: 25) ou por tipo (ex: água).</li>`;
    return;
  }
  grade.innerHTML = lista.map((p) => `
    <li>
      <button class="mini-card${salvo.vistos.has(p.id) ? " visto" : ""}" type="button" data-id="${p.id}"
        style="--cor: var(--t-${p.tipos[0]})" aria-label="${esc(nomeBonito(p.nome))}, ${num(p.id)}">
        <span class="num">${num(p.id)}</span>
        <img src="${img.pixel(p.id)}" alt="" width="96" height="96" loading="lazy" decoding="async">
        <span class="nome">${esc(nomeBonito(p.nome))}</span>
        <span class="tipos-mini">${p.tipos.map((t) => `<i style="--cor: var(--t-${t})" title="${TIPOS_PT[t]}"></i>`).join("")}</span>
      </button>
    </li>`).join("");
}

function iniciarGrade() {
  const filtros = document.getElementById("filtrosTipo");
  filtros.innerHTML = `<button type="button" class="filtro ativo" data-tipo="" aria-pressed="true">Todos</button>` +
    Object.keys(TIPOS_PT).map((t) =>
      `<button type="button" class="filtro" data-tipo="${t}" style="--cor: var(--t-${t})" aria-pressed="false">${TIPOS_PT[t]}</button>`).join("");

  filtros.addEventListener("click", (e) => {
    const b = e.target.closest(".filtro");
    if (!b) return;
    filtro.tipo = b.dataset.tipo || null;
    filtros.querySelectorAll(".filtro").forEach((x) => {
      x.classList.toggle("ativo", x === b);
      x.setAttribute("aria-pressed", String(x === b));
    });
    desenharGrade();
  });

  const campo = document.getElementById("campoBusca");
  campo.addEventListener("input", () => {
    filtro.texto = campo.value;
    desenharGrade();
  });
  campo.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const primeiro = document.querySelector("#grade .mini-card");
    if (primeiro) abrirFicha(POR_ID.get(Number(primeiro.dataset.id)).nome);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !e.target.matches("input, select, textarea") && !document.getElementById("ficha").open) {
      e.preventDefault();
      campo.focus();
    }
  });

  document.getElementById("ordem").addEventListener("change", (e) => {
    filtro.ordem = e.target.value;
    desenharGrade();
  });

  // um único listener para os 151 cards (event delegation)
  document.getElementById("grade").addEventListener("click", (e) => {
    const card = e.target.closest(".mini-card");
    if (card) abrirFicha(POR_ID.get(Number(card.dataset.id)).nome);
  });

  document.getElementById("surpresa").addEventListener("click", () => {
    const naoVistos = TODOS.filter((p) => !salvo.vistos.has(p.id));
    abrirFicha(sortear(naoVistos.length ? naoVistos : TODOS).nome);
  });

  desenharGrade();
}

// ---------- ficha completa ----------

const ficha = document.getElementById("ficha");
const fichaCorpo = document.getElementById("fichaCorpo");
const TITULO_ORIGINAL = document.title;

function rotuloEvolucao(como) {
  if (!como) return "";
  if (como.gatilho === "level-up" && como.nivel) return `Nv. ${como.nivel}`;
  if (como.gatilho === "level-up" && como.amizade) return "Amizade";
  if (como.gatilho === "use-item") return ITENS_PT[como.item] ?? nomeBonito(como.item ?? "Item");
  if (como.gatilho === "trade") return "Troca";
  return "Condição especial";
}

function htmlEvolucao(p) {
  if (p.evolucao.length === 1) return `<p class="muted">Não evolui — e nunca evoluiu de nada.</p>`;
  return `<div class="evolucao">` + p.evolucao.map((estagio, i) => `
    ${i ? `<span class="evo-seta" aria-hidden="true">→</span>` : ""}
    <div class="evo-estagio">
      ${estagio.map((e) => {
        const conteudo = `
          <img src="${img.arte(e.id)}" alt="" width="72" height="72" loading="lazy">
          <span>${esc(nomeBonito(e.nome))}</span>
          ${e.como ? `<small>${esc(rotuloEvolucao(e.como))}</small>` : ""}
          ${e.id > 151 ? `<em>outra região</em>` : ""}`;
        return e.id <= 151
          ? `<button type="button" class="evo${e.id === p.id ? " atual" : ""}" data-nome="${e.nome}">${conteudo}</button>`
          : `<div class="evo fora">${conteudo}</div>`;
      }).join("")}
    </div>`).join("") + `</div>`;
}

function htmlStats(p) {
  const soma = total(p);
  return `
    <ul class="stats">
      ${p.stats.map((v, i) => `
        <li>
          <span>${STATS_PT[i]}</span>
          <b>${v}</b>
          <span class="barra"><span style="--v: ${Math.min(v / 180, 1)}"></span></span>
          <small title="Posição entre os 151">${TODOS.filter((o) => o.stats[i] > v).length + 1}º</small>
        </li>`).join("")}
    </ul>
    <p class="total">Total <b>${soma}</b> · ${RANK_PODER.indexOf(p.id) + 1}º de 151 em poder</p>`;
}

function htmlDefesa(p) {
  const d = defesa(p);
  const lista = (itens) => itens.map(([t, m]) =>
    `<span class="tipo" style="--cor: var(--t-${t})">${TIPOS_PT[t]} <b>${m === 0.25 ? "¼" : m === 0.5 ? "½" : m === 0 ? "0" : m}×</b></span>`).join("");
  return `
    <div class="defesa">
      <div><h4>Fraco contra</h4>${lista(d.fraco) || `<p class="muted">Nada!</p>`}</div>
      <div><h4>Resiste a</h4>${lista(d.resiste) || `<p class="muted">Nada</p>`}</div>
      ${d.imune.length ? `<div><h4>Imune a</h4>${lista(d.imune)}</div>` : ""}
    </div>`;
}

function desenharFicha(p) {
  const anterior = POR_ID.get(p.id === 1 ? 151 : p.id - 1);
  const proximo = POR_ID.get(p.id === 151 ? 1 : p.id + 1);
  const raro = p.lendario ? `<span class="selo selo-ouro">Lendário</span>` : p.mitico ? `<span class="selo selo-ouro">Mítico</span>` : "";

  ficha.style.setProperty("--cor", `var(--t-${p.tipos[0]})`);
  ficha.style.setProperty("--cor2", `var(--t-${p.tipos[1] ?? p.tipos[0]})`);
  fichaCorpo.innerHTML = `
    <header class="ficha-topo">
      <button type="button" class="icone" data-acao="fechar" aria-label="Fechar ficha">✕</button>
      <div class="ficha-nav">
        <button type="button" class="icone" data-nome="${anterior.nome}" aria-label="Anterior: ${esc(nomeBonito(anterior.nome))}">←</button>
        <button type="button" class="icone" data-nome="${proximo.nome}" aria-label="Próximo: ${esc(nomeBonito(proximo.nome))}">→</button>
      </div>
    </header>

    <div class="ficha-hero">
      <div class="ficha-arte">
        <img id="fichaImg" src="${img.arte(p.id)}" alt="${esc(nomeBonito(p.nome))}" width="280" height="280">
      </div>
      <div class="ficha-id">
        <span class="num-grande">${num(p.id)}</span>
        <h2 id="fichaNome">${esc(nomeBonito(p.nome))}</h2>
        <p class="especie">${esc(p.especie)} ${raro}</p>
        <div class="tipos">${p.tipos.map(chipTipo).join("")}</div>
        <div class="ficha-botoes">
          <button type="button" class="btn" data-acao="grito">▶ Ouvir o grito</button>
          <button type="button" class="btn" data-acao="shiny" aria-pressed="false">✦ Versão shiny</button>
          <button type="button" class="btn" data-acao="compartilhar">Compartilhar</button>
        </div>
      </div>
    </div>

    <section class="ficha-bloco">
      <h3>Você sabia?</h3>
      <ul class="fatos">${curiosidades(p).slice(0, 5).map((f) => `<li>${f}</li>`).join("")}</ul>
    </section>

    <section class="ficha-bloco">
      <h3>Atributos base</h3>
      ${htmlStats(p)}
    </section>

    <section class="ficha-bloco">
      <h3>Em batalha</h3>
      ${htmlDefesa(p)}
    </section>

    <section class="ficha-bloco">
      <h3>Evolução</h3>
      ${htmlEvolucao(p)}
    </section>

    <section class="ficha-bloco">
      <h3>Dados</h3>
      <dl class="dados">
        <div><dt>Altura</dt><dd>${decimal(p.altura)} m</dd></div>
        <div><dt>Peso</dt><dd>${decimal(p.peso)} kg</dd></div>
        <div><dt>Habitat</dt><dd>${HABITAT_PT[p.habitat] ?? "Desconhecido"}</dd></div>
        <div><dt>Captura</dt><dd>${p.captura}/255</dd></div>
        <div class="largo"><dt>Habilidades</dt><dd>${p.habilidades.map((h) => esc(nomeBonito(h.nome)) + (h.oculta ? " <small>(oculta)</small>" : "")).join(", ")}</dd></div>
      </dl>
      ${p.registro ? `<blockquote class="registro"><p>“${esc(p.registro)}”</p><cite>Registro original da Pokédex (em inglês)</cite></blockquote>` : ""}
    </section>`;

  fichaCorpo.scrollTop = 0;
  document.title = `${nomeBonito(p.nome)} ${num(p.id)} · Pokédex Kanto`;
  marcarVisto(p.id);
}

function abrirFicha(nome) {
  if (location.hash === `#/${nome}`) mostrarDoHash();
  else location.hash = `/${nome}`; // vira link compartilhável; o hashchange abre a ficha
}

function mostrarDoHash() {
  const nome = decodeURIComponent(location.hash.slice(2)).toLowerCase();
  const p = POR_NOME.get(nome) ?? POR_ID.get(Number(nome));
  if (!location.hash.startsWith("#/") || !p) {
    if (ficha.open) ficha.close();
    return;
  }
  desenharFicha(p);
  if (!ficha.open) ficha.showModal();
}

function iniciarFicha() {
  fichaCorpo.addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-nome], [data-acao]");
    if (!alvo) return;
    if (alvo.dataset.nome) return abrirFicha(alvo.dataset.nome);

    const p = POR_NOME.get(location.hash.slice(2));
    const acao = alvo.dataset.acao;
    if (acao === "fechar") ficha.close();
    if (acao === "grito") tocarGrito(p.id);
    if (acao === "compartilhar") compartilhar(`Olha o ${nomeBonito(p.nome)} na Pokédex Kanto:`, location.href);
    if (acao === "shiny") {
      const ligado = alvo.getAttribute("aria-pressed") !== "true";
      alvo.setAttribute("aria-pressed", String(ligado));
      document.getElementById("fichaImg").src = ligado ? img.arteShiny(p.id) : img.arte(p.id);
    }
  });

  // clicar fora da ficha (no fundo escuro) fecha
  ficha.addEventListener("click", (e) => {
    if (e.target === ficha) ficha.close();
  });
  ficha.addEventListener("close", () => {
    document.title = TITULO_ORIGINAL;
    if (location.hash.startsWith("#/")) history.replaceState(null, "", location.pathname + location.search);
  });
  ficha.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    fichaCorpo.querySelectorAll(".ficha-nav [data-nome]")[e.key === "ArrowLeft" ? 0 : 1].click();
  });

  window.addEventListener("hashchange", mostrarDoHash);
  mostrarDoHash(); // quem chega por um link #/pikachu já cai na ficha
}

// ---------- iniciar ----------

atualizarProgresso();
iniciarJogo();
iniciarDia();
iniciarGrade();
iniciarFicha();
