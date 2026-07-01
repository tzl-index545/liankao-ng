
<template>
  <div class="contest-list-container">
    <div class="header">
      <div class="header-top">
        <h1>比赛列表</h1>
        <div class="contest-actions">
          <el-input-number
            v-model="contestOperationId"
            class="contest-id-input"
            :min="1"
            :precision="0"
            :step="1"
            controls-position="right"
            placeholder="比赛 ID"
          />
          <el-input
            v-model="phpSessionId"
            class="session-input"
            type="text"
            clearable
            autocomplete="off"
            placeholder="PHPSESSID"
          />
          <el-button
            type="primary"
            :disabled="!canCrawlContest || calculatingRating"
            :loading="crawlingContest"
            @click="handleCrawlContest"
          >
            爬取比赛
          </el-button>
          <el-button
            type="warning"
            :disabled="!canRunContestOperation || crawlingContest"
            :loading="calculatingRating"
            @click="handleCalculateRating"
          >
            计算 rating
          </el-button>
        </div>
      </div>
      <div class="sort-bar">
        <el-select class="sort-select" v-model="sortField" @change="handleSortChange" placeholder="排序字段">
          <el-option label="时间" value="time" />
          <el-option label="质量" value="qualities" />
        </el-select>
        <el-select class="sort-select" v-model="sortDirection" @change="handleSortChange" placeholder="排序方向">
          <el-option label="Asc" value="asc" />
          <el-option label="Desc" value="desc" />
        </el-select>
      </div>
    </div>
    <div class="contest-list" v-loading="loading">
      <el-table v-if="contests.length > 0" :data="contests" stripe>
        <el-table-column label="ID" width="90">
          <template #default="{ row }">
            <span class="contest-id">{{ row.id }}</span>
          </template>
        </el-table-column>
        <el-table-column label="比赛信息" min-width="360">
          <template #default="{ row }">
            <div class="contest-main">
              <div class="contest-title-row">
                <el-button class="contest-link" type="primary" link @click="goToContestDetail(row.id)">
                  {{ row.name }}
                </el-button>
                <button
                  type="button"
                  class="contest-type-button"
                  :class="row.type % 2 === 1 ? 'contest-type-button-rated' : 'contest-type-button-unrated'"
                  :title="getContestRatedToggleTitle(row)"
                  :aria-label="getContestRatedToggleTitle(row)"
                  :disabled="togglingRatedContestId !== null"
                  @click="handleToggleContestRated(row)"
                >
                  <el-icon class="contest-type-icon" aria-hidden="true">
                    <Trophy v-if="row.type % 2 === 1" />
                    <Dessert v-else />
                  </el-icon>
                </button>
              </div>
              <div class="contest-time">{{ formatTimeRange(row.startTime, row.endTime) }}</div>
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
      <el-empty v-if="!loading && contests.length === 0" description="暂无比赛" />
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
      title="比赛投票"
      width="420px"
      align-center
      :close-on-click-modal="false"
      @closed="resetVoteState"
    >
      <div v-if="activeContest" class="vote-dialog-content">
        <div class="vote-target">当前比赛：{{ activeContest.name }}</div>

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
import { ElTable, ElTableColumn, ElSelect, ElOption, ElPagination, ElEmpty, ElDialog, ElButton, ElInput, ElInputNumber, ElIcon, ElMessage, ElMessageBox } from 'element-plus'
import { Dessert, Trophy } from '@element-plus/icons-vue'
import { calculateContestRating, crawlContest, getContestList, toggleContestRated, voteContest } from '../api/contest'
import QualityScore from '../components/QualityScore.vue'

const router = useRouter()
const loading = ref(false)
const contests = ref([])
const sortField = ref('time')
const sortDirection = ref('desc')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const voteDialogVisible = ref(false)
const activeContest = ref(null)
const selectedVoteScore = ref(null)
const isZeroMode = ref(false)
const submittingVote = ref(false)
const contestOperationId = ref(null)
const phpSessionId = ref('')
const crawlingContest = ref(false)
const calculatingRating = ref(false)
const togglingRatedContestId = ref(null)

const canSubmitVote = computed(() => selectedVoteScore.value !== null)
const normalizedPhpSessionId = computed(() => phpSessionId.value.trim())
const canRunContestOperation = computed(() => {
  const contestId = Number(contestOperationId.value)
  return Number.isInteger(contestId) && contestId > 0
})
const canCrawlContest = computed(() => canRunContestOperation.value && normalizedPhpSessionId.value.length > 0)

const fetchContests = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      order: getContestOrder()
    }
    const res = await getContestList(params)
    contests.value = res.data.items
    total.value = res.data.total
  } catch (error) {
    ElMessage.error('获取比赛列表失败，请尝试登出并重新登录')
  } finally {
    loading.value = false
  }
}

const getContestOrder = () => {
  if (sortField.value === 'qualities') {
    return sortDirection.value === 'asc' ? 'qualities-asc' : 'qualities-desc'
  }
  return sortDirection.value === 'asc' ? 'asc' : 'desc'
}

