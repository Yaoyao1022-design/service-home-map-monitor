import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { DayColumn, MetricRow } from '../types'

const COLORS = ['#3c6ef0', '#3ad3d9', '#435889', '#3ec986', '#ffd83d']
const CHART_WIDTH = 320
const PLOT_TOP = 4
const PLOT_HEIGHT = 153
const AXIS_SPACE = 20
const LEGEND_PAD_TOP = 8
const LEGEND_ROW_HEIGHT = 24

function legendItemWidth(label: string) {
  return 10 + 2 + label.length * 12 + 12
}

function estimateLegendRows(labels: string[], width: number) {
  if (!labels.length) return 0
  const maxWidth = Math.max(width - 8, 80)
  let rows = 1
  let used = 0
  for (const label of labels) {
    const widthNeeded = legendItemWidth(label)
    if (used > 0 && used + widthNeeded > maxWidth) {
      rows += 1
      used = widthNeeded
    } else {
      used += widthNeeded
    }
  }
  return rows
}

function chartLayout(labels: string[]) {
  const legendRows = estimateLegendRows(labels, CHART_WIDTH)
  const gridBottom = AXIS_SPACE + (legendRows ? LEGEND_PAD_TOP + legendRows * LEGEND_ROW_HEIGHT : 0)
  return {
    gridBottom,
    height: PLOT_TOP + PLOT_HEIGHT + gridBottom,
  }
}

export type TrendGroup = {
  key: string
  label: string
  rows: MetricRow[]
}

type Props = {
  groups: TrendGroup[]
  dayColumns: DayColumn[]
  onClose: () => void
}

function numeric(value: string) {
  const n = Number(String(value).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function isPercent(row: MetricRow) {
  return row.values.some((value) => String(value).includes('%'))
}

function cleanLabel(label: string) {
  return label.replace(/\n/g, '')
}

function TrendChart({ rows, dayColumns }: { rows: MetricRow[]; dayColumns: DayColumn[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const labels = rows.map((row) => cleanLabel(row.label))
  const { gridBottom, height } = chartLayout(labels)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const chart = echarts.init(el)
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(el)
    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const hasPercent = rows.some(isPercent)
    const hasCount = rows.some((row) => !isPercent(row))
    chart.setOption(
      {
        color: COLORS,
        grid: { left: hasCount ? 36 : 8, right: hasPercent ? 36 : 8, top: PLOT_TOP, bottom: gridBottom },
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderWidth: 0,
          padding: 12,
          textStyle: { color: '#fff', fontSize: 12, lineHeight: 16 },
          extraCssText: 'border-radius: 8px;',
          formatter: (params: unknown) => {
            const list = Array.isArray(params) ? params : [params]
            return (list as { marker: string; seriesName: string; value: number }[])
              .map((item) => `${item.marker}${item.seriesName}：${item.value}`)
              .join('<br/>')
          },
        },
        legend: {
          left: 'center',
          width: CHART_WIDTH,
          bottom: 0,
          icon: 'roundRect',
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 12,
          padding: [LEGEND_PAD_TOP, 4, 0, 4],
          textStyle: { color: '#525765', fontSize: 12, lineHeight: 16, padding: [0, 0, 0, 2] },
        },
        axisPointer: {
          type: 'line',
          lineStyle: { type: 'dashed', color: '#babec7' },
          shadowStyle: { color: 'transparent' },
        },
        xAxis: {
          type: 'category',
          data: dayColumns.map((col) => col.label.replace('/', '-')),
          boundaryGap: false,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#868d9f', fontSize: 12, margin: 4 },
        },
        yAxis: [
          {
            type: 'value',
            show: hasCount,
            splitLine: {
              show: hasCount,
              lineStyle: { type: 'dashed', color: '#e4e5e9' },
            },
            axisLabel: { color: '#868d9f', fontSize: 12 },
          },
          {
            type: 'value',
            show: hasPercent,
            min: 0,
            max: 100,
            interval: 20,
            splitLine: {
              show: !hasCount,
              lineStyle: { type: 'dashed', color: '#e4e5e9' },
            },
            axisLabel: {
              color: '#868d9f',
              fontSize: 12,
              formatter: '{value}%',
            },
          },
        ],
        series: rows.map((row) => ({
          name: cleanLabel(row.label),
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          yAxisIndex: isPercent(row) ? 1 : 0,
          data: row.values.map(numeric),
          lineStyle: { width: 2 },
        })),
      },
      true,
    )
    chart.resize()
  }, [rows, gridBottom, dayColumns])

  return <div className="trend-chart" ref={ref} style={{ height }} />
}

export function TrendBoard({ groups, dayColumns, onClose }: Props) {
  const rootRef = useRef<HTMLElement>(null)
  const signature = groups.map((group) => `${group.key}:${group.rows.map((row) => row.key).join(',')}`).join('|')

  useEffect(() => {
    rootRef.current?.scrollTo({ top: 0 })
  }, [signature])

  return (
    <aside ref={rootRef} className={`trend-board ${groups.length > 1 ? 'is-stack' : ''}`} aria-label="数据趋势">
      {groups.map((group, index) => (
        <section className="trend-section" key={group.key}>
          <div className="trend-section-head">
            <h4>{group.label}</h4>
            {index === 0 && (
              <button className="trend-close" type="button" aria-label="关闭" onClick={onClose}>
                <img src="/nav/close-big.svg" alt="" width={16} height={16} />
              </button>
            )}
          </div>
          <TrendChart rows={group.rows} dayColumns={dayColumns} />
        </section>
      ))}
    </aside>
  )
}
