import { cut } from '@node-rs/jieba'

function computeTF(words: string[]) {
    let tf: { [term: string]: number } = {};//词频
    let wordCount = words.length;//文档中词的总数

    words.forEach((word) => {//计算words中每个词出现的次数
        if (!tf[word]) {
            tf[word] = 0;
        }
        tf[word] += 1;
    });

    for (let word in tf) {//计算words中每个词的词频
        tf[word] = tf[word] / wordCount;
    }

    return tf;
}

function computeIDF(words: string[], docs: string[]) {
    let idf: { [term: string]: number } = {};//逆文档频率
    let numDocs = docs.length;//文档总数
    let uniqueWords = Array.from(new Set(words));//去重

    uniqueWords.forEach(word => {//计算words中每个词在多少个文档中出现过
        if (!idf[word]) {
            idf[word] = 0;
        }
        docs.forEach(doc => {
            if (doc.includes(word)) {
                idf[word] += 1;
            }
        });
    });

    for (let word in idf) {//计算words中每个词的逆文档频率
        idf[word] = Math.log(numDocs / (idf[word] + 1));
    }

    return idf;
}

function computeTFIDF(tf:{[term: string]: number}, idf:{[term: string]: number}) {
    let tfidf: { [term: string]: number } = {};//TF-IDF

    for (let word in tf) {//计算每个词的TF-IDF
        tfidf[word] = tf[word] * idf[word];
    }

    return tfidf;
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const docWords = cut(body.doc)
    // console.log(docWords)

    const tfDocs = computeTF(docWords);
    // console.log(tfDocs)
    const idf = computeIDF(docWords, body.docs);
    // console.log(idf)
    const tfidfDocs = computeTFIDF(tfDocs, idf);
    // console.log(tfidfDocs)

    return {
        documents: tfidfDocs
    };
});
