
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

    <el-dialog
      v-model="voteDialogVisible"
      title="题目投票"
      width="420px"
      align-center
      :close-on-click-modal="false"
      @closed="resetVoteState"
    >
      <div v-if="activeProblem" class="vote-dialog-content">
        <div class="vote-target">当前题目：{{ activeProblem.name }}</div>

        <div class="rating-container theme-krajee-svg rating-sm rating-animate">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="rating-star"
            :class="{ selected: selectedVoteScore !== null && selectedVoteScore >= n }"
            @click="selectVoteScore(n)"
          >
            {{ isZeroMode ? '💩' : (selectedVoteScore >= n ? '★' : '☆') }}
          </button>
        </div>

        <div class="vote-actions">
          <el-button @click="setZeroMode">设为0</el-button>
          <el-button type="primary" :disabled="!canSubmitVote || submittingVote" :loading="submittingVote" @click="submitVote">
            提交投票
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElTable, ElTableColumn, ElSelect, ElOption, ElPagination, ElEmpty, ElDialog, ElButton, ElMessage } from 'element-plus'
import { getProblemList, voteProblem } from '../api/problem'
import QualityScore from '../components/QualityScore.vue'

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
const selectedVoteScore = ref(null)
const isZeroMode = ref(false)
const submittingVote = ref(false)

const canSubmitVote = computed(() => selectedVoteScore.value !== null)

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
  selectedVoteScore.value = null
  isZeroMode.value = false
  voteDialogVisible.value = true
}

const selectVoteScore = (score) => {
  selectedVoteScore.value = score
  isZeroMode.value = false
}

const setZeroMode = () => {
  selectedVoteScore.value = 0
  isZeroMode.value = true
}

const resetVoteState = () => {
  activeProblem.value = null
  selectedVoteScore.value = null
  isZeroMode.value = false
  submittingVote.value = false
}

const submitVote = async () => {
  if (!activeProblem.value || selectedVoteScore.value === null) return
  submittingVote.value = true
  try {
    await voteProblem(activeProblem.value.id, selectedVoteScore.value)
    ElMessage.success('投票成功')
    voteDialogVisible.value = false
    fetchProblems()
  } catch (error) {
    ElMessage.error(error?.message || '投票失败')
  } finally {
    submittingVote.value = false
  }
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

.vote-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.vote-target {
  font-size: 14px;
  color: #303133;
}

.rating-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.theme-krajee-svg {
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #fff;
}

.rating-sm {
  font-size: 20px;
}

.rating-animate .rating-star {
  transition: transform 0.15s ease, color 0.15s ease, text-shadow 0.15s ease;
}

.rating-star {
  border: none;
  background: transparent;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #c0c4cc;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.rating-star:hover {
  transform: scale(1.12);
  color: #f7ba2a;
  text-shadow: 0 2px 8px rgba(247, 186, 42, 0.35);
}

.rating-star.selected {
  color: #f7ba2a;
  text-shadow: 0 2px 8px rgba(247, 186, 42, 0.35);
}

.vote-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
