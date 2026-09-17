import type {
  BoardModel,
  DayColumn,
  FilterState,
  HeatMode,
  HeatRegion,
  MetricGroup,
  MetricRow,
  RankItem,
  StationPoint,
  ViewLevel,
} from '../types'
import {
  findWorker,
  gridsOfStation,
  SHIJIAZHUANG_STATION_LAYOUT,
  SHIJIAZHUANG_STATIONS,
  workerToRankSeed,
  workersOfGrid,
  workersOfStation,
} from './mapEntities'
import { publicUrl } from '../publicUrl'

export const FULFILLERS = ['安维', '五星']
export const DEFAULT_FULFILLERS = ['安维', '五星']

export const EMPTY_FILTER: FilterState = {
  province: '',
  city: '',
  station: '',
  grid: '',
  worker: '',
  fulfillers: [...DEFAULT_FULFILLERS],
  businessLine: '',
  date: '',
  personType: 'ERP',
  personKeyword: '',
}

export const BUSINESS_LINES = ['家电', '3C', '全品类']
export const PERSON_TYPES = ['ERP', '姓名', '手机号']

export const PROVINCES = [
  '河北省',
  '广东省',
  '江苏省',
  '浙江省',
  '山东省',
  '河南省',
  '四川省',
  '北京市',
  '上海市',
]

export const CITY_MAP: Record<string, string[]> = {
  河北省: ['石家庄市', '唐山市', '保定市', '邯郸市', '廊坊市', '沧州市'],
  广东省: ['广州市', '深圳市', '佛山市', '东莞市'],
  江苏省: ['南京市', '苏州市', '无锡市'],
  浙江省: ['杭州市', '宁波市', '温州市'],
  山东省: ['济南市', '青岛市'],
  河南省: ['郑州市', '洛阳市'],
  四川省: ['成都市', '绵阳市'],
  北京市: ['北京市'],
  上海市: ['上海市'],
}

export function allCities() {
  return Object.values(CITY_MAP).flat()
}

export function allStations() {
  return Object.values(STATION_MAP).flat()
}

export function provinceOfCity(city: string) {
  return Object.entries(CITY_MAP).find(([, cities]) => cities.includes(city))?.[0] ?? ''
}

export function cityOfStation(station: string) {
  return Object.entries(STATION_MAP).find(([, list]) => list.includes(station))?.[0] ?? ''
}

export function stationsOfProvince(province: string) {
  return (CITY_MAP[province] ?? []).flatMap((city) => STATION_MAP[city] ?? [])
}

export function fillParentAddress(filter: FilterState): FilterState {
  const next = { ...filter }
  if (next.worker) {
    let worker = next.city ? findWorker(next.city, STATION_MAP[next.city] ?? [], next.worker) : undefined
    if (!worker) {
      for (const [city, list] of Object.entries(STATION_MAP)) {
        worker = findWorker(city, list, next.worker)
        if (worker) break
      }
    }
    if (worker) {
      next.grid = worker.grid
      next.station = worker.station
      next.city = worker.city
    }
  }
  if (next.grid && next.station) {
    const grids = gridsOfStation(next.city, STATION_MAP[next.city] ?? [], next.station)
    if (!grids.some((item) => item.name === next.grid)) next.grid = ''
  }
  if (next.station) {
    next.city = cityOfStation(next.station) || next.city
  }
  if (next.city) {
    next.province = provinceOfCity(next.city) || next.province
  }
  return next
}

export function matchListedName(name: string, options: string[]) {
  if (!name) return ''
  if (options.includes(name)) return name
  const strip = (value: string) =>
    value.replace(/(维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市)$/g, '')
  const short = strip(name)
  return (
    options.find((item) => {
      const itemShort = strip(item)
      return itemShort === short || item.includes(short) || name.includes(itemShort)
    }) ?? name
  )
}

