
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
      <div v-else-if="!loading" class="user-error">{{ userError || '暂无用户信息' }}</div>
    </div>

    <h2 class="chart-title">Rating 变化</h2>
    <div ref="chartContainer" class="chart-container" v-loading="chartLoading">
      <div
        v-if="ratingPoints.length"
        class="rating-chart"
        @mouseleave="hideTooltip"
        @keydown.esc="hideTooltip"
      >
        <svg
          class="rating-chart-svg"
          :viewBox="`0 0 ${chartWidth} ${CHART_HEIGHT}`"
          role="group"
          aria-label="Rating 变化图，横轴为比赛结束时间"
        >
          <rect class="chart-bg" :width="chartWidth" :height="CHART_HEIGHT" />

          <g class="rating-bands">
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
              :x2="chartWidth - CHART_PADDING.right"
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
              :key="`x-${tick.timestamp}`"
              class="x-axis-label"
              :x="tick.x"
              :y="CHART_HEIGHT - 24"
              :text-anchor="tick.anchor"
            >
              <tspan :x="tick.x">{{ formatDate(tick.timestamp) }}</tspan>
              <tspan v-if="showTickTime" :x="tick.x" dy="16">{{ formatTime(tick.timestamp, showTickSeconds) }}</tspan>
            </text>
          </g>

          <line
            class="axis-line"
            :x1="CHART_PADDING.left"
            :x2="chartWidth - CHART_PADDING.right"
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

          <router-link
            v-for="point in ratingPoints"
            :key="point.id"
            :to="`/contests/${point.contestId}`"
            custom
            v-slot="{ href, navigate }"
          >
            <a
              :href="href"
              class="rating-point"
              tabindex="0"
              :aria-label="`${point.contestName}，${formatDate(point.timestamp)} ${formatTime(point.timestamp, true)}，Rating ${formatRating(point.beforeRating)} 到 ${formatRating(point.afterRating)}，变化 ${formatDelta(point.delta)}`"
              @mouseenter="showTooltip(point)"
              @mouseleave="scheduleHideTooltip"
              @focus="showTooltip(point)"
              @blur="scheduleHideTooltip"
              @click="navigate"
            >
              <circle class="rating-point-hit" :cx="point.x" :cy="point.y" r="14" />
              <circle class="rating-point-dot" :cx="point.x" :cy="point.y" r="4.5" />
            </a>
          </router-link>
        </svg>

        <div
          v-if="hoveredPoint"
          class="chart-tooltip"
          :style="tooltipStyle"
          @mouseenter="cancelHideTooltip"
          @mouseleave="scheduleHideTooltip"
          @focusin="cancelHideTooltip"
          @focusout="scheduleHideTooltip"
        >
          <router-link class="tooltip-title" :to="`/contests/${hoveredPoint.contestId}`">
            {{ hoveredPoint.contestName }}
          </router-link>
          <div>结束时间：{{ formatDate(hoveredPoint.timestamp) }} {{ formatTime(hoveredPoint.timestamp, true) }}</div>
          <div>Rating：{{ formatRating(hoveredPoint.beforeRating) }} → {{ formatRating(hoveredPoint.afterRating) }}</div>
          <div :class="deltaClass(hoveredPoint.delta)">变化：{{ formatDelta(hoveredPoint.delta) }}</div>
        </div>
      </div>
      <div v-else-if="!chartLoading" class="chart-empty">{{ chartError || '暂无 Rating 变化' }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getUserDetail, getUserRatingHistory } from '../api/user'
import UserName from '../components/UserName.vue'
import { RATING_BANDS } from '../utils/rating'

const CHART_HEIGHT = 360
const CHART_PADDING = {
  top: 24,
  right: 24,
  bottom: 56,
  left: 58
}

const route = useRoute()
const loading = ref(false)
const chartLoading = ref(false)
const userInfo = ref(null)
const ratingHistory = ref([])
const hoveredPoint = ref(null)
const userError = ref('')
const chartError = ref('')
const chartContainer = ref(null)
const chartWidth = ref(960)

let hideTooltipTimer
const cancelHideTooltip = () => clearTimeout(hideTooltipTimer)
const hideTooltip = () => {
  cancelHideTooltip()
  hoveredPoint.value = null
}
const showTooltip = (point) => {
  cancelHideTooltip()
  hoveredPoint.value = point
}
// Allow the pointer to cross the gap from a point to its contest link.
const scheduleHideTooltip = () => {
  cancelHideTooltip()
  hideTooltipTimer = setTimeout(hideTooltip, 150)
}

const chartInnerWidth = computed(() => chartWidth.value - CHART_PADDING.left - CHART_PADDING.right)
const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom

const toNumber = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !value.trim()) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const sortedRatingHistory = computed(() => {
  return ratingHistory.value
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: item.id ?? `${item.contestId}-${index}`,
      contestId: toNumber(item.contestId),
      contestName: item.contestName,
      timestamp: typeof item.endTime === 'string' ? Date.parse(item.endTime) : NaN,
      beforeRating: toNumber(item.preContestRating),
      afterRating: toNumber(item.postContestRating)
    }))
    .filter((item) => item.contestId !== null && item.afterRating !== null && Number.isFinite(item.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp || a.contestId - b.contestId)
})

const yDomain = computed(() => {
  const ratings = sortedRatingHistory.value.flatMap((item) => [
    item.beforeRating,
    item.afterRating
  ]).filter((value) => value !== null)

  const min = ratings.length ? Math.min(...ratings) : 1200
  const max = ratings.length ? Math.max(...ratings) : 1800
  const padding = Math.max(50, (max - min) * 0.12)
  const roughStep = (max - min + 2 * padding) / 5
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const step = [1, 2, 5, 10].find((value) => value * magnitude >= roughStep) * magnitude
  return {
    min: Math.floor((min - padding) / step) * step,
    max: Math.ceil((max + padding) / step) * step,
    step
  }
})

