import type { RankItem } from '../types'

export type MapFence = {
  name: string
  kind: 'station' | 'grid'
  city: string
  station: string
  coords: [number, number][]
  center: [number, number]
  color: string
  radius: number
}

export type MapWorker = {
  name: string
  city: string
  station: string
  grid: string
  lng: number
  lat: number
  skill: string
  levelLabel: string
  tag: string
  tagTone: RankItem['tagTone']
  phone: string
  todayOrders: number
  status: '作业中' | '空闲' | '休息'
  track: [number, number][]
}

export type CityMapEntities = {
  stations: MapFence[]
  grids: MapFence[]
  workers: MapWorker[]
}

const CITY_CENTERS: Record<string, [number, number]> = {
  石家庄市: [114.5149, 38.0428],
  唐山市: [118.1802, 39.6305],
  保定市: [115.4823, 38.8676],
  邯郸市: [114.4907, 36.6123],
  廊坊市: [116.7036, 39.5186],
  沧州市: [116.8575, 38.3106],
  广州市: [113.2644, 23.1291],
  深圳市: [114.0579, 22.5431],
  佛山市: [113.122, 23.0288],
  东莞市: [113.7463, 23.0462],
  南京市: [118.7969, 32.0603],
  苏州市: [120.5853, 31.2989],
  无锡市: [120.3119, 31.4912],
  杭州市: [120.1551, 30.2741],
  宁波市: [121.544, 29.8683],
  温州市: [120.6994, 28.0006],
  济南市: [117.1205, 36.6519],
  青岛市: [120.3826, 36.0671],
  郑州市: [113.6254, 34.7466],
  洛阳市: [112.454, 34.6197],
  成都市: [104.0665, 30.5728],
  绵阳市: [104.679, 31.4678],
  北京市: [116.4074, 39.9042],
  上海市: [121.4737, 31.2304],
}

type StationLayout = {
  name: string
  center: [number, number]
  radius: number
}

/** 石家庄约 20 个网点：城区成团重叠，郊县分散 */
export const SHIJIAZHUANG_STATION_LAYOUT: StationLayout[] = [
  { name: '桥西服务站', center: [114.468, 38.042], radius: 0.032 },
  { name: '新华服务站', center: [114.482, 38.056], radius: 0.03 },
  { name: '中山服务站', center: [114.492, 38.046], radius: 0.026 },
  { name: '长安服务站', center: [114.538, 38.042], radius: 0.034 },
  { name: '裕华服务站', center: [114.526, 38.02], radius: 0.032 },
  { name: '槐安服务站', center: [114.506, 38.028], radius: 0.025 },
  { name: '谈固服务站', center: [114.568, 38.038], radius: 0.028 },
  { name: '宋营服务站', center: [114.552, 38.01], radius: 0.024 },
  { name: '鹿泉服务站', center: [114.318, 38.086], radius: 0.048 },
  { name: '循环园区服务站', center: [114.708, 38.072], radius: 0.036 },
  { name: '正定服务站', center: [114.572, 38.148], radius: 0.042 },
  { name: '正定新区服务站', center: [114.608, 38.126], radius: 0.034 },
  { name: '新乐服务站', center: [114.688, 38.344], radius: 0.05 },
  { name: '藁城服务站', center: [114.848, 38.022], radius: 0.046 },
  { name: '晋州服务站', center: [115.044, 38.034], radius: 0.044 },
  { name: '无极服务站', center: [114.978, 38.178], radius: 0.04 },
  { name: '栾城服务站', center: [114.648, 37.902], radius: 0.04 },
  { name: '赵县服务站', center: [114.776, 37.756], radius: 0.044 },
  { name: '元氏服务站', center: [114.526, 37.766], radius: 0.04 },
  { name: '井陉服务站', center: [114.142, 38.032], radius: 0.052 },
]

export const SHIJIAZHUANG_STATIONS = SHIJIAZHUANG_STATION_LAYOUT.map((item) => item.name)

const STATION_LAYOUT_BY_NAME = Object.fromEntries(
  SHIJIAZHUANG_STATION_LAYOUT.map((item) => [item.name, item]),
) as Record<string, StationLayout>

