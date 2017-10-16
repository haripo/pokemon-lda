var Random = require('random-js')

class Matrix {
  constructor(row, column) {
    this.data = [];
    for (let i = 0; i < row; i++) {
      this.data.push([]);
      for (let j = 0; j < column; j++) {
        this.data[i].push(0);
      }
    }
  }

  get(row, column) {
    return this.data[row][column];
  }

  increment(row, column) {
    this.data[row][column] += 1;
  }

  decrement(row, column) {
    this.data[row][column] -= 1;
  }
};

class Corpus {
  constructor(terms) {
    this.terms = terms;

    this.random = Random.engines.mt19937();
    this.random.seed(1);

    this.numVocabulary = 0;
    this.numDocument = 0;

    this.terms.forEach((t) => {
      t.topic = 0;
      if (t.word >= this.numVocabulary) this.numVocabulary = t.word + 1;
      if (t.document >= this.numDocument) this.numDocument = t.document + 1;
    });
  }

  randomizeTopic(numTopic) {
    this.terms.forEach((t) => t.topic = Random.integer(0, numTopic - 1)(this.random));
  }

  getTopicProbs(alpha, numTopic) {
    let result = [];
    for (let term of this.terms) {
      if (!result[term.document]) {
        result[term.document] = [];
      }
      if (!result[term.document][term.topic]) {
        result[term.document][term.topic] = 0
      }
      result[term.document][term.topic] += 1
    }

    for (let i = 0; i < this.numDocument; i++) {
      let sum = 0;
      for (let k in result[i]) {
        sum += result[i][k];
      }
      for (let k in result[i]) {
        result[i][k] = (result[i][k] + alpha) / (sum + alpha * numTopic);
      }
    }
    return result;
  }

  getWordProbs(beta) {
    let result = [];
    for (let term of this.terms) {
      if (!result[term.topic]) {
        result[term.topic] = []
      }
      if (!result[term.topic][term.word]) {
        result[term.topic][term.word] = 0
      }
      result[term.topic][term.word] += 1
    }

    let result2 = [];
    for (let i = 0; i < result.length; i++) {
      result2[i] = [];
      let sum = 0;
      for (let k in result[i]) {
        sum += result[i][k];
      }
      for (let k in result[i]) {
        result2[i].push({ word: k, prob: (result[i][k] + beta) / (sum + beta * this.numVocabulary) });
      }
      result2[i].sort((a, b) => b.prob - a.prob)
    }
    return result2;
  }

  getTopicCoherence() {
    // convert corpus to document-words set
    let words = [];
    this.terms.forEach(term => {
      if (!words[term.document]) {
        words[term.document] = new Set();
      }
      words[term.document].add(term.word);
    });

    const numUseWords = 10;

    let result = [];

    const wordProbs = this.getWordProbs();
    wordProbs.forEach((probs, k) => {

      let topWords = []
      probs.slice(0, numUseWords).forEach(term => {
        topWords.push(parseInt(term.word));
      });
//      console.log(topWords);

      let uMassScores = [];
      for (let i = 0; i < topWords.length; i++) {
        for (let j = i + 1; j < topWords.length; j++) {
          let di = 0;
          let dij = 0;
          for (let d = 0; d < this.numDocument; d++) {
            if (words[d].has(topWords[i])) {
              di += 1;
            }
            if (words[d].has(topWords[i]) && words[d].has(topWords[j])) {
              dij += 1;
            }
          }
          uMassScores.push(Math.log((dij + 1) / di));
        }
      }

      result[k] = uMassScores.sort().slice(5, -5).reduce((a, b) => a + b);
    });

    return result;
  }
}

class Model {
  constructor(corpus, numTopic, alpha, beta) {
    this.random = Random.engines.mt19937();
    this.random.seed(1);
    this.corpus = corpus;
    this.numTopic = numTopic;

    this.alpha = alpha;
    this.beta = beta;

    this.num_vk = new Matrix(this.corpus.numVocabulary, this.numTopic);
    this.num_k = new Matrix(this.numTopic, 1);
    this.num_dk = new Matrix(this.corpus.numDocument, this.numTopic);
    this.num_d = new Matrix(this.corpus.numDocument, 1);
  }

  initializeCounter() {
    for (let term of this.corpus.terms) {
      this.num_vk.increment(term.word, term.topic);
      this.num_k.increment(term.topic, 0);
      this.num_dk.increment(term.document, term.topic);
      this.num_d.increment(term.document, 0);
    }
  }

  fit(iteration) {
    this.corpus.randomizeTopic(this.numTopic);
    this.initializeCounter();
    for (let i = 0; i < iteration; i++) {
      this.iterate();
      console.log("iteration: %d, perplexity: %d", i, this.calcPerplexity());
    }
  }

  iterate() {
    for (let term of this.corpus.terms) {
      let sumOfProbability = 0;
      let probabilities = [];
      let nextTopic = 0;

      this.num_vk.decrement(term.word, term.topic);
      this.num_k.decrement(term.topic, 0);
      this.num_dk.decrement(term.document, term.topic);

      for (let k = 0; k < this.numTopic; k++) {
        const t = this.num_k.get(k, 0);
        const d = this.num_d.get(term.document, 0);
        const wt = this.num_vk.get(term.word, k);
        const dt = this.num_dk.get(term.document, k);
        const probability =
          (wt + this.beta) * (dt + this.alpha) /
          ((t + this.beta * this.corpus.numVocabulary) * (d + this.alpha * this.numTopic));
        sumOfProbability += probability;

        probabilities.push(probability);
      }

      let threshold = Random.real(0, sumOfProbability)(this.random);
      for (let k = 0; k < this.numTopic; k++) {
        threshold -= probabilities[k];
        if (threshold < 0) {
          nextTopic = k;
          break;
        }
      }

      term.topic = nextTopic;

      this.num_vk.increment(term.word, term.topic);
      this.num_k.increment(term.topic, 0);
      this.num_dk.increment(term.document, term.topic);
    }
  }

  calcPerplexity() {
    let result = 0;
    for (let term of this.corpus.terms) {
      let prob_sum = 0;
      for (let i = 0; i < this.numTopic; i++) {
        let t = this.num_k.get(i, 0);
        let d = this.num_d.get(term.document, 0);
        let wt = this.num_vk.get(term.word, i);
        let dt = this.num_dk.get(term.document, i);
        prob_sum +=
          (wt + this.beta) * (dt + this.alpha) /
          ((t + this.beta * this.corpus.numVocabulary) * (d + this.alpha * this.numTopic));
      }
      result -= Math.log(prob_sum);
    }
    return Math.exp(result / this.corpus.terms.length);
  }
}

module.exports = {
  Model: Model,
  Corpus: Corpus,
};