const ratingToY = (rating) => {
  const { min, max } = yDomain.value
  return CHART_PADDING.top + ((max - rating) / (max - min)) * chartInnerHeight
}

const timeDomain = computed(() => {
  const history = sortedRatingHistory.value
  return { min: history[0]?.timestamp ?? 0, max: history.at(-1)?.timestamp ?? 0 }
})

const timeToX = (timestamp) => {
  const { min, max } = timeDomain.value
  if (min === max) return CHART_PADDING.left + chartInnerWidth.value / 2
  return CHART_PADDING.left + ((timestamp - min) / (max - min)) * chartInnerWidth.value
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
  const { min, max, step } = yDomain.value
  const ticks = []
  for (let value = min; value <= max; value += step) {
    ticks.push({ value, y: ratingToY(value) })
  }
  return ticks
})

const ratingPoints = computed(() => {
  const history = sortedRatingHistory.value

  return history.map((item) => ({
    ...item,
    x: timeToX(item.timestamp),
    y: ratingToY(item.afterRating),
    delta: item.beforeRating === null ? null : item.afterRating - item.beforeRating
  }))
})

const ratingLinePath = computed(() => {
  return ratingPoints.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
})

const xAxisTicks = computed(() => {
  if (!ratingPoints.value.length) return []
  const { min, max } = timeDomain.value
  if (min === max) return [{ timestamp: min, x: timeToX(min), anchor: 'middle' }]
  const count = Math.max(2, Math.min(6, Math.floor(chartInnerWidth.value / 140) + 1))
  return Array.from({ length: count }, (_, index) => {
    const timestamp = min + ((max - min) * index) / (count - 1)
    return {
      timestamp,
      x: timeToX(timestamp),
      anchor: index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'
    }
  })
})

const tickInterval = computed(() => (timeDomain.value.max - timeDomain.value.min) / Math.max(1, xAxisTicks.value.length - 1))
const showTickTime = computed(() => tickInterval.value < 86400000)
const showTickSeconds = computed(() => tickInterval.value < 60000)
const pad = (value) => String(value).padStart(2, '0')
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
const formatTime = (timestamp, seconds = false) => {
  const date = new Date(timestamp)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}${seconds ? `:${pad(date.getSeconds())}` : ''}`
}

const tooltipStyle = computed(() => {
  if (!hoveredPoint.value) return {}
  const width = Math.min(260, chartWidth.value - 16)
  const point = hoveredPoint.value
  const above = point.y > CHART_HEIGHT / 2
  return {
    width: `${width}px`,
    left: `${Math.max(8, Math.min(point.x - width / 2, chartWidth.value - width - 8))}px`,
    top: `${point.y + (above ? -12 : 12)}px`,
    transform: above ? 'translateY(-100%)' : 'none'
  }
})

const formatDelta = (delta) => {
  if (delta === null) return '-'
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

watch(() => route.params.id, (id, _previousId, onCleanup) => {
  let active = true
  onCleanup(() => { active = false })
  userInfo.value = null
  ratingHistory.value = []
  hideTooltip()
  userError.value = ''
  chartError.value = ''
  loading.value = chartLoading.value = true

  const fetchUserDetail = async () => {
    try {
      const res = await getUserDetail(id)
      if (active) userInfo.value = res.data
    } catch {
      if (active) {
        userError.value = '获取用户信息失败'
        ElMessage.error(userError.value)
      }
    } finally {
      if (active) loading.value = false
    }
  }

  const fetchRatingHistory = async () => {
    try {
      const res = await getUserRatingHistory(id)
      if (active) ratingHistory.value = Array.isArray(res.data) ? res.data : []
    } catch {
      if (active) {
        chartError.value = '获取 Rating 变化数据失败'
        ElMessage.error(chartError.value)
      }
    } finally {
      if (active) chartLoading.value = false
    }
  }

  fetchUserDetail()
  fetchRatingHistory()
}, { immediate: true })

let resizeObserver
onMounted(() => {
  const updateWidth = () => {
    const width = chartContainer.value?.clientWidth
    if (width) chartWidth.value = width
    hideTooltip()
  }
  updateWidth()
  resizeObserver = new ResizeObserver(updateWidth)
  resizeObserver.observe(chartContainer.value)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelHideTooltip()
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
  height: 360px;
}

.chart-title {
  color: #303133;
  font-size: 20px;
  font-weight: 500;
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

.rating-bands {
  opacity: 0.12;
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
  stroke: #475569;
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
  stroke: #475569;
  stroke-width: 2.5;
  pointer-events: none;
}

.rating-point:hover .rating-point-dot,
.rating-point:focus .rating-point-dot {
  fill: #475569;
  stroke-width: 4;
}

.chart-tooltip {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  color: #303133;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.tooltip-title {
  display: block;
  color: inherit;
  font-weight: 600;
  margin-bottom: 2px;
  text-decoration: none;
}

.tooltip-title:hover,
.tooltip-title:focus-visible {
  color: #409eff;
  text-decoration: underline;
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

.user-error {
  color: #909399;
}

@media (max-width: 600px) {
  .user-detail-container {
    padding: 16px;
  }

  .basic-info {
    padding: 0;
  }

  .info-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .value {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .axis-labels {
    font-size: 11px;
  }
}
</style>
