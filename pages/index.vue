<template>
  <h1>教师信息检索系统</h1>
  <div class="container">
    <div class="mt-4">
      <el-input
        v-model="input"
        style="width: 550px; height: 40px"
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
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'

const input = ref('')
const router = useRouter()

const navigateToResult = () => {// 跳转到搜索结果页面
  if (input.value.trim()) {
    router.push({ path: '/result', query: { q: input.value } })
  }
}
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 20vh;
}

.mt-4 {
  margin-top: 0;
}

h1 {
  display: flex;
  justify-content: center;
  margin-top: 220px;
}
</style>