const handleSortChange = () => {
  currentPage.value = 1
  fetchContests()
}

const handleSizeChange = () => {
  currentPage.value = 1
  fetchContests()
}

const handlePageChange = () => {
  fetchContests()
}

const formatDateTime = (input) => {
  if (input === null || input === undefined || input === '') return '-'
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (v) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const formatTimeRange = (startTime, endTime) => {
  return `${formatDateTime(startTime)} ~ ${formatDateTime(endTime)}`
}

const isRatedContest = (contest) => Number(contest?.type) % 2 === 1

const getContestRatedStateLabel = (contest) => {
  return isRatedContest(contest) ? 'Rated' : 'Unrated'
}

const getContestRatedTargetLabel = (contest) => {
  return isRatedContest(contest) ? 'Unrated' : 'Rated'
}

const getContestRatedToggleTitle = (contest) => {
  return `${getContestRatedStateLabel(contest)}，点击切换为 ${getContestRatedTargetLabel(contest)}`
}

const goToContestDetail = (id) => {
  router.push(`/contests/${id}`)
}

const openVoteDialog = (contest) => {
  activeContest.value = contest
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
  activeContest.value = null
  selectedVoteScore.value = null
  isZeroMode.value = false
  submittingVote.value = false
}

const getContestOperationId = () => Number(contestOperationId.value)

const handleCrawlContest = async () => {
  if (!canRunContestOperation.value) {
    ElMessage.warning('请输入有效的比赛 ID')
    return
  }
  if (!normalizedPhpSessionId.value) {
    ElMessage.warning('请输入 PHPSESSID')
    return
  }

  crawlingContest.value = true
  try {
    const res = await crawlContest(getContestOperationId(), normalizedPhpSessionId.value)
    ElMessage.success(res?.message || '爬取比赛成功')
    currentPage.value = 1
    fetchContests()
  } catch (error) {
    ElMessage.error(error?.message || '爬取比赛失败')
  } finally {
    crawlingContest.value = false
  }
}

const handleCalculateRating = async () => {
  if (!canRunContestOperation.value) {
    ElMessage.warning('请输入有效的比赛 ID')
    return
  }

  const contestId = getContestOperationId()
  try {
    await ElMessageBox.confirm(
      `确认从比赛 ${contestId} 开始重算 rating？`,
      '计算 rating',
      {
        confirmButtonText: '计算',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch (error) {
    return
  }

  calculatingRating.value = true
  try {
    const res = await calculateContestRating(contestId)
    ElMessage.success(res?.message || '计算 rating 成功')
    fetchContests()
  } catch (error) {
    ElMessage.error(error?.message || '计算 rating 失败，你可能不是 admin')
  } finally {
    calculatingRating.value = false
  }
}

const handleToggleContestRated = async (contest) => {
  if (!contest || togglingRatedContestId.value !== null) return

  const targetLabel = getContestRatedTargetLabel(contest)
  try {
    await ElMessageBox.confirm(
      `确认将比赛 ${contest.id}「${contest.name}」切换为 ${targetLabel}？`,
      '切换 rated 状态',
      {
        confirmButtonText: '切换',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch (error) {
    return
  }

  togglingRatedContestId.value = contest.id
  try {
    const res = await toggleContestRated(contest.id)
    ElMessage.success(res?.message || `已切换为 ${targetLabel}`)
    fetchContests()
  } catch (error) {
    ElMessage.error(error?.message || '切换 rated 状态失败，你可能不是 admin')
  } finally {
    togglingRatedContestId.value = null
  }
}

const submitVote = async () => {
  if (!activeContest.value || selectedVoteScore.value === null) return
  submittingVote.value = true
  try {
    await voteContest(activeContest.value.id, selectedVoteScore.value)
    ElMessage.success('投票成功')
    voteDialogVisible.value = false
    fetchContests()
  } catch (error) {
    ElMessage.error(error?.message || '投票失败')
  } finally {
    submittingVote.value = false
  }
}

onMounted(() => {
  fetchContests()
})
</script>

<style scoped>
.contest-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.header h1 {
  margin: 0;
  font-size: 28px;
  color: #303133;
}

.contest-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.contest-id-input {
  width: 150px;
}

.session-input {
  width: 220px;
}
.session-input :deep(.el-input__inner) {
  -webkit-text-security: disc;
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

.contest-list {
  min-height: 200px;
}

.pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.contest-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.contest-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.contest-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.contest-link {
  justify-content: flex-start;
  padding: 0;
  font-size: 15px;
}

.contest-type-button {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  color: #8c8c8c;
  background: transparent;
  cursor: pointer;
}

.contest-type-button:hover:not(:disabled) {
  background: #f5f7fa;
}

.contest-type-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

.contest-type-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.contest-type-icon {
  font-size: 16px;
}

.contest-type-button-rated {
  color: #d48806;
}

.contest-type-button-unrated {
  color: #8c8c8c;
}

.contest-time {
  color: #909399;
  font-size: 13px;
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

@media (max-width: 640px) {
  .contest-list-container {
    padding: 16px;
  }

  .contest-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
