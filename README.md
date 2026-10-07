# Pokédex Web

> Quis entender como consumir uma API pública direto do navegador — buscar, tratar erro, carregar muita coisa sem travar a página. Virou uma Pokédex dos 151 de Kanto.

`JavaScript` · `HTML` · `CSS` · `PokéAPI` · `sem frameworks`

**Demo ao vivo:** https://educofseal.github.io/Pokedex/

---

## O que me fez construir
Eu já tinha mexido com API em projeto desktop, mas queria entender o mesmo problema no navegador: como buscar dados de forma assíncrona, lidar com o que dá errado, e carregar 151 Pokémon sem a página congelar.

## Como funciona
- Busca por nome ou número, direto da [PokéAPI](https://pokeapi.co).
- Grade com os 151 Pokémon de Kanto, carregados **em paralelo**.
- Clicar em qualquer um da grade abre ele em detalhe.
- Feito com JavaScript puro — sem framework, sem build.

## O desafio que me prendeu
Carregar 151 Pokémon um por um travava tudo. Aprendi a disparar todas as requisições ao mesmo tempo com `Promise.all` e esperar o conjunto — a página passou a carregar em ~1s em vez de dezenas. Também tratei o caso de busca inválida com `try/catch`, pra nunca quebrar a tela.

## O que aprendi
Requisições assíncronas e paralelismo na prática (`async/await`, `Promise.all`), tratamento de erro de rede, e uma técnica limpa de lidar com muitos cliques usando um só listener (event delegation).

---

## Rodar local
Abra o `index.html` no navegador (ou use a extensão Live Server no VS Code).

## Licença
MIT