const FENCE_COLORS = ['#3c6ef0', '#12b35d', '#ff7518', '#cc0415', '#435889', '#3ad3d9']
const SKILLS = ['空调', '冰箱', '洗衣机', '厨电', '采暖', '3C']
const LEVELS = ['L2', 'L3', 'L4', 'L5']
const TAGS: Array<{ tag: string; tagTone: RankItem['tagTone'] }> = [
  { tag: '好工人', tagTone: 'orange' },
  { tag: '资深技师', tagTone: 'gold' },
  { tag: '维修专家', tagTone: 'brown' },
  { tag: '新员工', tagTone: 'peach' },
]
const STATUSES: MapWorker['status'][] = ['作业中', '空闲', '休息']
const SURNAMES = '王李张刘陈杨黄赵周吴徐孙马朱胡郭何林高罗郑梁谢宋唐许韩冯邓曹彭'
const GIVEN = ['建国', '思远', '明辉', '浩然', '晓东', '志强', '海涛', '俊杰', '雪梅', '婷婷', '丽华', '文博', '嘉伟', '子涵', '雨桐', '伟华', '金龙', '鹏飞']

const cache = new Map<string, CityMapEntities>()
const usedNames = new Set<string>()

function hash(text: string) {
  let n = 0
  for (const ch of text) n = (n * 31 + ch.charCodeAt(0)) >>> 0
  return n
}

function pickName(seed: string) {
  for (let i = 0; i < 80; i += 1) {
    const n = hash(`${seed}-${i}`)
    const name = `${SURNAMES[n % SURNAMES.length]}${GIVEN[(n >>> 4) % GIVEN.length]}`
    if (!usedNames.has(name)) {
      usedNames.add(name)
      return name
    }
  }
  const fallback = `${seed.slice(-2)}${hash(seed) % 90}`
  usedNames.add(fallback)
  return fallback
}

function organicRing(center: [number, number], radius: number, seed: string, sideCount?: number): [number, number][] {
  const sides = sideCount ?? 10 + (hash(`${seed}-sides`) % 5)
  const twist = ((hash(`${seed}-twist`) % 62) / 100) * Math.PI
  const stretchX = 0.95 + (hash(`${seed}-sx`) % 70) / 100
  const stretchY = 0.68 + (hash(`${seed}-sy`) % 55) / 100
  return Array.from({ length: sides }, (_, index) => {
    const angle = (Math.PI * 2 * index) / sides + twist
    const n = hash(`${seed}-${index}`)
    const lobe = Math.sin(angle * (2 + (n % 3)) + (n % 12) / 10) * 0.22
    const r = radius * (0.55 + (n % 52) / 100 + lobe)
    return [
      center[0] + r * Math.cos(angle) * stretchX,
      center[1] + r * Math.sin(angle) * stretchY,
    ] as [number, number]
  })
}

function polygonCentroid(coords: [number, number][]): [number, number] {
  const areaWeight = coords.reduce((sum, _, index) => {
    const [x1, y1] = coords[index]
    const [x2, y2] = coords[(index + 1) % coords.length]
    return sum + (x1 * y2 - x2 * y1)
  }, 0)
  if (Math.abs(areaWeight) < 1e-12) {
    const n = coords.length || 1
    return [
      coords.reduce((sum, [x]) => sum + x, 0) / n,
      coords.reduce((sum, [, y]) => sum + y, 0) / n,
    ]
  }
  const cx =
    coords.reduce((sum, _, index) => {
      const [x1, y1] = coords[index]
      const [x2, y2] = coords[(index + 1) % coords.length]
      return sum + (x1 + x2) * (x1 * y2 - x2 * y1)
    }, 0) /
    (3 * areaWeight)
  const cy =
    coords.reduce((sum, _, index) => {
      const [x1, y1] = coords[index]
      const [x2, y2] = coords[(index + 1) % coords.length]
      return sum + (y1 + y2) * (x1 * y2 - x2 * y1)
    }, 0) /
    (3 * areaWeight)
  return [cx, cy]
}

