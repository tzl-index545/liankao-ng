<template>
  <div class="problem-detail-container" v-loading="loading">
    <el-card v-if="problem.id" class="problem-card">
      <div class="problem-header">
        <div>
          <div class="problem-id">#{{ problem.id }}</div>
          <h1>{{ problem.name }}</h1>
        </div>
        <div class="problem-actions">
          <QualityScore :value="problem.qualities" />
          <el-button @click="voteDialogVisible = true">投票</el-button>
        </div>
      </div>

      <div v-if="problem.contestIds?.length" class="problem-contests">
        <span>所属比赛：</span>
        <el-button
          v-for="contestId in problem.contestIds"
          :key="contestId"
          type="primary"
          link
          @click="router.push(`/contests/${contestId}`)"
        >
          {{ contestId }}
        </el-button>
      </div>

      <div
        v-if="problem.statementHtml"
        ref="statementContainer"
        class="statement"
        v-html="problem.statementHtml"
      ></div>
      <el-empty v-else description="该题暂无已抓取题面">
        <p v-if="problem.description" class="problem-description">{{ problem.description }}</p>
      </el-empty>

      <div v-if="problem.sources?.length" class="problem-sources">
        <span>题面来源：</span>
        <a
          v-for="source in problem.sources.filter(item => item.sourceUrl)"
          :key="`${source.contestId}-${source.sourcePid}`"
          :href="source.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          XSY {{ source.contestId }} / {{ source.sourcePid }}
        </a>
      </div>
    </el-card>

    <ProblemVoteDialog
      v-model:visible="voteDialogVisible"
      :problem="problem"
      @submitted="handleVoteSubmitted"
    />
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElButton, ElCard, ElEmpty, ElMessage } from 'element-plus'
import renderMathInElement from 'katex/contrib/auto-render'
import 'katex/dist/katex.min.css'
import { getProblemDetail } from '../api/problem'
import ProblemVoteDialog from '../components/ProblemVoteDialog.vue'
import QualityScore from '../components/QualityScore.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const problem = ref({})
const voteDialogVisible = ref(false)
const statementContainer = ref(null)

const renderStatementMath = async () => {
  await nextTick()
  if (!statementContainer.value) return
  renderMathInElement(statementContainer.value, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false }
    ],
    throwOnError: false
  })
}

const fetchProblem = async () => {
  loading.value = true
  try {
    const response = await getProblemDetail(route.params.id)
    problem.value = response.data
    await renderStatementMath()
  } catch (error) {
    ElMessage.error(error?.message || '获取题目失败')
  } finally {
    loading.value = false
  }
}

const handleVoteSubmitted = () => {
  fetchProblem()
}

onMounted(fetchProblem)
</script>

<style scoped>
.problem-detail-container {
  max-width: 1100px;
  min-height: 240px;
  margin: 0 auto;
  padding: 24px;
}

.problem-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.problem-header h1 {
  margin: 4px 0 0;
  color: #303133;
  font-size: 28px;
}

.problem-id {
  color: #909399;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}

.problem-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.problem-contests,
.problem-sources {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
  color: #606266;
  font-size: 14px;
}

.problem-sources {
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.problem-sources a {
  color: #409eff;
  text-decoration: none;
}

.statement {
  margin-top: 24px;
  color: #303133;
  font-size: 15px;
  line-height: 1.75;
}

.statement :deep(.statement-section) {
  margin-bottom: 28px;
}

.statement :deep(h2) {
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  font-size: 20px;
}

.statement :deep(img) {
  max-width: 100%;
  height: auto;
}

.statement :deep(pre) {
  overflow-x: auto;
  padding: 14px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f5f7fa;
  white-space: pre;
}

.statement :deep(table) {
  max-width: 100%;
  border-collapse: collapse;
}

.statement :deep(th),
.statement :deep(td) {
  padding: 6px 10px;
  border: 1px solid #dcdfe6;
}

.problem-description {
  color: #606266;
}

@media (max-width: 640px) {
  .problem-detail-container {
    padding: 12px;
  }

  .problem-header {
    flex-direction: column;
  }
}
</style>
