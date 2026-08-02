// Passo 4: mostrar o Pokémon na tela

async function buscarPokemon(nome) {
  const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${nome}`);
  const dados = await resposta.json();
  mostrarPokemon(dados);
}

function mostrarPokemon(dados) {
  const caixa = document.getElementById("pokemon");

  const tipos = dados.types
    .map(t => t.type.name)
    .join(", ");

  caixa.innerHTML = `
    <div class="card">
      <img src="${dados.sprites.front_default}" alt="${dados.name}">
      <h2>#${dados.id} ${dados.name}</h2>
      <p>Tipos: ${tipos}</p>
    </div>
  `;
}

buscarPokemon("pikachu");