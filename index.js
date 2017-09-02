var fs = require("fs");
var LDA = require('./lda');

var data = require('./data.json');

let corpus = new LDA.Corpus(data);
let model = new LDA.Model(corpus, 50, 0.1, 0.02);

model.fit(100);

const topicProbs = corpus.getTopicProbs();
const wordProbs = corpus.getWordProbs();

i = 0;
for (let probs of topicProbs) {
  console.log(data[i].name + "\t" + JSON.stringify(probs));
  i++;
}

i = 0;
let topicDoc = []
for (let k = 0; k < 50; k++) {
  topicDoc[k] = [];
  let j = 0;
  for (let probs of topicProbs) {
    topicDoc[k].push({ pokemon: j, probs: probs[k]});
    j++;
  }
}

i = 0;
for (let probs of wordProbs) {
  console.log("=== topic " + i)
  let j = 0;
  for (let move of probs) {
    moveId = parseInt(move.word) - 1;
    console.log(moves[moveId].name + "(" + moves[moveId].type + ")"　+ " : " + move.prob);
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
    console.log(data[doc[j].pokemon].name+ "(" + data[doc[j].pokemon].type.join(',') + ")" + "\t" + doc[j].probs);
  }
  i++;
}
