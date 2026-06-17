
<template>
  <div class="user-detail-container">
    <div class="header">
      <h1>用户详情</h1>
    </div>

    <div class="basic-info" v-loading="loading">
      <div v-if="userInfo" class="info-grid">
        <div class="info-item">
          <span class="label">ID：</span>
          <span class="value">{{ userInfo.id }}</span>
        </div>
        <div class="info-item">
          <span class="label">昵称：</span>
          <span class="value">
            <UserName v-if="userInfo" :uid="userInfo.id" :user="userInfo" />
            <span v-else>ErrorUser</span>
          </span>
        </div>
        <div class="info-item">
          <span class="label">XsyUsername：</span>
          <span class="value">{{ userInfo.xsyusername || '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Rating：</span>
          <span class="value">{{ userInfo.rating !== null && userInfo.rating !== undefined ? userInfo.rating : '-' }}</span>
        </div>
        <div class="info-item">
          <span class="label">Realname：</span>
          <span class="value">{{ userInfo.realname || '-' }}</span>
        </div>
      </div>
    </div>

    <div class="chart-container" v-loading="chartLoading">
      <div v-if="ratingPoints.length" class="rating-chart" @mouseleave="hoveredPoint = null">
        <svg
          class="rating-chart-svg"
          :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`"
          role="img"
          aria-label="Rating 变化图"
        >
          <rect class="chart-bg" :width="CHART_WIDTH" :height="CHART_HEIGHT" />

          <g>
            <rect
              v-for="band in chartBands"
              :key="band.label"
              :x="CHART_PADDING.left"
              :y="band.y"
              :width="chartInnerWidth"
              :height="band.height"
              :fill="band.color"
            />
          </g>

          <g class="grid-lines">
            <line
              v-for="tick in yAxisTicks"
              :key="tick.value"
              :x1="CHART_PADDING.left"
              :x2="CHART_WIDTH - CHART_PADDING.right"
              :y1="tick.y"
              :y2="tick.y"
            />
          </g>

          <g class="axis-labels">
            <text
              v-for="tick in yAxisTicks"
              :key="`y-${tick.value}`"
              :x="CHART_PADDING.left - 10"
              :y="tick.y + 4"
              text-anchor="end"
            >
              {{ tick.value }}
            </text>
            <text
              v-for="tick in xAxisTicks"
              :key="`x-${tick.value}`"
              :x="tick.x"
              :y="CHART_HEIGHT - 12"
              text-anchor="middle"
            >
              {{ tick.value }}
            </text>
          </g>

          <line
            class="axis-line"
            :x1="CHART_PADDING.left"
            :x2="CHART_WIDTH - CHART_PADDING.right"
            :y1="CHART_HEIGHT - CHART_PADDING.bottom"
            :y2="CHART_HEIGHT - CHART_PADDING.bottom"
          />
          <line
            class="axis-line"
            :x1="CHART_PADDING.left"
            :x2="CHART_PADDING.left"
            :y1="CHART_PADDING.top"
            :y2="CHART_HEIGHT - CHART_PADDING.bottom"
          />

          <path class="rating-line" :d="ratingLinePath" />

          <g
            v-for="point in ratingPoints"
            :key="point.id"
            class="rating-point"
            @mouseenter="hoveredPoint = point"
            @focus="hoveredPoint = point"
          >
            <circle class="rating-point-hit" :cx="point.x" :cy="point.y" r="14" />
            <circle class="rating-point-dot" :cx="point.x" :cy="point.y" r="4.5" />
          </g>
        </svg>

        <div v-if="hoveredPoint" class="chart-tooltip" :style="tooltipStyle">
          <div class="tooltip-title">比赛 {{ hoveredPoint.contestId }}</div>
          <div>Rating：{{ formatRating(hoveredPoint.beforeRating) }} -> {{ formatRating(hoveredPoint.afterRating) }}</div>
          <div :class="deltaClass(hoveredPoint.delta)">变化：{{ formatDelta(hoveredPoint.delta) }}</div>
        </div>
      </div>
      <div v-else-if="!chartLoading" class="chart-empty">暂无 Rating 变化</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserDetail, getUserRatingHistory } from '../api/user'
import UserName from '../components/UserName.vue'

const CHART_WIDTH = 960
const CHART_HEIGHT = 360
const CHART_PADDING = {
  top: 24,
  right: 24,
  bottom: 42,
  left: 58
}

const RATING_BANDS = [
  { min: -Infinity, max: 1000, color: '#808080', label: 'Newbie' },
  { min: 1000, max: 1400, color: '#008000', label: 'Pupil' },
  { min: 1400, max: 1700, color: '#0000ff', label: 'Expert'},
  { min: 1700, max: 2000, color: '#ff8c00', label: 'Master'},
  { min: 2000, max: Infinity, color: '#ff0000', label: 'Grandmaster'},
]


const route = useRoute()
const loading = ref(false)
const chartLoading = ref(false)
const userInfo = ref(null)
const ratingHistory = ref([])
const hoveredPoint = ref(null)

const chartInnerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const sortedRatingHistory = computed(() => {
  return ratingHistory.value
    .map((item, index) => ({
      id: item.id ?? `${item.contestId}-${index}`,
      contestId: toNumber(item.contestId),
      beforeRating: toNumber(item.preContestRating),
      afterRating: toNumber(item.postContestRating)
    }))
    .filter((item) => item.contestId !== null && item.afterRating !== null)
    .sort((a, b) => a.contestId - b.contestId || String(a.id).localeCompare(String(b.id)))
})

const yDomain = computed(() => {
  const ratings = sortedRatingHistory.value.flatMap((item) => [
    item.beforeRating,
    item.afterRating
  ]).filter((value) => value !== null)

  const bandBounds = RATING_BANDS.flatMap((band) => [band.min, band.max])
    .filter(Number.isFinite)

  const values = [...ratings, ...bandBounds]
  if (!values.length) return { min: 1200, max: 1800 }

  let min = Math.min(...values)
  let max = Math.max(...values)

  if (min === max) {
    min -= 100
    max += 100
  }

  const padding = Math.max(80, (max - min) * 0.12)
  return {
    min: Math.floor((min - padding) / 100) * 100,
    max: Math.ceil((max + padding) / 100) * 100
  }
})

const ratingToY = (rating) => {
  const { min, max } = yDomain.value
  return CHART_PADDING.top + ((max - rating) / (max - min)) * chartInnerHeight
}

const indexToX = (index, total) => {
  if (total <= 1) return CHART_PADDING.left + chartInnerWidth / 2
  return CHART_PADDING.left + (index / (total - 1)) * chartInnerWidth
}

const chartBands = computed(() => {
  const { min: domainMin, max: domainMax } = yDomain.value

  return RATING_BANDS.map((band) => {
    const min = Number.isFinite(band.min) ? Math.max(band.min, domainMin) : domainMin
    const max = Number.isFinite(band.max) ? Math.min(band.max, domainMax) : domainMax
    if (max <= min) return null

    const yTop = ratingToY(max)
    const yBottom = ratingToY(min)

    return {
      ...band,
      y: yTop,
      height: yBottom - yTop
    }
  }).filter(Boolean)
})

const yAxisTicks = computed(() => {
  const { min, max } = yDomain.value
  const ticks = new Set([min, max])

  for (const band of RATING_BANDS) {
    if (Number.isFinite(band.min) && band.min > min && band.min < max) ticks.add(band.min)
    if (Number.isFinite(band.max) && band.max > min && band.max < max) ticks.add(band.max)
  }

  return [...ticks]
    .sort((a, b) => b - a)
    .map((value) => ({
      value,
      y: ratingToY(value)
    }))
})

const ratingPoints = computed(() => {
  const history = sortedRatingHistory.value

  return history.map((item, index) => ({
    ...item,
    x: indexToX(index, history.length),
    y: ratingToY(item.afterRating),
    delta: item.beforeRating === null ? 0 : item.afterRating - item.beforeRating
  }))
})

const ratingLinePath = computed(() => {
  return ratingPoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
})

const xAxisTicks = computed(() => {
  const points = ratingPoints.value
  if (!points.length) return []
  if (points.length === 1) return [{ value: points[0].contestId, x: points[0].x }]

  const count = Math.min(5, points.length)
  const indices = new Set()
  for (let i = 0; i < count; i++) {
    indices.add(Math.round((i * (points.length - 1)) / (count - 1)))
  }

  return [...indices]
    .sort((a, b) => a - b)
    .map((index) => ({
      value: points[index].contestId,
      x: points[index].x
    }))
})

const tooltipStyle = computed(() => {
  if (!hoveredPoint.value) return {}

  return {
    left: `${(hoveredPoint.value.x / CHART_WIDTH) * 100}%`,
    top: `${(hoveredPoint.value.y / CHART_HEIGHT) * 100}%`
  }
})

const formatDelta = (delta) => {
  if (delta > 0) return `+${delta}`
  return String(delta)
}

const formatRating = (rating) => {
  return rating === null ? '-' : String(rating)
}

const deltaClass = (delta) => {
  if (delta > 0) return 'delta-positive'
  if (delta < 0) return 'delta-negative'
  return 'delta-zero'
}

const fetchUserDetail = async () => {
  loading.value = true
  try {
    const res = await getUserDetail(route.params.id)
    userInfo.value = res.data
  } catch (error) {
    ElMessage.error('获取用户信息失败')
  } finally {
    loading.value = false
  }
}

const fetchRatingHistory = async () => {
  chartLoading.value = true
  try {
    const res = await getUserRatingHistory(route.params.id)
    ratingHistory.value = res.data || []
  } catch (error) {
    ElMessage.error('获取 Rating 变化数据失败')
  } finally {
    chartLoading.value = false
  }
}

onMounted(() => {
  fetchUserDetail()
  fetchRatingHistory()
})
</script>

<style scoped>
.user-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 28px;
  color: #303133;
}

.basic-info {
  margin-bottom: 32px;
  padding: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.label {
  font-weight: 500;
  color: #606266;
  margin-right: 8px;
}

.value {
  color: #303133;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 500px;
}

.rating-chart {
  position: relative;
  width: 100%;
  height: 100%;
}

.rating-chart-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.chart-bg {
  fill: #ffffff;
}

.grid-lines line {
  stroke: rgba(105, 120, 140, 0.28);
  stroke-width: 1;
  shape-rendering: crispEdges;
}

.axis-line {
  stroke: #9ca3af;
  stroke-width: 1.2;
  shape-rendering: crispEdges;
}

.axis-labels {
  fill: #606266;
  font-size: 13px;
}

.rating-line {
  fill: none;
  stroke: #dcdfe6;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.rating-point {
  outline: none;
}

.rating-point-hit {
  fill: transparent;
  cursor: pointer;
}

.rating-point-dot {
  fill: #ffffff;
  stroke: #dcdfe6;
  stroke-width: 2.5;
  pointer-events: none;
}

.rating-point:hover .rating-point-dot {
  fill: #dcdfe6;
}

.chart-tooltip {
  position: absolute;
  z-index: 2;
  min-width: 160px;
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  color: #303133;
  font-size: 13px;
  line-height: 1.6;
  pointer-events: none;
  transform: translate(12px, -50%);
}

.tooltip-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.delta-positive {
  color: #16a34a;
}

.delta-negative {
  color: #dc2626;
}

.delta-zero {
  color: #606266;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #909399;
}
</style>
