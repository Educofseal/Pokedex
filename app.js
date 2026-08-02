// --- buscar e mostrar UM Pokémon ---

async function buscarPokemon(nome) {
  const caixa = document.getElementById("pokemon");
  try {
    const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${nome}`);
    if (!resposta.ok) throw new Error("não encontrado");
    const dados = await resposta.json();
    mostrarPokemon(dados);
  } catch (erro) {
    caixa.innerHTML = `<p class="erro">Não achei "${nome}". Confere o nome?</p>`;
  }
}

function mostrarPokemon(dados) {
  const caixa = document.getElementById("pokemon");
  const tipos = dados.types.map(t => t.type.name).join(", ");
  caixa.innerHTML = `
    <div class="card">
      <img src="${dados.sprites.front_default}" alt="${dados.name}">
      <h2>#${dados.id} ${dados.name}</h2>
      <p>Tipos: ${tipos}</p>
    </div>
  `;
}

// --- botão e Enter ---
const campo = document.getElementById("campoBusca");
const botao = document.getElementById("botaoBusca");

function fazerBusca() {
  const nome = campo.value.trim().toLowerCase();
  if (nome) buscarPokemon(nome);
}

botao.addEventListener("click", fazerBusca);
campo.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fazerBusca();
});

// --- grade dos 151 ---
async function carregarGrade() {
  const grade = document.getElementById("grade");
  grade.innerHTML = "<p>Carregando os 151...</p>";

  const promessas = [];
  for (let id = 1; id <= 151; id++) {
    promessas.push(
      fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => r.json())
    );
  }

  const lista = await Promise.all(promessas);

  grade.innerHTML = lista.map(p => `
    <div class="mini-card" data-nome="${p.name}">
      <img src="${p.sprites.front_default}" alt="${p.name}">
      <span class="num">#${p.id}</span>
      <span class="nome">${p.name}</span>
    </div>
  `).join("");
}

// --- iniciar ---
buscarPokemon("pikachu");
carregarGrade();
// --- clicar num card da grade mostra ele em cima ---
document.getElementById("grade").addEventListener("click", (e) => {
  const card = e.target.closest(".mini-card");
  if (!card) return;
  const nome = card.dataset.nome;
  buscarPokemon(nome);
  window.scrollTo({ top: 0, behavior: "smooth" });
});