import * as echarts from 'echarts'

export function zoomMap(delta: number) {
  const el = document.querySelector('.map-canvas')
  if (!(el instanceof HTMLElement)) return
  const chart = echarts.getInstanceByDom(el)
  if (!chart) return
  const option = chart.getOption() as { series?: Array<{ zoom?: number }>; geo?: Array<{ zoom?: number }> }
  const current = Number(option.geo?.[0]?.zoom ?? option.series?.[0]?.zoom ?? 1.1)
  const zoom = Math.min(20, Math.max(0.8, current + delta))
  chart.setOption({
    geo: option.geo?.length ? { zoom } : undefined,
    series: [{ zoom }],
  })
}

export function resetMap() {
  const el = document.querySelector('.map-canvas')
  if (!(el instanceof HTMLElement)) return
  const chart = echarts.getInstanceByDom(el)
  chart?.dispatchAction({ type: 'restore' })
}
