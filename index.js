var fs = require("fs");
var LDA = require('./lda');

var data = require('./data.json');
var pokemonNames = require('./pokemon_names.json');
var moveNames = require('./moves.json');

let topics = 50;
let corpus = new LDA.Corpus(data);
let model = new LDA.Model(corpus, topics, 0.01, 0.01);

model.fit(1000);

const topicProbs = corpus.getTopicProbs();
const wordProbs = corpus.getWordProbs();

console.log(topicProbs.length);
console.log(wordProbs.length);
console.log(pokemonNames.length);
console.log(moveNames.length);

i = 0;
for (let probs of topicProbs) {
  console.log(i + "\t" + pokemonNames[i] + "\t" + JSON.stringify(probs));
  i++;
}

i = 0;
let topicDoc = []
for (let k = 0; k < topics; k++) {
  topicDoc[k] = [];
  let j = 0;
  for (let probs of topicProbs) {
    topicDoc[k].push({
      pokemon: pokemonNames[j],
      probs: probs[k]
    });
    j++;
  }
}

i = 0;
for (let probs of wordProbs) {
  console.log("=== topic " + i)
  let j = 0;
  for (let move of probs) {
    moveId = parseInt(move.word);
    console.log(moveNames[moveId].name + "(" + /*moves[moveId].type + */")"　+ " : " + move.prob);
    j++;
    if (j > 10) break;
  }
  i++;
}


i = 0;
for (let doc of topicDoc) {
  console.log("--- topic " + i);
  doc.sort((a, b) => {
    if (!a.probs) a.probs = 0;
    if (!b.probs) b.probs = 0;
    return b.probs - a.probs;
  });
  for (let j = 0; j < 10; j++) {
    console.log(doc[j].pokemon + "("/* + data[doc[j].pokemon].type.join(',')*/ + ")" + "\t" + doc[j].probs);
  }
  i++;
}
