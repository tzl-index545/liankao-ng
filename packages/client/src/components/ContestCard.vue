
<template>
  <el-card class="contest-card" @click="handleClick">
    <div class="contest-header">
      <h3 class="contest-name">{{ contest.name }}</h3>
    </div>
    <div class="contest-info">
      <div class="info-item">
        <el-icon><Clock /></el-icon>
        <span>{{ formatDate(contest.startTime) }} - {{ formatDate(contest.endTime) }}</span>
      </div>
      <div class="info-item" v-if="contest.qualities !== null && contest.qualities !== undefined">
        <el-icon><Star /></el-icon>
        <span>质量评分: <QualityScore :value="contest.qualities" /></span>
      </div>
    </div>
    <div class="contest-description">{{ contest.description }}</div>
    <div class="contest-footer">
      <StarRating 
        v-model="localRating" 
        @change="handleRate"
        :disabled="ratingDisabled"
      />
    </div>
  </el-card>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElCard, ElIcon, ElMessage } from 'element-plus'
import { Clock, Star } from '@element-plus/icons-vue'
import StarRating from './StarRating.vue'
import QualityScore from './QualityScore.vue'
import { voteContest } from '../api/contest'

const props = defineProps({
  contest: {
    type: Object,
    required: true
  },
  userRating: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['rated'])

const router = useRouter()
const localRating = ref(props.userRating)
const ratingDisabled = ref(false)

const formatDate = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const handleClick = () => {
  router.push(`/contests/${props.contest.id}`)
}

const handleRate = async (value) => {
  try {
    ratingDisabled.value = true
    await voteContest(props.contest.id, value)
    ElMessage.success('评分成功')
    emit('rated', { contestId: props.contest.id, rating: value })
  } catch (error) {
    localRating.value = props.userRating
    ElMessage.error('评分失败')
  } finally {
    ratingDisabled.value = false
  }
}
</script>

<style scoped>
.contest-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.contest-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.contest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.contest-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.contest-info {
  margin-bottom: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 14px;
  color: #606266;
}

.contest-description {
  margin-bottom: 12px;
  font-size: 14px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.contest-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
