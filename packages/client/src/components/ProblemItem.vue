
<template>
  <el-card class="problem-item" @click="handleClick">
    <div class="problem-header">
      <h3 class="problem-name">{{ problem.name }}</h3>
    </div>
    <div class="problem-info">
      <div class="info-item" v-if="problem.difficulties">
        <el-icon><TrendCharts /></el-icon>
        <span>难度: {{ problem.difficulties.toFixed(1) }}</span>
      </div>
      <div class="info-item" v-if="problem.qualities !== null && problem.qualities !== undefined">
        <el-icon><Star /></el-icon>
        <span>质量: <QualityScore :value="problem.qualities" /></span>
      </div>
    </div>
    <div class="problem-description">{{ problem.description }}</div>
    <div class="problem-footer">
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
import { TrendCharts, Star } from '@element-plus/icons-vue'
import StarRating from './StarRating.vue'
import QualityScore from './QualityScore.vue'
import { voteProblem } from '../api/problem'

const props = defineProps({
  problem: {
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

const handleClick = () => {
  router.push(`/problems/${props.problem.id}`)
}

const handleRate = async (value) => {
  try {
    ratingDisabled.value = true
    await voteProblem(props.problem.id, value)
    ElMessage.success('评分成功')
    emit('rated', { problemId: props.problem.id, rating: value })
  } catch (error) {
    localRating.value = props.userRating
    ElMessage.error('评分失败')
  } finally {
    ratingDisabled.value = false
  }
}
</script>

<style scoped>
.problem-item {
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.problem-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.problem-header {
  margin-bottom: 12px;
}

.problem-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.problem-info {
  margin-bottom: 12px;
}

.info-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 16px;
  font-size: 14px;
  color: #606266;
}

.problem-description {
  margin-bottom: 12px;
  font-size: 14px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.problem-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