function placeGridCenters(
  stationCenter: [number, number],
  radius: number,
  count: number,
  seed: string,
): [number, number][] {
  if (count <= 1) return [stationCenter]
  const dist = radius * 0.92
  return Array.from({ length: count }, (_, index) => {
    const n = hash(`${seed}-gc-${index}`)
    const ang = (Math.PI * 2 * index) / count - Math.PI / 5 + ((n % 18) - 9) / 90
    const stretch = 0.92 + (n % 14) / 80
    return [
      stationCenter[0] + Math.cos(ang) * dist * stretch * 1.15,
      stationCenter[1] + Math.sin(ang) * dist * stretch * 0.92,
    ]
  })
}

function stationCenter(city: string, station: string, index: number, total: number): [number, number] {
  const layout = STATION_LAYOUT_BY_NAME[station]
  if (layout) return layout.center
  const base = CITY_CENTERS[city] ?? [114.5, 38]
  if (total <= 1) return base
  const cluster = index % 3
  const inCluster = Math.floor(index / 3)
  if (cluster < 2 && inCluster < 4) {
    const origin: [number, number] =
      cluster === 0 ? [base[0] - 0.02, base[1] + 0.01] : [base[0] + 0.03, base[1] - 0.01]
    const jitter = ((hash(`${station}-j`) % 24) - 12) / 1000
    return [origin[0] + ((inCluster % 2) * 0.018 + jitter), origin[1] + Math.floor(inCluster / 2) * 0.016]
  }
  const angle = (Math.PI * 2 * index) / Math.max(total, 8) - Math.PI / 3
  const dist = 0.06 + (hash(station) % 50) / 400
  return [base[0] + Math.cos(angle) * dist * 1.6, base[1] + Math.sin(angle) * dist]
}

function stationRadius(station: string, index: number) {
  const layout = STATION_LAYOUT_BY_NAME[station]
  if (layout) return layout.radius
  return 0.028 + (hash(`${station}-${index}`) % 22) / 1000
}

function gridNamesOf(station: string) {
  const short = station.replace(/服务站$/, '')
  const extra = hash(station) % 3 === 0
  return extra ? [`${short}一网格`, `${short}二网格`, `${short}三网格`] : [`${short}一网格`, `${short}二网格`]
}

function workerTrack(lng: number, lat: number, seed: string): [number, number][] {
  const n = hash(seed)
  const startAngle = (n % 12) / 12 * Math.PI
  const path = Array.from({ length: 5 }, (_, index) => {
    const t = (index + 1) / 5
    const ang = startAngle + t * Math.PI * 1.15
    const dist = 0.012 - t * 0.008
    return [lng + Math.cos(ang) * dist * 1.2, lat + Math.sin(ang) * dist] as [number, number]
  })
  path.push([lng, lat])
  return path
}

function pointInRing(point: [number, number], ring: [number, number][]) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function scatterInPolygon(
  coords: [number, number][],
  center: [number, number],
  index: number,
  total: number,
  seed: string,
): [number, number] {
  const n = hash(`${seed}-scatter-${index}`)
  const maxDx = Math.max(...coords.map(([x]) => Math.abs(x - center[0])), 0.004)
  const maxDy = Math.max(...coords.map(([, y]) => Math.abs(y - center[1])), 0.004)
  const golden = Math.PI * (3 - Math.sqrt(5))
  const ang = index * golden + ((n % 50) / 100) * 0.6
  const radius = 0.22 + 0.55 * Math.sqrt((index + 0.35) / Math.max(total, 1))
  for (let step = 0; step < 10; step += 1) {
    const scale = radius * (1 - step * 0.08)
    const point: [number, number] = [
      center[0] + Math.cos(ang) * maxDx * scale,
      center[1] + Math.sin(ang) * maxDy * scale,
    ]
    if (pointInRing(point, coords)) return point
  }
  return [
    center[0] + Math.cos(ang) * maxDx * 0.12,
    center[1] + Math.sin(ang) * maxDy * 0.12,
  ]
}

