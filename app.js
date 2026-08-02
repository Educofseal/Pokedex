// Passo 3: buscar um Pokémon e ver no console
async function buscarPokemon(nome) {
  const resposta = await fetch(`https://pokeapi.co/api/v2/pokemon/${nome}`);
  const dados = await resposta.json();
  console.log(dados);          // mostra tudo
  console.log("Nome:", dados.name);
  console.log("ID:", dados.id);
  console.log("Sprite:", dados.sprites.front_default);
}

buscarPokemon("pikachu");