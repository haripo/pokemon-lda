var fs = require("fs");
var LDA = require('./lda');

var data = require('./data/corpus.json');
var pokemons = require('./data/pokemons.json');
var moves = require('./data/moves.json');

let wordIdMap = new Map();
let wordIdRevMap = new Map();

let documentIdMap = new Map();
let documentIdRevMap = new Map();

data.forEach(term => {
  if (!wordIdMap.has(term.word)) {
    const id = wordIdMap.size;
    wordIdMap.set(term.word, id);
    wordIdRevMap.set(id, term.word);
  }
  if (!documentIdMap.has(term.document)) {
    const id = documentIdMap.size;
    documentIdMap.set(term.document, id);
    documentIdRevMap.set(id, term.document);
  }
});

data = data.map(d => {
  d.word = wordIdMap.get(d.word);
  d.document = documentIdMap.get(d.document);
  return d;
})

let topics = 25;
let corpus = new LDA.Corpus(data);
let alpha = 0.05;
let beta = 0.005;
let model = new LDA.Model(corpus, topics, alpha, beta);

model.fit(2000);

const topicProbs = corpus.getTopicProbs(alpha, topics);
const wordProbs = corpus.getWordProbs(beta);

topicProbs.forEach((probs, i) => {
  console.log(i + "\t" + pokemons[i].name + "\t" + JSON.stringify(probs));
});

let topicDoc = []
for (let k = 0; k < topics; k++) {
  topicDoc[k] = [];
  topicProbs.forEach((probs, j) => {
    topicDoc[k].push({
      pokemon: j,
      probs: probs[k]
    });
  });
}

const coherences = corpus.getTopicCoherence()
  .map((coherence, topic) => { return { coherence, topic } });

coherences.sort((a, b) => a.coherence - b.coherence);

coherences.forEach(coherence => {
  const k = coherence.topic;
  const probs = wordProbs[k];
  const doc = topicDoc[k];

  console.log("\n=== topic " + k)
  console.log("coherence: " + coherence.coherence);
  console.log("- top moves")
  probs.slice(0, 10).forEach((move, j) => {
    const moveId = wordIdRevMap.get(parseInt(move.word));
    console.log([
      moves[moveId - 1].name,
      moves[moveId - 1].type,
      move.prob.toFixed(4)
    ].join(' & ') + " \\\\");
  });

  console.log("- top pokemons")
  doc.sort((a, b) => {
    if (!a.probs) a.probs = 0;
    if (!b.probs) b.probs = 0;
    return b.probs - a.probs;
  });

  for (let j = 0; j < 10; j++) {
    const pokemonId = documentIdRevMap.get(doc[j].pokemon);
    console.log([
      pokemons[pokemonId - 1].name,
      pokemons[pokemonId - 1].type.join(','),
      doc[j].probs.toFixed(4)
    ].join(' & ') + " \\\\");
  }
});

console.log(coherences);
