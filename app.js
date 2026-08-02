// Passo 5: buscar qualquer Pokémon

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

// --- fazer o botão e o Enter funcionarem ---
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

// mostra um logo de cara pra tela não começar vazia
buscarPokemon("pikachu");