export const STATION_MAP: Record<string, string[]> = {
  石家庄市: SHIJIAZHUANG_STATIONS,
  唐山市: ['唐山中心服务站'],
  保定市: ['保定中心服务站'],
  邯郸市: ['邯郸中心服务站'],
  廊坊市: ['廊坊中心服务站'],
  沧州市: ['沧州中心服务站'],
  广州市: ['广州天河服务站'],
  深圳市: ['深圳南山服务站'],
  佛山市: ['佛山禅城服务站'],
  东莞市: ['东莞南城服务站'],
  南京市: ['南京鼓楼服务站'],
  苏州市: ['苏州工业园服务站'],
  无锡市: ['无锡滨湖服务站'],
  杭州市: ['杭州西湖服务站'],
  宁波市: ['宁波海曙服务站'],
  温州市: ['温州鹿城服务站'],
  济南市: ['济南历下服务站'],
  青岛市: ['青岛市南服务站'],
  郑州市: ['郑州金水服务站'],
  洛阳市: ['洛阳涧西服务站'],
  成都市: ['成都武侯服务站'],
  绵阳市: ['绵阳涪城服务站'],
  北京市: ['北京海淀服务站'],
  上海市: ['上海浦东服务站'],
}

export function todayISO() {
  const now = new Date()
  return toISODate(now)
}

function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function shiftDate(iso: string, days: number) {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

function dateLabel(iso: string) {
  const date = parseISODate(iso)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function clampFilterDate(date: string, today = todayISO()) {
  if (!date) return ''
  return date > today ? today : date
}

export function buildDayColumns(selectedDate = '', today = todayISO()): DayColumn[] {
  const picked = clampFilterDate(selectedDate, today)
  const center = picked || today
  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(center, index - 3)
    const kind: DayColumn['kind'] = date < today ? 'actual' : date > today ? 'forecast' : 'realtime'
    return {
      date,
      label: dateLabel(date),
      kind,
      anchor: Boolean(picked) && date === picked,
    }
  })
}

const HEAT_LEGEND = [
  { max: 0.8, color: '#ffd5b8' },
  { max: 1.0, color: '#ffa385' },
  { max: 1.2, color: '#ff6052' },
  { max: 1.5, color: '#ff3838' },
  { max: Infinity, color: '#cc0415' },
]

export type HeatLegendItem = { color?: string; label: string }

export const HEAT_SCHEMES: Record<HeatMode, { items: HeatLegendItem[]; unit: string }> = {
  ratio: {
    items: [
      { color: '#ffd5b8', label: '很低 ≤0.8×' },
      { color: '#ffa385', label: '较低 0.8~1.0×' },
      { color: '#ff6052', label: '中等 1.0~1.2×' },
      { color: '#ff3838', label: '较高 1.2~1.5×' },
      { color: '#cc0415', label: '很高 ≥1.5×' },
    ],
    unit: '×',
  },
  risk: {
    items: [
      { label: '排名前' },
      { color: '#ffd5b8', label: '80%-100%' },
      { color: '#ffa385', label: '60%-80%' },
      { color: '#ff6052', label: '40%-60%' },
      { color: '#ff3838', label: '20%-40%' },
      { color: '#cc0415', label: '0%-20%' },
    ],
    unit: '%',
  },
  temp: {
    items: [
      { color: '#3c6ef0', label: '严寒 <-5℃' },
      { color: '#6ca7f0', label: '偏冷 -5℃~12℃' },
      { color: '#12b35d', label: '舒适 12℃~24℃' },
      { color: '#ff7518', label: '偏热 24℃~33℃' },
      { color: '#cc0415', label: '酷热 > 33℃' },
    ],
    unit: '℃',
  },
  humid: {
    items: [
      { color: '#9cd0f0', label: '< 25%' },
      { color: '#6ca7f0', label: '25% ~ 40%' },
      { color: '#548df0', label: '40% ~ 60%' },
      { color: '#3c6ef0', label: '60% ~ 80%' },
      { color: '#0c27f0', label: '> 80%' },
    ],
    unit: '%',
  },
}

export const HEAT_ITEMS = HEAT_SCHEMES.ratio.items

export function heatModeOf(groupKey: string, rowKey: string): HeatMode {
  if (groupKey === 'risk') return 'risk'
  if (rowKey === 'hum') return 'humid'
  if (groupKey === 'weather') return 'temp'
  return 'ratio'
}

