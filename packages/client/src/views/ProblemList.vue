
<template>
  <div class="problem-list-container">
    <div class="header">
      <h1>题目列表</h1>
      <div class="sort-bar">
        <el-input
          v-model="searchInput"
          class="search-input"
          clearable
          maxlength="200"
          aria-label="搜索题库"
          placeholder="搜索题号、题名、简介与题面"
        />
        <el-select class="sort-select" v-model="sortField" @change="handleSortChange" placeholder="排序字段">
          <el-option v-if="activeQuery" label="相关性" value="relevance" />
          <el-option label="ID" value="id" />
          <el-option label="难度" value="difficulties" />
          <el-option label="质量" value="qualities" />
        </el-select>
        <el-select class="sort-select" v-model="sortDirection" :disabled="sortField === 'relevance'" @change="handleSortChange" placeholder="排序方向">
          <el-option label="Asc" value="asc" />
          <el-option label="Desc" value="desc" />
        </el-select>
      </div>
    </div>
    <div class="problem-list" v-loading="loading">
      <el-table v-if="problems.length > 0" :data="problems" stripe>
        <el-table-column label="ID" width="90">
          <template #default="{ row }">
            <span class="problem-id">{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="题目信息" min-width="420">
          <template #default="{ row }">
            <div class="problem-main">
              <el-button class="problem-link" type="primary" link @click="goToProblemDetail(row.id)">
                {{ row.name }}
              </el-button>
              <div class="problem-description">{{ row.description || '-' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="Qualities" width="220">
          <template #default="{ row }">
            <QualityScore :value="row.qualities" />
          </template>
        </el-table-column>
        <el-table-column label="Vote" width="150" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="openVoteDialog(row)">投票</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && problems.length === 0" description="暂无题目" />
    </div>
    <div class="pagination" v-if="total > 0">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <ProblemVoteDialog
      v-model:visible="voteDialogVisible"
      :problem="activeProblem"
      @submitted="handleVoteSubmitted"
    />
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElTable, ElTableColumn, ElSelect, ElOption, ElPagination, ElEmpty, ElButton, ElInput, ElMessage } from 'element-plus'
import { getProblemList } from '../api/problem'
import QualityScore from '../components/QualityScore.vue'
import ProblemVoteDialog from '../components/ProblemVoteDialog.vue'

const router = useRouter()
const route = useRoute()
const normalizeRouteQuery = (value) => {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}
const initialQuery = normalizeRouteQuery(route.query.q)
const loading = ref(false)
const problems = ref([])
const searchInput = ref(initialQuery)
const activeQuery = ref(initialQuery)
const sortField = ref(initialQuery ? 'relevance' : 'id')
const sortDirection = ref('desc')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const voteDialogVisible = ref(false)
const activeProblem = ref(null)
let fetchSequence = 0
let searchTimer = null

const fetchProblems = async () => {
  const sequence = ++fetchSequence
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    const order = getProblemOrder()
    if (order) params.order = order
    if (activeQuery.value) params.q = activeQuery.value
    const res = await getProblemList(params)
    if (sequence !== fetchSequence) return
    problems.value = res.data.items
    total.value = res.data.total
  } catch (error) {
    if (sequence !== fetchSequence) return
    ElMessage.error('获取题目列表失败')
  } finally {
    if (sequence === fetchSequence) loading.value = false
  }
}

const getProblemOrder = () => {
  if (sortField.value === 'relevance') return undefined
  if (sortField.value === 'difficulties') {
    return sortDirection.value === 'asc' ? 'difficulties-asc' : 'difficulties-desc'
  }
  if (sortField.value === 'qualities') {
    return sortDirection.value === 'asc' ? 'qualities-asc' : 'qualities-desc'
  }
  return sortDirection.value === 'asc' ? 'asc' : 'desc'
}

const handleSortChange = () => {
  currentPage.value = 1
  fetchProblems()
}

const handleSizeChange = () => {
  currentPage.value = 1
  fetchProblems()
}

const handlePageChange = () => {
  fetchProblems()
}

const goToProblemDetail = (id) => {
  router.push(`/problems/${id}`)
}

const openVoteDialog = (problem) => {
  activeProblem.value = problem
  voteDialogVisible.value = true
}

const handleVoteSubmitted = () => {
  activeProblem.value = null
  fetchProblems()
}

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const q = value.trim()
    if (q === normalizeRouteQuery(route.query.q)) return
    const query = { ...route.query }
    if (q) query.q = q
    else delete query.q
    router.replace({ query })
  }, 300)
})

watch(() => route.query.q, (value) => {
  const q = normalizeRouteQuery(value)
  const hadQuery = Boolean(activeQuery.value)
  if (searchInput.value !== q) searchInput.value = q
  activeQuery.value = q
  if (q && !hadQuery) sortField.value = 'relevance'
  if (!q && sortField.value === 'relevance') {
    sortField.value = 'id'
    sortDirection.value = 'desc'
  }
  currentPage.value = 1
  fetchProblems()
}, { immediate: true })

onBeforeUnmount(() => {
  clearTimeout(searchTimer)
})
</script>

<style scoped>
.problem-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.header h1 {
  margin: 0 0 16px 0;
  font-size: 28px;
  color: #303133;
}

.sort-bar {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  align-items: center;
  margin-bottom: 16px;
}

.sort-select {
  width: 128px;
}

.search-input {
  width: min(420px, 100%);
  margin-right: auto;
}

.problem-list {
  min-height: 200px;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.problem-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.problem-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.problem-link {
  justify-content: flex-start;
  padding: 0;
  font-size: 15px;
}

.problem-description {
  color: #909399;
  font-size: 13px;
  line-height: 1.45;
}

</style>
