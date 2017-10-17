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
    this.wordIdMap = new Map();
    this.wordIdRevMap = new Map();
    this.documentIdMap = new Map();
    this.documentIdRevMap = new Map();

    this.terms = this.convert(terms);

    this.numVocabulary = 0;
    this.numDocument = 0;
    this.terms.forEach((t) => {
      t.topic = 0;
      if (t.word >= this.numVocabulary) this.numVocabulary = t.word + 1;
      if (t.document >= this.numDocument) this.numDocument = t.document + 1;
    });
  }

  convert(terms) {
    return terms.map(d => {
      d.word = this.wordToId(d.word);
      d.document = this.documentToId(d.document);
      return d;
    })
  }

  wordToId(word) {
    if (!this.wordIdMap.has(word)) {
      const id = this.wordIdMap.size;
      this.wordIdMap.set(word, id);
      this.wordIdRevMap.set(id, word);
    }
    return this.wordIdMap.get(word);
  }

  documentToId(document) {
    if (!this.documentIdMap.has(document)) {
      const id = this.documentIdMap.size;
      this.documentIdMap.set(document, id);
      this.documentIdRevMap.set(id, document);
    }
    return this.documentIdMap.get(document);
  }

  idToWord(id) { return this.wordIdRevMap.get(id); }
  idToDocument(id) { return this.documentIdRevMap.get(id); }
}

class Model {
  constructor(corpus, numTopic, alpha, beta) {
    this.numTopic = numTopic;
    this.alpha = alpha;
    this.beta = beta;
    this.corpus = corpus;
  }

  getTopicProbs() {
    let result = [];
    for (let term of this.corpus.terms) {
      if (!result[term.document]) {
        result[term.document] = [];
      }
      if (!result[term.document][term.topic]) {
        result[term.document][term.topic] = 0
      }
      result[term.document][term.topic] += 1
    }

    for (let i = 0; i < this.corpus.numDocument; i++) {
      let sum = 0;
      for (let k in result[i]) {
        sum += result[i][k];
      }
      for (let k in result[i]) {
        result[i][k] = (result[i][k] + this.alpha) / (sum + this.alpha * this.numTopic);
      }
    }
    return result;
  }

  getWordProbs() {
    let topicWordCount = [];
    for (let term of this.corpus.terms) {
      if (!topicWordCount[term.topic]) {
        topicWordCount[term.topic] = []
      }
      if (!topicWordCount[term.topic][term.word]) {
        topicWordCount[term.topic][term.word] = 0
      }
      topicWordCount[term.topic][term.word] += 1
    }

    let result = [];
    for (let i = 0; i < topicWordCount.length; i++) {
      result[i] = [];
      let sum = 0;
      for (let k in topicWordCount[i]) {
        sum += topicWordCount[i][k];
      }
      for (let k in topicWordCount[i]) {
        result[i].push({
          word: k,
          prob: (topicWordCount[i][k] + this.beta)
            / (sum + this.beta * this.corpus.numVocabulary)
        });
      }
      result[i].sort((a, b) => b.prob - a.prob)
    }
    return result;
  }
}

class GibbsSamplingEstimator {
  constructor(corpus, model) {
    this.random = Random.engines.mt19937();
    this.random.seed(1);

    this.corpus = corpus;
    this.terms = corpus.terms;
    this.numTopic = model.numTopic;
    this.alpha = model.alpha;
    this.beta = model.beta;

    this.num_vk = new Matrix(this.corpus.numVocabulary, this.numTopic);
    this.num_k = new Matrix(this.numTopic, 1);
    this.num_dk = new Matrix(this.corpus.numDocument, this.numTopic);
    this.num_d = new Matrix(this.corpus.numDocument, 1);
  }

  randomizeTopic(numTopic) {
    this.terms.forEach((t) => t.topic = Random.integer(0, numTopic - 1)(this.random));
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
    this.randomizeTopic(this.numTopic);
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
  Model, Corpus, GibbsSamplingEstimator
};