export function heatColor(value: number, mode: HeatMode = 'ratio') {
  if (mode === 'ratio') return HEAT_LEGEND.find((item) => value <= item.max)?.color ?? '#cc0415'
  if (mode === 'risk') {
    if (value < 0.2) return '#cc0415'
    if (value < 0.4) return '#ff3838'
    if (value < 0.6) return '#ff6052'
    if (value < 0.8) return '#ffa385'
    return '#ffd5b8'
  }
  if (mode === 'temp') {
    if (value < -5) return '#3c6ef0'
    if (value < 12) return '#6ca7f0'
    if (value < 24) return '#12b35d'
    if (value < 33) return '#ff7518'
    return '#cc0415'
  }
  if (value < 25) return '#9cd0f0'
  if (value < 40) return '#6ca7f0'
  if (value < 60) return '#548df0'
  if (value < 80) return '#3c6ef0'
  return '#0c27f0'
}

export function heatBucketLabel(mode: HeatMode, value: number) {
  if (mode === 'ratio') return `${value}×`
  if (mode === 'risk') {
    if (value < 0.2) return '排名前 0%-20%'
    if (value < 0.4) return '排名前 20%-40%'
    if (value < 0.6) return '排名前 40%-60%'
    if (value < 0.8) return '排名前 60%-80%'
    return '排名前 80%-100%'
  }
  if (mode === 'temp') {
    if (value < -5) return '严寒 <-5℃'
    if (value < 12) return '偏冷 -5℃~12℃'
    if (value < 24) return '舒适 12℃~24℃'
    if (value < 33) return '偏热 24℃~33℃'
    return '酷热 > 33℃'
  }
  if (value < 25) return '< 25%'
  if (value < 40) return '25% ~ 40%'
  if (value < 60) return '40% ~ 60%'
  if (value < 80) return '60% ~ 80%'
  return '> 80%'
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function tooltipName(name: string) {
  return name.replace(/(维吾尔自治区|壮族自治区|回族自治区|特别行政区|自治区|省|市)$/g, '') || name
}

function tooltipValue(mode: HeatMode, value: number) {
  if (mode === 'ratio') return String(Math.round(value * 100000))
  if (mode === 'risk') return `${Math.round(value * 100)}%`
  if (mode === 'temp') return `${value}℃`
  return `${value}%`
}

export function metricTitleOf(rowKey: string) {
  const visit = (rows: MetricRow[]): string | undefined => {
    for (const row of rows) {
      if (row.key === rowKey) return row.label.replace(/\n/g, '')
      if (row.children) {
        const nested = visit(row.children)
        if (nested) return nested
      }
    }
  }
  for (const group of metricGroups('title', true)) {
    const found = visit(group.rows)
    if (found) return found
  }
  return rowKey
}

export function formatHeatValue(mode: HeatMode, value?: number) {
  if (value == null) return ''
  return tooltipValue(mode, value)
}

export function formatHeatTooltip(mode: HeatMode, name: string, value?: number) {
  const label = escapeHtml(tooltipName(name))
  const amount = value == null ? '' : `<span class="map-tip-value">${escapeHtml(tooltipValue(mode, value))}</span>`
  return `<div class="map-tip"><span class="map-tip-name">${label}</span>${amount}<img class="map-tip-arrow" src="${publicUrl('icons/tooltip-arrow.svg')}" width="10" height="6" alt="" /></div>`
}

function hash(text: string) {
  let n = 0
  for (const ch of text) n = (n * 31 + ch.charCodeAt(0)) >>> 0
  return n
}

function scaleNum(seed: string, base: number, index: number) {
  const n = hash(`${seed}-${index}`)
  const v = Math.round(base * (0.7 + (n % 80) / 100))
  if (v >= 100000) return `${(v / 10000).toFixed(1)}万`
  return String(v)
}

function series(seed: string, bases: number[]): string[] {
  return bases.map((base, i) => scaleNum(seed, base, i))
}

function metricGroups(seed: string, withWeather: boolean): MetricGroup[] {
  const groups: MetricGroup[] = [
    {
      key: 'order',
      label: '单量',
      rows: [
        { key: 'download', label: '下传单量', values: series(`${seed}-d`, [4800, 7300, 4800, 7300, 5900, 5900, 2700]) },
        { key: 'deliver', label: '妥投单量', values: series(`${seed}-t`, [8600, 2700, 8600, 3100, 12300, 3100, 34300]) },
        { key: 'cancel', label: '取消单量', values: series(`${seed}-c`, [6200, 7800, 12300, 4500, 9000, 6200, 1300]) },
        { key: 'done', label: '完成单量', values: series(`${seed}-f`, [6200, 7800, 12300, 4500, 9000, 6200, 1300]) },
        { key: 'left', label: '遗留单量', values: series(`${seed}-l`, [12300, 24000, 6500, 9900, 12300, 7500, 1800]) },
      ],
    },
    {
      key: 'worker',
      label: '工人',
      rows: [
        {
          key: 'total',
          label: '总人数',
          values: series(`${seed}-wt`, [860, 820, 840, 880, 900, 890, 870]),
          defaultExpanded: true,
          children: [
            { key: 'self', label: '自营人数', values: series(`${seed}-ws`, [320, 310, 315, 330, 340, 335, 328]) },
            { key: 'direct', label: '直营人数', values: series(`${seed}-wd`, [210, 208, 212, 220, 226, 224, 218]) },
            { key: 'third', label: '三方人数', values: series(`${seed}-w3`, [330, 302, 313, 330, 334, 331, 324]) },
          ],
        },
        {
          key: 'attend',
          label: '出勤人数',
          values: series(`${seed}-wa`, [790, 760, 770, 810, 830, 820, 800]),
          children: [
            { key: 'attend-self', label: '自营出勤', values: series(`${seed}-was`, [290, 280, 285, 300, 310, 305, 298]) },
            { key: 'attend-direct', label: '直营出勤', values: series(`${seed}-wad`, [190, 185, 188, 196, 202, 200, 194]) },
            { key: 'attend-third', label: '三方出勤', values: series(`${seed}-wat`, [310, 295, 297, 314, 318, 315, 308]) },
          ],
        },
        {
          key: 'eff',
          label: '人效',
          values: series(`${seed}-we`, [12, 11, 13, 12, 14, 13, 12]),
          children: [
            { key: 'eff-self', label: '自营人效', values: series(`${seed}-wes`, [13, 12, 14, 13, 15, 14, 13]) },
            { key: 'eff-direct', label: '直营人效', values: series(`${seed}-wed`, [11, 10, 12, 11, 13, 12, 11]) },
            { key: 'eff-third', label: '三方人效', values: series(`${seed}-wet`, [10, 9, 11, 10, 12, 11, 10]) },
          ],
        },
      ],
    },
    {
      key: 'cap',
      label: '产能',
      rows: [
        {
          key: 'capTotal',
          label: '总产能',
          values: series(`${seed}-ct`, [12000, 11800, 12100, 12500, 12800, 12600, 12400]),
          defaultExpanded: true,
          children: [
            { key: 'capUsed', label: '已用产能', values: series(`${seed}-cu`, [9800, 9100, 10200, 10800, 11200, 10900, 10100]) },
            { key: 'capLeft', label: '剩余产能', values: series(`${seed}-cl`, [2200, 2700, 1900, 1700, 1600, 1700, 2300]) },
          ],
        },
      ],
    },
    {
      key: 'risk',
      label: '风险',
      rows: [
        { key: 'finish3', label: '日均3日\n完结率', values: ['92%', '90%', '91%', '88%', '89%', '90%', '91%'] },
        { key: 'undeliver', label: '整体妥投\n未结风险', values: ['6%', '7%', '6%', '9%', '8%', '7%', '6%'] },
      ],
    },
  ]

  if (withWeather) {
    groups.push({
      key: 'weather',
      label: '天气',
      rows: [
        { key: 'temp', label: '温度', values: ['18°', '19°', '21°', '22°', '20°', '17°', '16°'] },
        { key: 'hum', label: '湿度', values: ['54%', '58%', '60%', '62%', '57%', '52%', '49%'] },
        { key: 'feel', label: '体感温度', values: ['17°', '18°', '20°', '21°', '19°', '16°', '15°'] },
      ],
    })
  }
  return groups
}

function toRanks(
  names: string[],
  weather = false,
  engineers: Array<Omit<RankItem, 'rank' | 'total' | 'remain' | 'done' | 'metrics'>> | false = false,
  keyword = '',
): RankItem[] {
  const source = engineers
    ? engineers.filter((item) => !keyword || item.name.includes(keyword))
    : names.map((name) => ({ name, weather: weather ? '35°C  60%' : undefined }))

  return source.slice(0, 24).map((item, i) => {
    const total = 12 + ((hash(item.name) + i * 7) % 18)
    const remain = 5 + ((hash(`${item.name}-r`) + i) % 12)
    const done = Math.max(1, total - remain)
    const extraA = 8 + ((hash(`${item.name}-a`) + i * 3) % 15)
    const extraB = 6 + ((hash(`${item.name}-b`) + i * 5) % 12)
    const people = 28 + ((hash(`${item.name}-p`) + i * 5) % 36)
    const attend = Math.max(8, people - (2 + ((hash(`${item.name}-at`) + i) % 8)))
    const eff = 8 + ((hash(`${item.name}-e`) + i) % 9)
    const capTotal = 90 + ((hash(`${item.name}-ct`) + i * 4) % 80)
    const capUsed = Math.max(20, capTotal - (8 + ((hash(`${item.name}-cu`) + i) % 28)))
    const attend7 = 3 + ((hash(`${item.name}-a7`) + i) % 5)
    const done7 = 18 + ((hash(`${item.name}-d7`) + i * 3) % 28)
    const nextDay = 6 + ((hash(`${item.name}-nd`) + i * 2) % 16)
    const next3 = nextDay + 10 + ((hash(`${item.name}-n3`) + i) % 18)
    const serviceMin = 48 + ((hash(`${item.name}-sv`) + i * 4) % 132)
    const transitMin = 18 + ((hash(`${item.name}-tr`) + i * 3) % 72)
    return {
      rank: i + 1,
      name: item.name,
      sub: 'sub' in item ? item.sub : undefined,
      tag: 'tag' in item ? item.tag : undefined,
      tagTone: 'tagTone' in item ? item.tagTone : undefined,
      weather: 'weather' in item ? item.weather : undefined,
      total,
      remain,
      done,
      metrics: engineers ? [total, remain, done] : [total, remain, done, extraA, extraB],
      workerMetrics: engineers ? undefined : [people, attend, eff],
      capMetrics: engineers ? undefined : [capTotal, capUsed],
      effMetrics: engineers ? [attend7, done7, serviceMin, transitMin] : undefined,
      scheduleMetrics: engineers ? [nextDay, next3] : undefined,
    }
  })
}

export function resolveLevel(filter: FilterState): ViewLevel {
  if (filter.worker) return 'worker'
  if (filter.grid) return 'grid'
  if (filter.station) return 'station'
  if (filter.city) return 'city'
  if (filter.province) return 'province'
  return 'nation'
}

export function buildBoard(filter: FilterState): BoardModel {
  const level = resolveLevel(filter)
  const seed =
    [filter.province, filter.city, filter.station, filter.grid, filter.worker, filter.businessLine]
      .filter(Boolean)
      .join('/') || '全国'
  const cityStations = filter.city ? (STATION_MAP[filter.city] ?? []) : []

  if (level === 'worker') {
    const worker = findWorker(filter.city, cityStations, filter.worker)
    const peers = worker
      ? workersOfGrid(filter.city, cityStations, worker.station, worker.grid)
      : workersOfStation(filter.city, cityStations, filter.station)
    return {
      title: filter.worker,
      level,
      tags: worker ? [worker.tag, `${worker.levelLabel} ${worker.skill}`, worker.grid] : ['师傅'],
      showWeatherAction: false,
      today: {
        unassigned: worker ? Math.max(0, 6 - (worker.todayOrders % 5)) : 2,
        activeEngineers: 1,
        remain: worker ? 3 + (worker.todayOrders % 4) : 4,
        done: worker?.todayOrders ?? 8,
        total: (worker?.todayOrders ?? 8) + 4,
        rate: '92%',
        updatedAt: '更新于10:32',
      },
      groups: metricGroups(seed, true),
      rankTitle: '工程师排名',
      rankTabs: ['单量', '效能', '排单'],
      rankNameColumn: '工程师',
      rankCountLabel: `共${Math.max(peers.length, 1)}人`,
      ranks: toRanks([], false, peers.map(workerToRankSeed), filter.personKeyword),
    }
  }

  if (level === 'grid') {
    const workers = workersOfGrid(filter.city, cityStations, filter.station, filter.grid)
    return {
      title: filter.grid,
      level,
      tags: ['三方', `${workers.length}名工程师`],
      showWeatherAction: false,
      today: {
        unassigned: 8 + workers.length,
        activeEngineers: workers.filter((item) => item.status === '作业中').length || workers.length,
        remain: 12 + workers.length,
        done: workers.reduce((sum, item) => sum + item.todayOrders, 0),
        total: 28 + workers.length * 4,
        rate: '88%',
        updatedAt: '更新于10:32',
      },
      groups: [],
      rankTitle: '工程师排名',
      rankTabs: ['单量', '效能', '排单'],
      rankNameColumn: '工程师',
      rankCountLabel: `共${workers.length}人`,
      ranks: toRanks([], false, workers.map(workerToRankSeed), filter.personKeyword),
    }
  }

  if (level === 'station') {
    const grids = gridsOfStation(filter.city, cityStations, filter.station)
    const workers = workersOfStation(filter.city, cityStations, filter.station)
    return {
      title: filter.station,
      level,
      tags: ['三方', `${workers.length}名工程师`, `${grids.length}个网格`],
      showWeatherAction: false,
      today: {
        unassigned: 40,
        activeEngineers: workers.filter((item) => item.status === '作业中').length || 12,
        remain: 60,
        done: workers.reduce((sum, item) => sum + item.todayOrders, 0) || 112,
        total: 172,
        rate: '20%',
        updatedAt: '更新于10:32',
      },
      groups: metricGroups(seed, true),
      rankTitle: '工程师排名',
      rankTabs: ['单量', '效能', '排单'],
      rankNameColumn: '工程师',
      rankCountLabel: `共${workers.length}人`,
      ranks: toRanks([], false, workers.map(workerToRankSeed), filter.personKeyword),
    }
  }

  if (level === 'city') {
    const stations = STATION_MAP[filter.city] ?? ['中心服务站']
    return {
      title: filter.city,
      level,
      showWeatherAction: false,
      groups: metricGroups(seed, true),
      rankTitle: '网点排名',
      rankTabs: ['单量', '工人', '产能'],
      rankNameColumn: '网点',
      rankCountLabel: `共${stations.length}个`,
      ranks: toRanks(stations, true),
    }
  }

  if (level === 'province') {
    const cities = CITY_MAP[filter.province] ?? ['中心城市']
    return {
      title: filter.province,
      level,
      showWeatherAction: false,
      groups: metricGroups(seed, true),
      rankTitle: '城市排名',
      rankTabs: ['单量', '工人', '产能'],
      rankNameColumn: '城市',
      rankCountLabel: `共${cities.length}个`,
      ranks: toRanks(cities, true),
    }
  }

  return {
    title: '全国',
    level,
    showWeatherAction: true,
    groups: metricGroups(seed, false),
    rankTitle: '省份排名',
    rankTabs: ['单量', '工人', '产能'],
    rankNameColumn: '省份',
    rankCountLabel: '共29个',
    ranks: toRanks(PROVINCES, true),
  }
}

export function heatForNames(names: string[], mode: HeatMode = 'ratio', seed = ''): HeatRegion[] {
  return names.filter(Boolean).map((name) => {
    const n = hash(`${seed}-${name}`)
    let value = 0
    if (mode === 'ratio') value = Number((0.55 + (n % 130) / 100).toFixed(2))
    else if (mode === 'risk') value = Number(((n % 100) / 100).toFixed(2))
    else if (mode === 'temp') value = Number((-8 + (n % 48) + (n % 10) / 10).toFixed(1))
    else value = (n % 88) + 10
    return { name, value }
  })
}

export const STATION_POINTS: StationPoint[] = SHIJIAZHUANG_STATION_LAYOUT.map((item, index) => ({
  name: item.name,
  value: [item.center[0], item.center[1], Number((0.7 + (index % 8) / 10).toFixed(2))],
}))

export function breadcrumb(filter: FilterState) {
  const items = ['全国']
  if (filter.province) items.push(filter.province)
  if (filter.city) items.push(filter.city)
  if (filter.station) items.push(filter.station)
  if (filter.grid) items.push(filter.grid)
  return items
}
