function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function formatYuantijiTimestamp(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

export function formatYuantijiProgress(
  current: number,
  total: number,
  problemId: number,
  message: string,
  now = new Date(),
) {
  return `[${formatYuantijiTimestamp(now)}] [${current}/${total}] [题目 ${problemId}] ${message}`
}
