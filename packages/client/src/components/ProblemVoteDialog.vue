<template>
  <el-dialog
    v-model="dialogVisible"
    title="题目投票"
    width="420px"
    align-center
    :close-on-click-modal="false"
    @closed="resetVoteState"
  >
    <div v-if="problem" class="vote-dialog-content">
      <div class="vote-target">当前题目：{{ problem.name }}</div>

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
        <el-button
          type="primary"
          :disabled="!canSubmitVote || submittingVote"
          :loading="submittingVote"
          @click="submitVote"
        >
          提交投票
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElButton, ElDialog, ElMessage } from 'element-plus'
import { voteProblem } from '../api/problem'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  problem: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'submitted'])

const selectedVoteScore = ref(null)
const isZeroMode = ref(false)
const submittingVote = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const canSubmitVote = computed(() => selectedVoteScore.value !== null)

const selectVoteScore = (score) => {
  selectedVoteScore.value = score
  isZeroMode.value = false
}

const setZeroMode = () => {
  selectedVoteScore.value = 0
  isZeroMode.value = true
}

const resetVoteState = () => {
  selectedVoteScore.value = null
  isZeroMode.value = false
  submittingVote.value = false
}

const submitVote = async () => {
  if (!props.problem || selectedVoteScore.value === null) return
  submittingVote.value = true
  try {
    await voteProblem(props.problem.id, selectedVoteScore.value)
    ElMessage.success('投票成功')
    emit('submitted', {
      problemId: props.problem.id,
      rating: selectedVoteScore.value
    })
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(error?.message || '投票失败')
  } finally {
    submittingVote.value = false
  }
}

watch(() => props.problem?.id, resetVoteState)
</script>

<style scoped>
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
