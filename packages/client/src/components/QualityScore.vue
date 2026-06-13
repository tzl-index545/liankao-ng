<template>
  <span class="quality-score" :class="scoreClass" :style="scoreStyle">
    {{ formattedScore }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: [Number, String],
    default: null
  }
})

const numericScore = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') return null
  const numeric = Number(props.value)
  return Number.isNaN(numeric) ? null : numeric
})

const formattedScore = computed(() => {
  if (numericScore.value === null) return '-'
  const value = numericScore.value.toFixed(2)
  if (numericScore.value < 1.0) return `💩${value}`
  return value
})

const scoreClass = computed(() => {
  if (numericScore.value === null) return 'quality-score-null'
  if (numericScore.value < 1.0) return 'quality-score-low'
  return 'quality-score-normal'
})

const scoreStyle = computed(() => {
  if (numericScore.value === null) return {}

  if (numericScore.value < 1.0) {
    return {
      color: '#7a4a20'
    }
  }

  const clamped = Math.min(5, Math.max(1, numericScore.value))
  const ratio = (clamped - 1) / 4
  const lightness = 58 - ratio * 30
  const saturation = 46 + ratio * 38

  return {
    color: `hsl(132 ${saturation}% ${lightness}%)`
  }
})
</script>

<style scoped>
.quality-score {
  display: inline-block;
  min-width: 5.5ch;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.quality-score-normal {
  color: #20984a;
}

.quality-score-low {
  color: #7a4a20;
}

.quality-score-null {
  color: #606266;
}
</style>
