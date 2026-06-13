
<template>
  <div class="contest-detail-container">
    <el-card v-loading="loading">
      <template #header>
        <div class="contest-header">
          <h1>{{ contest.name }}</h1>
          <el-tag v-if="contest.type" type="info">{{ contest.type }}</el-tag>
        </div>
      </template>
      <div class="contest-info">
        <div class="info-item">
          <el-icon><Clock /></el-icon>
          <span>开始时间: {{ formatDate(contest.startTime) }}</span>
        </div>
        <div class="info-item">
          <el-icon><Clock /></el-icon>
          <span>结束时间: {{ formatDate(contest.endTime) }}</span>
        </div>
        <div class="info-item" v-if="contest.qualities !== null && contest.qualities !== undefined">
          <el-icon><Star /></el-icon>
          <span>质量评分: <QualityScore :value="contest.qualities" /></span>
        </div>
      </div>
      <div class="contest-description">
        <h3>比赛描述</h3>
        <p>{{ contest.description }}</p>
      </div>
      <div class="contest-rating">
        <h3>评分</h3>
        <StarRating 
          v-model="localRating" 
          @change="handleRate"
          :disabled="ratingDisabled"
        />
      </div>
      <div class="contest-problems">
        <h3>题目列表</h3>
        <div v-loading="problemsLoading">
          <el-table :data="problems" stripe style="width: 100%">
            <el-table-column prop="order" label="顺序" width="80" />
            <el-table-column prop="name" label="题目名称" />
            <el-table-column prop="point" label="分值" width="100" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="primary" link @click="goToProblem(scope.row.id)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!problemsLoading && problems.length === 0" description="暂无题目" />
        </div>
      </div>
      <div class="contest-ranklist">
        <h3>排行榜</h3>
        <div v-loading="ranklistLoading">
          <el-table v-if="ranklist.length > 0" :data="ranklist" stripe style="width: 100%">
            <el-table-column prop="rank" label="排名" width="90" align="center" />
            <el-table-column label="用户" min-width="180">
              <template #default="{ row }">
                <el-button class="ranklist-user-link" type="primary" link @click="goToUser(row.user.id)">
                  {{ formatUserName(row.user) }}
                </el-button>
              </template>
            </el-table-column>
            <el-table-column prop="totalScore" label="总分" width="100" align="center" />
            <el-table-column
              v-for="problem in problems"
              :key="problem.id"
              :label="problem.name"
              width="120"
              align="center"
            >
              <template #default="{ row }">
                {{ formatProblemScore(row.scores, problem.id) }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!ranklistLoading && ranklist.length === 0" description="暂无排行榜" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElCard, ElTag, ElIcon, ElTable, ElTableColumn, ElButton, ElEmpty, ElMessage } from 'element-plus'
import { Clock, Star } from '@element-plus/icons-vue'
import StarRating from '../components/StarRating.vue'
import QualityScore from '../components/QualityScore.vue'
import { getContestDetail, getContestProblems, getContestRanklist, voteContest } from '../api/contest'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const problemsLoading = ref(false)
const ranklistLoading = ref(false)
const contest = ref({})
const problems = ref([])
const ranklist = ref([])
const localRating = ref(0)
const ratingDisabled = ref(false)

const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const fetchContestDetail = async () => {
  loading.value = true
  try {
    const res = await getContestDetail(route.params.id)
    contest.value = res.data
  } catch (error) {
    ElMessage.error('获取比赛详情失败')
  } finally {
    loading.value = false
  }
}

const fetchContestProblems = async () => {
  problemsLoading.value = true
  try {
    const res = await getContestProblems(route.params.id)
    problems.value = res.data
  } catch (error) {
    ElMessage.error('获取比赛题目失败')
  } finally {
    problemsLoading.value = false
  }
}

const fetchContestRanklist = async () => {
  ranklistLoading.value = true
  try {
    const res = await getContestRanklist(route.params.id)
    ranklist.value = res.data
  } catch (error) {
    ElMessage.error('获取排行榜失败')
  } finally {
    ranklistLoading.value = false
  }
}

const handleRate = async (value) => {
  try {
    ratingDisabled.value = true
    await voteContest(route.params.id, value)
    ElMessage.success('评分成功')
    // 重新获取比赛详情以更新质量评分
    await fetchContestDetail()
  } catch (error) {
    ElMessage.error('评分失败')
  } finally {
    ratingDisabled.value = false
  }
}

const goToProblem = (id) => {
  router.push(`/problems/${id}`)
}

const goToUser = (id) => {
  router.push(`/users/${id}`)
}

const formatUserName = (user) => {
  if (!user) return '-'
  if (!user.realname) return user.nickname || '-'
  return `${user.nickname}(${user.realname})`
}

const formatProblemScore = (scores, problemId) => {
  const value = scores?.[String(problemId)]
  if (value === null || value === undefined || value === '') return '-'
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return '-'
  return numeric
}

onMounted(() => {
  fetchContestDetail()
  fetchContestProblems()
  fetchContestRanklist()
})
</script>

<style scoped>
.contest-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.contest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contest-header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.contest-info {
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}

.contest-description {
  margin-bottom: 24px;
}

.contest-description h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
}

.contest-description p {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.contest-rating {
  margin-bottom: 24px;
}

.contest-rating h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
}

.contest-problems {
  margin-top: 24px;
}

.contest-problems h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.contest-ranklist {
  margin-top: 24px;
}

.contest-ranklist h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.ranklist-user-link {
  padding: 0;
  white-space: normal;
  text-align: left;
  line-height: 1.4;
  font-weight: 600;
}
</style>