function buildCityEntities(city: string, stations: string[]): CityMapEntities {
  const stationFences: MapFence[] = stations.map((station, index) => {
    const center = stationCenter(city, station, index, stations.length)
    const radius = stationRadius(station, index)
    return {
      name: station,
      kind: 'station',
      city,
      station,
      center,
      radius,
      coords: organicRing(center, radius, station),
      color: FENCE_COLORS[index % FENCE_COLORS.length],
    }
  })

  const grids: MapFence[] = []
  const workers: MapWorker[] = []

  stationFences.forEach((stationFence) => {
    const names = gridNamesOf(stationFence.station)
    const centers = placeGridCenters(stationFence.center, stationFence.radius, names.length, stationFence.station)
    names.forEach((gridName, index) => {
      const center = centers[index] ?? stationFence.center
      const gridRadius = Math.max(0.018, stationFence.radius * 0.7)
      const coords = organicRing(center, gridRadius, gridName, 5 + (hash(gridName) % 2))
      const color = FENCE_COLORS[(index + 2) % FENCE_COLORS.length]
      grids.push({
        name: gridName,
        kind: 'grid',
        city,
        station: stationFence.station,
        center: polygonCentroid(coords),
        radius: gridRadius,
        coords,
        color,
      })
      const count = 6 + (hash(`${stationFence.station}-${gridName}-count`) % 3)
      for (let i = 0; i < count; i += 1) {
        const n = hash(`${stationFence.station}-${gridName}-${i}`)
        const [lng, lat] = scatterInPolygon(coords, polygonCentroid(coords), i, count, `${stationFence.station}-${gridName}`)
        const tag = TAGS[n % TAGS.length]
        workers.push({
          name: pickName(`${stationFence.station}-${gridName}-${i}`),
          city,
          station: stationFence.station,
          grid: gridName,
          lng,
          lat,
          skill: SKILLS[n % SKILLS.length],
          levelLabel: LEVELS[n % LEVELS.length],
          tag: tag.tag,
          tagTone: tag.tagTone,
          phone: `138****${String(1000 + (n % 9000)).slice(0, 4)}`,
          todayOrders: 4 + (n % 16),
          status: STATUSES[n % STATUSES.length],
          track: workerTrack(lng, lat, `${stationFence.station}-${gridName}-${i}`),
        })
      }
    })
  })

  return { stations: stationFences, grids, workers }
}

export function cityMapEntities(city: string, stations: string[]): CityMapEntities {
  const key = `v5:${city}:${stations.join(',')}`
  const hit = cache.get(key)
  if (hit) return hit
  const built = buildCityEntities(city, stations)
  cache.set(key, built)
  return built
}

export function stationFenceOf(city: string, stations: string[], station: string) {
  return cityMapEntities(city, stations).stations.find((item) => item.name === station)
}

export function gridsOfStation(city: string, stations: string[], station: string) {
  return cityMapEntities(city, stations).grids.filter((item) => item.station === station)
}

export function workersOfStation(city: string, stations: string[], station: string) {
  return cityMapEntities(city, stations).workers.filter((item) => item.station === station)
}

export function workersOfGrid(city: string, stations: string[], station: string, grid: string) {
  return workersOfStation(city, stations, station).filter((item) => item.grid === grid)
}

export function findWorker(city: string, stations: string[], name: string) {
  return cityMapEntities(city, stations).workers.find((item) => item.name === name)
}

export function findGrid(city: string, stations: string[], station: string, grid: string) {
  return gridsOfStation(city, stations, station).find((item) => item.name === grid)
}

export function workerToRankSeed(worker: MapWorker) {
  return {
    name: worker.name,
    tag: worker.tag,
    tagTone: worker.tagTone,
    sub: `${worker.levelLabel} ${worker.skill}`,
  }
}

export function formatFenceTooltip(name: string, extra?: string) {
  const amount = extra ? `<span class="map-tip-value">${extra}</span>` : ''
  return `<div class="map-tip"><span class="map-tip-name">${name}</span>${amount}<img class="map-tip-arrow" src="/icons/tooltip-arrow.svg" width="10" height="6" alt="" /></div>`
}

export function formatWorkerTooltip(worker: MapWorker) {
  return `<div class="map-tip is-worker"><span class="map-tip-name">${worker.name}</span><img class="map-tip-arrow" src="/icons/tooltip-arrow.svg" width="10" height="6" alt="" /></div>`
}

export function isDeepMapLevel(level: string) {
  return level === 'city' || level === 'station' || level === 'grid' || level === 'worker'
}

export function isPersonLevel(level: string) {
  return level === 'station' || level === 'grid' || level === 'worker'
}
