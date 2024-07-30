interface VecType{//自定义向量类型
    documents: {
        [x: string]: number;
        [x: number]: number;
    };
}

function product(queryVec: VecType, docVec: VecType){//计算两个向量的点积
    let result = 0;

    for (const key in queryVec.documents) {
        if (queryVec.documents.hasOwnProperty(key)) {//寻找queryVec和docVec中共有的条目，模拟点积的效果
            const queryValue = queryVec.documents[key];
            const docValue = docVec.documents[key] || 0; // 如果docVec中没有对应的条目，则使用 0
            result += queryValue * docValue;
        }
    }

    return result;
}

function queryModulus(queryVec: VecType){//计算查询向量的模
    let result = 0;
    for (const key in queryVec.documents) {
        if (queryVec.documents.hasOwnProperty(key)) {
            const queryValue = queryVec.documents[key];
            result += queryValue * queryValue;
        }
    }
    return Math.sqrt(result);
}

function docModulus(docVec: VecType){//计算文档向量的模
    let result = 0;
    for (const key in docVec.documents) {
        if (docVec.documents.hasOwnProperty(key)) {
            const docValue = docVec.documents[key];
            result += docValue * docValue;
        }
    }
    return Math.sqrt(result);
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const queryVec = body.TF_IDF_query;
    const docVec = body.TF_IDF_docs;
    let result: number[] = [];

    for (let i = 0; i < docVec.length; i++) {
        result[i] = product(queryVec, docVec[i]) / (queryModulus(queryVec) * docModulus(docVec[i]));//计算余弦相似度
        // console.log(result[i]);
    }

    return {
        result: result
    };
});