<template>
  <div class="yuantiji-container">
    <div class="header">
      <h1>原题机</h1>
      <p>粘贴题面，查找题库中语义最接近的原题。</p>
    </div>

    <el-card shadow="never" class="search-card">
      <el-input
        v-model="statement"
        type="textarea"
        :rows="14"
        maxlength="100000"
        resize="vertical"
        aria-label="待匹配题面"
        placeholder="请在这里粘贴完整题面"
        @keydown.ctrl.enter="handleSearch"
      />
      <div class="search-actions">
        <span class="search-tip">Ctrl + Enter 快速搜索</span>
        <el-button type="primary" :loading="loading" @click="handleSearch">
          开始匹配
        </el-button>
      </div>
    </el-card>

    <div v-if="loading" class="progress-box" role="status" aria-live="polite">
      <div class="progress-copy">
        <span>模型正在分析题面</span>
        <strong>{{ progressElapsed < 10 ? `预计还需 ${10 - progressElapsed}s` : '即将完成' }}</strong>
      </div>
      <div class="progress-track" aria-hidden="true">
        <span :style="{ transform: `scaleX(${progressPercentage})` }" />
      </div>
    </div>

    <template v-if="searched">
      <el-card v-if="simplifiedStatement" shadow="never" class="summary-card">
        <template #header>
          <span>简化题意</span>
        </template>
        <div class="simplified-statement">{{ simplifiedStatement }}</div>
      </el-card>

      <el-card shadow="never" class="result-card" v-loading="loading">
        <template #header>
          <div class="result-header">
            <span>匹配结果</span>
            <span class="indexed-count">已匹配 {{ indexedCount }} 道已索引题目</span>
          </div>
        </template>
        <el-table v-if="matches.length > 0" :data="matches" stripe>
          <el-table-column label="排名" type="index" width="72" />
          <el-table-column label="相似度" width="110">
            <template #default="{ row }">
              <el-tag :type="similarityType(row.similarity)">
                {{ formatSimilarity(row.similarity) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="ID" prop="id" width="90" />
          <el-table-column label="题目" min-width="420">
            <template #default="{ row }">
              <div class="problem-main">
                <router-link
                  :to="`/problems/${row.id}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="problem-link"
                >
                  {{ row.name }}
                </router-link>
                <div class="problem-description">{{ row.description || '-' }}</div>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="没有找到匹配题目" />
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref } from 'vue'
import { ElButton, ElCard, ElEmpty, ElInput, ElMessage, ElTable, ElTableColumn, ElTag } from 'element-plus'
import { searchYuantiji } from '../api/yuantiji'

const statement = ref('')
const loading = ref(false)
const searched = ref(false)
const simplifiedStatement = ref('')
const indexedCount = ref(0)
const matches = ref([])
const progressElapsed = ref(0)
const progressPercentage = computed(() => progressElapsed.value / 10)
let progressStartedAt = 0
let progressTimer

const updateProgress = () => {
  progressElapsed.value = Math.min(10, Math.floor((Date.now() - progressStartedAt) / 1000))
}

const startProgress = () => {
  progressStartedAt = Date.now()
  progressElapsed.value = 0
  progressTimer = setInterval(updateProgress, 250)
}

const stopProgress = () => {
  clearInterval(progressTimer)
  progressTimer = undefined
}

const handleSearch = async () => {
  if (loading.value) return
  const input = statement.value.trim()
  if (!input) {
    ElMessage.warning('请先输入题面')
    return
  }
  loading.value = true
  startProgress()
  searched.value = false
  simplifiedStatement.value = ''
  indexedCount.value = 0
  matches.value = []
  try {
    const response = await searchYuantiji(input)
    simplifiedStatement.value = response.data.simplifiedStatement
    indexedCount.value = response.data.indexedCount
    matches.value = response.data.matches
    searched.value = true
  } catch (error) {
    ElMessage.error(error.message || '原题匹配失败')
  } finally {
    stopProgress()
    loading.value = false
  }
}

const formatSimilarity = (similarity) => `${(similarity * 100).toFixed(1)}%`

const similarityType = (similarity) => {
  if (similarity >= 0.9) return 'success'
  if (similarity >= 0.75) return 'warning'
  return 'info'
}

onUnmounted(stopProgress)
</script>

<style scoped>
.yuantiji-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.header h1 {
  margin: 0 0 8px;
  font-size: 28px;
  color: #303133;
}

.header p {
  margin: 0;
  color: #909399;
}

.search-card,
.summary-card,
.result-card {
  margin-bottom: 20px;
}

.progress-box {
  margin: -4px 0 20px;
  padding: 12px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fafafa;
}

.progress-copy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #909399;
  font-size: 13px;
}

.progress-copy strong {
  color: var(--el-color-primary);
  font-weight: 500;
}

.progress-track {
  height: 3px;
  margin-top: 9px;
  overflow: hidden;
  border-radius: 999px;
  background: #ebeef5;
}

.progress-track span {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: var(--el-color-primary);
  transform-origin: left;
  transition: transform 0.25s linear;
}

.search-actions,
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.search-actions {
  margin-top: 16px;
}

.search-tip,
.indexed-count {
  color: #909399;
  font-size: 13px;
}

.simplified-statement {
  color: #606266;
  line-height: 1.7;
  white-space: pre-wrap;
}

.problem-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.problem-link {
  align-self: flex-start;
  color: var(--el-color-primary);
  font-size: 15px;
  text-decoration: none;
}

.problem-link:hover {
  color: var(--el-color-primary-light-3);
}

.problem-description {
  color: #909399;
  font-size: 13px;
  line-height: 1.45;
}

@media (max-width: 640px) {
  .yuantiji-container {
    padding: 8px;
  }

  .search-tip {
    display: none;
  }

  .search-actions {
    justify-content: flex-end;
  }
}
</style>
