
<template>
  <div class="problem-list-container">
    <div class="header">
      <h1>题目列表</h1>
      <div class="sort-bar">
        <el-select class="sort-select" v-model="sortField" @change="handleSortChange" placeholder="排序字段">
          <el-option label="ID" value="id" />
          <el-option label="难度" value="difficulties" />
          <el-option label="质量" value="qualities" />
        </el-select>
        <el-select class="sort-select" v-model="sortDirection" @change="handleSortChange" placeholder="排序方向">
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElTable, ElTableColumn, ElSelect, ElOption, ElPagination, ElEmpty, ElButton, ElMessage } from 'element-plus'
import { getProblemList } from '../api/problem'
import QualityScore from '../components/QualityScore.vue'
import ProblemVoteDialog from '../components/ProblemVoteDialog.vue'

const router = useRouter()
const loading = ref(false)
const problems = ref([])
const sortField = ref('id')
const sortDirection = ref('desc')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const voteDialogVisible = ref(false)
const activeProblem = ref(null)

const fetchProblems = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      order: getProblemOrder()
    }
    const res = await getProblemList(params)
    problems.value = res.data.items
    total.value = res.data.total
  } catch (error) {
    ElMessage.error('获取题目列表失败')
  } finally {
    loading.value = false
  }
}

const getProblemOrder = () => {
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

onMounted(() => {
  fetchProblems()
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
