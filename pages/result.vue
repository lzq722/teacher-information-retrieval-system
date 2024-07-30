<template>
  <div>
    <div class="container">
      <div class="mt-4">
        <el-input
          v-model="input"
          style="width: 600px; height: 40px"
          placeholder="输入要搜索的内容"
          class="input"
          clearable
          @keyup.enter="navigateToResult"
        >
          <template #append>
            <el-button :icon="Search" @click="navigateToResult" />
          </template>
        </el-input>
      </div>
    </div>
    <el-row>
      <el-col :span="2"></el-col>
      <el-col :span="11">
        <h2>搜索结果:</h2>
        <div v-if="results.length">
          <p>搜索耗时: {{ timeCost/1000 }}s</p>
          <ul>
            <li v-for="(result, index) in truncatedResults" :key="index" style="padding: 10px;">
              {{ result }}
              <br>
              <el-tag type="success" style="margin-left: 10px;">相似度: {{ values[index] }}</el-tag>
            </li>
          </ul>
        </div>
        <div v-else>
          <p>未找到相关内容</p>
        </div>
      </el-col>
      <el-col :span="1"></el-col>
      <el-col :span="9">
        <h2>大模型响应：</h2>
        <div v-if="response">
          <p>{{ response }}</p>
        </div>
      </el-col>
      <el-col :span="1"></el-col>
    </el-row>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Search } from '@element-plus/icons-vue'

// 初始化数据
const input = ref('')//输入到搜索框内容
const response = ref<string | null>(null)//大模型响应内容
const router = useRouter()
const route = useRoute()
const query = ref(route.query.q || '')//传入大模型的内容
const results = ref<string[]>([])//搜索结果
const values = ref<number[]>([])//搜索结果的相似度
const maxLength = 75;//搜索结果最大长度
const timeCost = ref(0)//搜索耗时
const TF_IDF_docs = ref<Array< {
    documents: {
        [x: string]: number;
        [x: number]: number;
    };
}>>([])//TF-IDF计算结果

const API_KEY = "63923be80b2d43b8972e4d4fdd58397a"// 生成的API_KEY

const navigateToResult = () => {//相当于每次重新搜索刷新页面
  if (input.value.trim()) {
    router.push({ name: 'result', query: { q: input.value } })
  }
}

// 读取文件内容
const loadFiles = async () => {
  const [docsResponse, indexResponse] = await Promise.all([
    fetch('/documents.txt'),
    fetch('/inverted_index.txt')
  ])
  const docsText = await docsResponse.text()
  const indexText = await indexResponse.text()

  const docs = docsText.split('\n')
  const index = parseInvertedIndex(indexText)

  return { docs, index }
}

// 解析倒排索引文件
const parseInvertedIndex = (text: string) => {
  const index: { [term: string]: number[] } = {}
  const lines = text.split('\n')
  lines.forEach(line => {
    let [term, ...docIds] = line.split(' ')
    term=term.replace(':','')
    index[term] = docIds.map(id => parseInt(id))
  })
  return index
}

// 搜索文档
const searchDocuments = async (queryStr: string): Promise<string[]> => {
  const timeStart = Date.now()//开始时间
  const { docs, index } = await loadFiles()
  const terms = await $fetch('/api/cutdoc',{//对搜索内容进行分词
    method: 'POST',
    body: {doc: queryStr}
  })
  console.log(terms)

  const docScores: { [key: string]: number } = {}
  terms.terms.forEach(term => {//计算文档得分
    if (term in index) {
      // console.log(index)
      index[term].forEach((docId: number) => {
        if (!docScores[docId]) docScores[docId] = 0
        docScores[docId]++
        // console.log(docScores)
      })
    }
  })

  const filteredDocIds = Object.keys(docScores).filter(docId => docScores[docId] > 0)//过滤得分为0的文档
  filteredDocIds.pop()
  console.log(filteredDocIds)
  for(const docId of filteredDocIds){//计算文档的TF-IDF
    const doc = docs[parseInt(docId)];
    // console.log(doc)
    const TF_IDF_doc = await $fetch('/api/TF-IDF',{
      method: 'POST',
      body: {doc: doc, docs: docs}
    })
    TF_IDF_docs.value.push(TF_IDF_doc)
  }
  // console.log(TF_IDF_docs)

  const TF_IDF_query = await $fetch('/api/TF-IDF',{//计算搜索内容的TF-IDF
    method: 'POST',
    body: {doc: queryStr, docs: docs}
  })
  // console.log(TF_IDF_query)

  const similarityVec = await $fetch('/api/cosine_similarity',{//计算文档和搜索内容的相似度
    method: 'POST',
    body: {TF_IDF_query: TF_IDF_query, TF_IDF_docs: TF_IDF_docs.value}
  })

  const similarityVecResult = similarityVec.result
  const combinedResult: { [docId: string]: number } = {}
  filteredDocIds.forEach((docId, index) => {//合并得分和相似度
      combinedResult[docId] = similarityVecResult[index]
  })

  const sortedCombinedResult = Object.entries(combinedResult)//对相似度进行排序
    .sort(([, a], [, b]) => b - a)
  // console.log(sortedCombinedResult)

  const resultId = sortedCombinedResult.map(([key]) => key);//获取排序后的文档id
  const resultValues = sortedCombinedResult.map(([, value]) => value);//获取排序后的相似度
  // console.log(resultId);
  // console.log(resultValues);
  //返回前10个结果
  const results = resultId.slice(0, 10).map(id => docs[+id]);
  const topValues = resultValues.slice(0, 10);
  values.value = topValues;

  const timeEnd = Date.now()//结束时间
  timeCost.value = timeEnd - timeStart //计算搜索耗时
  return results
}

const callAPI = async () => {// 调用API
  const options = {// 请求参数
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'yi-large',
      messages: [
        { role: 'user', content: query.value }
      ],
      temperature: 0.3
    })
  }

  try {// 发送请求
    const response = await fetch('https://api.lingyiwanwu.com/v1/chat/completions', options)
    const data = await response.json()
    return data.choices[0].message.content
  } catch (error) {
    console.error('调用出错:', error)
    return '调用出错'
  }
}

onMounted(async () => {
  if (route.query.q) {// 初始化数据
    input.value = route.query.q as string
    query.value = route.query.q as string
    callAPI().then((data) => {
      response.value = data
    })
    results.value = await searchDocuments(query.value)
  }
})

watch(() => route.query.q, async (newQuery) => {
  if (newQuery) {// 监听路由变化
    input.value = newQuery as string
    query.value = newQuery as string
    // response.value = await callAPI()
    callAPI().then((data) => {
      response.value = data
    })
    results.value = await searchDocuments(query.value)
  }
})

const truncatedResults = computed(() => {
  return results.value.map(result => truncateText(result, maxLength));
});

function truncateText(text: string, maxLength: number) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  return text;
}

</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
</style>
