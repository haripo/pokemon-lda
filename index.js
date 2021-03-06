const fs = require('fs');
const LDA = require('./lda');

let data = require('./data/corpus.json');
const pokemons = require('./data/pokemons.json');
const moves = require('./data/moves.json');

const topics = 25;
const alpha = 0.05;
const beta = 0.005;

let corpus = new LDA.Corpus(data);
let model = new LDA.Model(corpus, topics, alpha, beta)
let estimator = new LDA.GibbsSamplingEstimator(corpus, model);

estimator.fit(2000);

const topicProbs = model.getTopicProbs(alpha, topics);
const wordProbs = model.getWordProbs(beta);

let pokemonTopics = topicProbs.map((probs, index) => {
  return {
    id: pokemons[index].id,
    pokemon: pokemons[index].name,
    probs: probs
  }
});

let topicPokemons = []
for (let k = 0; k < topics; k++) {
  topicPokemons[k] = topicProbs
    .map((probs, pokemon) => {
      return { prob: (probs[k] || 0), pokemon }
    })
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 10)
    .map(item => {
      const index = corpus.idToDocument(item.pokemon) - 1;
      return {
        name: pokemons[index].name,
        type: pokemons[index].type.join(','),
        prob: item.prob.toFixed(4)
      }
    });
}

let topicMoves = []
for (let k = 0; k < topics; k++) {
  topicMoves[k] = wordProbs[k]
    .map(pair => {
      return { prob: pair.prob, move: parseInt(pair.word) }
    })
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 10)
    .map(item => {
      const index = corpus.idToWord(item.move) - 1;
      return {
        name: moves[index].name,
        type: moves[index].type,
        prob: item.prob.toFixed(4)
      }
    });
}

fs.writeFileSync("pokemon_topics.json", JSON.stringify(pokemonTopics, null, 2));
fs.writeFileSync("topic_pokemons.json", JSON.stringify(topicPokemons, null, 2));
fs.writeFileSync("topic_moves.json", JSON.stringify(topicMoves, null, 2));
