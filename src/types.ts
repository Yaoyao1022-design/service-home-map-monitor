export type ViewLevel = 'nation' | 'province' | 'city' | 'station' | 'grid' | 'worker'

export type DayKind = 'actual' | 'realtime' | 'forecast'

export type FilterState = {
  province: string
  city: string
  station: string
  grid: string
  worker: string
  fulfillers: string[]
  businessLine: string
  date: string
  personType: string
  personKeyword: string
}

export type DayColumn = {
  date: string
  label: string
  kind: DayKind
  anchor: boolean
}

export type MetricRow = {
  key: string
  label: string
  values: string[]
  children?: MetricRow[]
  defaultExpanded?: boolean
}

export type MetricGroup = {
  key: string
  label: string
  rows: MetricRow[]
}

export type RankItem = {
  rank: number
  name: string
  sub?: string
  tag?: string
  tagTone?: 'orange' | 'gold' | 'brown' | 'peach'
  weather?: string
  total: number
  remain: number
  done: number
  metrics: number[]
  workerMetrics?: number[]
  capMetrics?: number[]
  effMetrics?: number[]
  scheduleMetrics?: number[]
}

export type TodayOverview = {
  unassigned: number
  activeEngineers: number
  remain: number
  done: number
  total: number
  rate: string
  updatedAt: string
}

export type BoardModel = {
  title: string
  level: ViewLevel
  tags?: string[]
  showWeatherAction: boolean
  today?: TodayOverview
  groups: MetricGroup[]
  rankTitle: string
  rankTabs: string[]
  rankNameColumn: string
  rankCountLabel: string
  ranks: RankItem[]
}

export type HeatMode = 'ratio' | 'risk' | 'temp' | 'humid'

export type HeatRegion = {
  name: string
  value: number
  adcode?: number
}

export type StationPoint = {
  name: string
  value: [number, number, number]
}
