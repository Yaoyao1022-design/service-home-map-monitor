import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import type { FilterState, HeatMode, HeatRegion, ViewLevel } from '../types'
import { formatHeatTooltip, formatHeatValue, heatColor, heatForNames, STATION_MAP } from '../data/mock'
import {
  cityMapEntities,
  isDeepMapLevel,
  type MapFence,
  type MapWorker,
} from '../data/mapEntities'
import { publicUrl } from '../publicUrl'

type Props = {
  level: ViewLevel
  geo: object | null
  heat: HeatRegion[]
  heatMode: HeatMode
  heatSeed: string
  heatTitle: string
  filter: FilterState
  boardCollapsed?: boolean
  onRegionClick: (name: string) => void
  onStationClick: (name: string) => void
  onGridClick: (name: string) => void
  onWorkerClick: (name: string) => void
}

type BBox = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  cx: number
  cy: number
  w: number
  h: number
}

function paintRegion(name: string, value: number, mode: HeatMode) {
  const color = heatColor(value, mode)
  return {
    name,
    value,
    itemStyle: { areaColor: color, opacity: 0.8 },
    emphasis: { itemStyle: { areaColor: color, opacity: 1 } },
  }
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

function findFenceAt(fences: MapFence[], lnglat: number[]) {
  const point = lnglat as [number, number]
  for (let i = fences.length - 1; i >= 0; i -= 1) {
    if (pointInRing(point, fences[i].coords)) return fences[i]
  }
}

function regionLngLat(geo: object | null, name: string): [number, number] | undefined {
  const features = (geo as { features?: Array<{ properties?: { name?: string; center?: [number, number]; centroid?: [number, number] } }> } | null)?.features
  const props = features?.find((item) => item.properties?.name === name)?.properties
  return props?.centroid ?? props?.center
}

function isGeoPoint(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length >= 2 && value[0] > 70 && value[0] < 140 && value[1] > 15 && value[1] < 55
}

const CITY_OUTLINE_FILL = 'rgba(35, 37, 43, 0.1)'
const CITY_OUTLINE_STROKE = '#868D9F'
const PIN_SIZE = 40
const PIN_TIP_OFFSET = 16
const PIN_SERIES = ['网点定位点', '网格定位点'] as const

const PIN_BODY =
  'M6 15.8387C6 8.1958 12.268 2 20 2C27.732 2 34 8.1958 34 15.8387C34 22.4286 31.0027 25.5913 28.7378 27.9201C26.473 30.2488 21.099 34.265 21.099 34.265C19.9976 35.2448 19.9747 35.245 18.8731 34.2654C18.8731 34.2654 13.7778 30.3481 11.4058 27.9201C9.03388 25.492 6 22.4286 6 15.8387Z'
const PIN_STROKE =
  'M20 3C27.1907 3 33 8.75914 33 15.8389C33 18.9704 32.2906 21.2444 31.3389 23.001C30.3786 24.7732 29.1515 26.0597 28.0205 27.2227C26.9378 28.3359 25.0752 29.8866 23.4463 31.1836C22.6391 31.8263 21.9018 32.3975 21.3662 32.8076C21.0986 33.0126 20.8813 33.1768 20.7314 33.29C20.6566 33.3466 20.5988 33.3905 20.5596 33.4199C20.54 33.4347 20.5246 33.4457 20.5146 33.4531C20.5098 33.4568 20.5063 33.4601 20.5039 33.4619C20.5028 33.4628 20.5015 33.4635 20.501 33.4639H20.5L20.4658 33.4893L20.4346 33.5176C20.2323 33.6976 20.0906 33.817 19.9854 33.9023C19.8803 33.8172 19.7397 33.6978 19.5381 33.5186L19.5107 33.4941L19.4824 33.4727L19.4795 33.4697C19.4772 33.468 19.4734 33.4655 19.4688 33.4619C19.4594 33.4547 19.4452 33.444 19.4268 33.4297C19.3895 33.4009 19.3339 33.3581 19.2627 33.3027C19.1202 33.192 18.9136 33.0311 18.6582 32.8301C18.1469 32.4276 17.4405 31.8652 16.6611 31.2285C15.0913 29.9461 13.2638 28.3914 12.1211 27.2217C10.9275 25.9998 9.66782 24.714 8.68652 22.9531C7.71649 21.2123 7.00003 18.9671 7 15.8389C7 8.75914 12.8093 3 20 3Z'
const PIN_HOME =
  'M21.2556 10.6319L25.2556 12.6621C26.1243 13.103 26.6668 13.9633 26.6668 14.8998V20.7987C26.6668 22.186 25.4844 23.3107 24.0258 23.3107H23.4959C22.33 23.3107 21.3848 22.4117 21.3848 21.3027V20.6117C21.3848 19.8844 20.7649 19.2947 20.0002 19.2947C19.2355 19.2947 18.6155 19.8844 18.6155 20.6117V21.3027C18.6155 22.4117 17.6704 23.3107 16.5044 23.3107H15.9745C14.5159 23.3107 13.3335 22.186 13.3335 20.7987V14.8998C13.3335 13.9633 13.8761 13.103 14.7447 12.6621L18.7447 10.6319C19.5293 10.2337 20.471 10.2337 21.2556 10.6319Z'

const pinSymbolCache = new Map<string, string>()

function pinSymbol(color: string) {
  const cached = pinSymbolCache.get(color)
  if (cached) return cached
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_SIZE}" height="${PIN_SIZE}" viewBox="0 0 40 40" fill="none"><ellipse cx="20" cy="35.5" rx="6" ry="2.5" fill="${color}" fill-opacity="0.2"/><path d="${PIN_BODY}" fill="${color}"/><path d="${PIN_STROKE}" stroke="#fff" stroke-width="2"/><path d="${PIN_HOME}" fill="#fff"/></svg>`
  const uri = `image://data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  pinSymbolCache.set(color, uri)
  return uri
}

const measureCtx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null

function measureRichText(text: string, weight = 400) {
  if (measureCtx) {
    measureCtx.font = `${weight} 12px "PingFang SC","Microsoft YaHei",sans-serif`
    return measureCtx.measureText(text).width
  }
  let width = 0
  for (const ch of text) width += /[\u4e00-\u9fff]/.test(ch) ? 12 : 7.2
  return width
}

type BubbleItem = {
  name: string
  amount?: string
  lng: number
  lat: number
  kind: 'pin' | 'worker'
  iconH?: number
}

function makeNameBubbleSeries(seriesName: string, items: BubbleItem[], z: number) {
  const padX = 16
  const padY = 8
  const textGap = 4
  const lineH = 18
  const arrowW = 10
  const arrowH = 6
  const radius = 8
  return {
    type: 'custom' as const,
    name: seriesName,
    coordinateSystem: 'geo',
    geoIndex: 0,
    clip: false,
    silent: true,
    tooltip: { show: false },
    z,
    zlevel: 1,
    renderItem: (params: echarts.CustomSeriesRenderItemParams, api: echarts.CustomSeriesRenderItemAPI) => {
      const item = items[params.dataIndex]
      if (!item) return { type: 'group', children: [] }
      const center = api.coord([item.lng, item.lat])
      if (!center || !Number.isFinite(center[0])) return { type: 'group', children: [] }
      const nameW = measureRichText(item.name, 500)
      const amountW = item.amount ? measureRichText(item.amount, 400) : 0
      const innerW = item.amount ? nameW + textGap + amountW : nameW
      const rectW = padX * 2 + innerW
      const rectH = padY * 2 + lineH
      const markerTop =
        item.kind === 'pin' ? center[1] - PIN_TIP_OFFSET - PIN_SIZE / 2 : center[1] - (item.iconH ?? 28)
      const arrowTop = markerTop - 2 - arrowH
      const rectTop = arrowTop - rectH + 1
      const rectLeft = center[0] - rectW / 2
      const textY = rectTop + padY + lineH / 2
      const nameX = rectLeft + padX
      const children: object[] = [
        {
          type: 'rect',
          shape: { x: rectLeft, y: rectTop, width: rectW, height: rectH, r: radius },
          style: {
            fill: '#fff',
            shadowBlur: 16,
            shadowColor: 'rgba(35, 37, 43, 0.1)',
            shadowOffsetY: 4,
          },
          silent: true,
        },
        {
          type: 'text',
          style: {
            x: nameX,
            y: textY,
            text: item.name,
            fill: '#23252b',
            font: '500 12px "PingFang SC","Microsoft YaHei",sans-serif',
            align: 'left',
            verticalAlign: 'middle',
          },
          silent: true,
        },
      ]
      if (item.amount) {
        children.push({
          type: 'text',
          style: {
            x: nameX + nameW + textGap,
            y: textY,
            text: item.amount,
            fill: '#23252b',
            font: '400 12px "PingFang SC","Microsoft YaHei",sans-serif',
            align: 'left',
            verticalAlign: 'middle',
          },
          silent: true,
        })
      }
      children.push({
        type: 'image',
        style: {
          image: publicUrl('icons/tooltip-arrow.svg'),
          x: center[0] - arrowW / 2,
          y: arrowTop,
          width: arrowW,
          height: arrowH,
        },
        silent: true,
      })
      return { type: 'group', children }
    },
    data: items.map((item) => ({
      name: item.name,
      value: [item.lng, item.lat],
    })),
  }
}

function makeHeatPinSeries(
  seriesName: string,
  fences: MapFence[],
  heat: Record<string, number>,
  z: number,
) {
  return {
    type: 'scatter' as const,
    name: seriesName,
    coordinateSystem: 'geo',
    geoIndex: 0,
    symbolSize: PIN_SIZE,
    symbolOffset: [0, -PIN_TIP_OFFSET] as [number, number],
    symbolKeepAspect: true,
    silent: false,
    cursor: 'pointer',
    tooltip: { show: false },
    label: { show: false },
    data: fences.map((fence) => ({
      name: fence.name,
      value: [fence.center[0], fence.center[1], heat[fence.name] ?? 0],
      symbol: pinSymbol(fence.color),
    })),
    z,
    zlevel: 1,
  }
}

function bboxOfPoints(points: [number, number][]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return makeBox(minX, minY, maxX, maxY)
}

function makeBox(minX: number, minY: number, maxX: number, maxY: number): BBox {
  return {
    minX,
    minY,
    maxX,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: Math.max(maxX - minX, 0.001),
    h: Math.max(maxY - minY, 0.001),
  }
}

function collectGeometryPoints(geometry: unknown, out: [number, number][]) {
  if (!geometry) return
  const walk = (node: unknown) => {
    if (!Array.isArray(node) || node.length === 0) return
    if (typeof node[0] === 'number' && typeof node[1] === 'number') {
      out.push([node[0], node[1]])
      return
    }
    node.forEach(walk)
  }
  walk((geometry as { coordinates?: unknown }).coordinates)
}

function bboxOfGeo(geo: object | null) {
  const points: [number, number][] = []
  const features = (geo as { features?: Array<{ geometry?: unknown }> } | null)?.features ?? []
  features.forEach((item) => collectGeometryPoints(item.geometry, points))
  return points.length ? bboxOfPoints(points) : null
}

function bboxOfFences(fences: MapFence[]) {
  const points: [number, number][] = []
  fences.forEach((fence) => points.push(...fence.coords, fence.center))
  return points.length ? bboxOfPoints(points) : null
}

function bboxOfWorkers(workers: MapWorker[]) {
  const points: [number, number][] = workers.map((worker) => [worker.lng, worker.lat])
  return points.length ? bboxOfPoints(points) : null
}

function unionBoxes(boxes: Array<BBox | null | undefined>) {
  const points: [number, number][] = []
  boxes.forEach((box) => {
    if (!box) return
    points.push([box.minX, box.minY], [box.maxX, box.maxY])
  })
  return points.length ? bboxOfPoints(points) : null
}

function padBox(box: BBox, ratio: number, minPad = 0): BBox {
  const px = Math.max(box.w * ratio, minPad)
  const py = Math.max(box.h * ratio, minPad)
  return makeBox(box.minX - px, box.minY - py, box.maxX + px, box.maxY + py)
}

function boundingCoordsOf(box: BBox | null) {
  if (!box) return undefined
  return [
    [box.minX, box.maxY],
    [box.maxX, box.minY],
  ] as [[number, number], [number, number]]
}

function regionFitBox(level: ViewLevel, geoBox: BBox | null) {
  if (!geoBox) return null
  if (level === 'nation') {
    return padBox(makeBox(geoBox.minX, Math.max(geoBox.minY, 17.6), geoBox.maxX, geoBox.maxY), 0.04)
  }
  return padBox(geoBox, 0.06)
}

function markerPadOf(level: ViewLevel) {
  if (level === 'grid' || level === 'worker') return 56
  if (level === 'station') return 48
  if (level === 'city') return 44
  return 16
}

function readMapLayout(boardCollapsed: boolean, level: ViewLevel) {
  const gap = 12
  const markerPad = markerPadOf(level)
  const fallback = {
    left: 24,
    right: boardCollapsed ? 24 : 497,
    top: 80 + markerPad,
    bottom: 72,
  }
  const stage = document.querySelector('.map-stage')
  if (!(stage instanceof HTMLElement)) return fallback
  const stageBox = stage.getBoundingClientRect()
  const filter = document.querySelector('.filter-bar')
  const board = document.querySelector('.board')
  const legend = document.querySelector('.legend')
  const topUi =
    filter instanceof HTMLElement ? filter.getBoundingClientRect().bottom - stageBox.top + gap : 80
  const boardBox = board instanceof HTMLElement ? board.getBoundingClientRect() : null
  const rightUi =
    !boardCollapsed && boardBox && boardBox.width > 32
      ? Math.max(stageBox.right - boardBox.left + gap, 24)
      : 24
  const legendBox = legend instanceof HTMLElement ? legend.getBoundingClientRect() : null
  const bottomUi = legendBox ? Math.max(stageBox.bottom - legendBox.top + gap, 24) : 24
  return {
    left: 24,
    right: Math.round(rightUi),
    top: Math.round(topUi + markerPad),
    bottom: Math.round(bottomUi + (isDeepMapLevel(level) ? 12 : 0)),
  }
}

function workerIconPx(level: ViewLevel) {
  if (level === 'grid' || level === 'worker') return 52
  if (level === 'station') return 44
  return 28
}

function hexToRgba(color: string, alpha: number) {
  const hex = color.replace('#', '')
  const n = Number.parseInt(hex, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function makeRenderFence(
  fences: MapFence[],
  selectedName = '',
  fadeOthers = false,
  compact = false,
  fillAlpha = 0.14,
  hoverAlpha = 0.28,
  strokeWidth = 2,
  hideLabel = false,
  dashed = true,
  clickable = true,
  fillOverride?: string,
) {
  const hoverable = clickable && !fillOverride
  return (_params: echarts.CustomSeriesRenderItemParams, api: echarts.CustomSeriesRenderItemAPI) => {
    const fence = fences[_params.dataIndex]
    if (!fence) return { type: 'group', children: [] }
    const selected = Boolean(selectedName) && fence.name === selectedName
    const faded = fadeOthers && Boolean(selectedName) && fence.name !== selectedName
    const points = fence.coords.map((coord) => api.coord(coord))
    const label = fence.kind === 'grid' ? fence.name : fence.name.replace(/服务站$/, '')
    const showLabel = !hideLabel && (!compact || selected || fence.radius >= 0.034 || fence.kind === 'grid')
    const fill =
      fillOverride ||
      (selected ? hexToRgba(fence.color, hoverAlpha) : hexToRgba(fence.color, faded ? 0.05 : fillAlpha))
    return {
      type: 'polygon',
      silent: !clickable,
      info: fence.name,
      shape: { points },
      style: {
        fill,
        stroke: selected && hoverable ? '#3c6ef0' : fence.color,
        lineWidth: selected && hoverable ? Math.max(strokeWidth, 3) : strokeWidth,
        lineDash: dashed ? [8, 8] : undefined,
        opacity: faded && !selected ? 0.4 : 1,
        cursor: clickable ? 'pointer' : 'default',
      },
      emphasis: hoverable
        ? {
            style: {
              fill: hexToRgba(fence.color, hoverAlpha),
              cursor: 'pointer',
            },
          }
        : { disabled: true },
      textContent: showLabel
        ? {
            type: 'text',
            silent: true,
            style: {
              text: label,
              fill: '#23252b',
              fontSize: fence.kind === 'grid' ? 12 : compact ? 10 : 11,
              fontWeight: selected ? 600 : 500,
              lineHeight: 18,
              align: 'center',
              verticalAlign: 'middle',
              backgroundColor: fence.kind === 'grid' ? '#fff' : undefined,
              borderRadius: fence.kind === 'grid' ? 8 : 0,
              padding: fence.kind === 'grid' ? [6, 12, 6, 12] : 0,
              shadowBlur: fence.kind === 'grid' ? 16 : 0,
              shadowColor: fence.kind === 'grid' ? 'rgba(35, 37, 43, 0.1)' : undefined,
              shadowOffsetY: fence.kind === 'grid' ? 4 : 0,
              opacity: faded && !selected ? 0.4 : 1,
            },
          }
        : undefined,
      textConfig: showLabel ? { position: 'inside' } : undefined,
    }
  }
}

function makeGridFenceSeries(
  fences: MapFence[],
  heat: Record<string, number>,
  clickable: boolean,
  fillAlpha = 0.3,
  dashed = false,
  hoverAlpha = 0.6,
  fillOverride?: string,
  showPin = true,
) {
  return [
    {
      type: 'custom' as const,
      name: '网格围栏',
      coordinateSystem: 'geo',
      geoIndex: 0,
      clip: false,
      silent: !clickable,
      cursor: clickable ? 'pointer' : 'default',
      tooltip: { show: false },
      renderItem: makeRenderFence(
        fences,
        '',
        false,
        false,
        fillAlpha,
        hoverAlpha,
        2,
        true,
        dashed,
        clickable,
        fillOverride,
      ),
      emphasis: { disabled: !clickable || Boolean(fillOverride) },
      data: fences.map((fence) => ({
        name: fence.name,
        value: [fence.center[0], fence.center[1], heat[fence.name] ?? 0],
      })),
      z: 7,
    },
    ...(showPin ? [makeHeatPinSeries('网格定位点', fences, heat, 12)] : []),
  ]
}

export function SupplyMap({
  level,
  geo,
  heat,
  heatMode,
  heatSeed,
  heatTitle,
  filter,
  boardCollapsed = false,
  onRegionClick,
  onStationClick,
  onGridClick,
  onWorkerClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const handlers = useRef({ onRegionClick, onStationClick, onGridClick, onWorkerClick, heat, filter, level, heatMode })
  const fencesRef = useRef<{ stations: MapFence[]; grids: MapFence[]; workers: MapWorker[] }>({
    stations: [],
    grids: [],
    workers: [],
  })
  const workerIconRef = useRef(28)
  const [layoutTick, setLayoutTick] = useState(0)
  useEffect(() => {
    handlers.current = { onRegionClick, onStationClick, onGridClick, onWorkerClick, heat, filter, level, heatMode }
  })
  useEffect(() => {
    const bump = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setLayoutTick((tick) => tick + 1))
    }
    let frame = 0
    const ro = new ResizeObserver(bump)
    ;['.filter-bar', '.board', '.map-stage'].forEach((selector) => {
      const el = document.querySelector(selector)
      if (el) ro.observe(el)
    })
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chartRef.current = chart
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    const hitFence = (event: { offsetX: number; offsetY: number }) => {
      const lnglat = chart.convertFromPixel({ geoIndex: 0 }, [event.offsetX, event.offsetY])
      if (!lnglat || Number.isNaN(lnglat[0])) return
      const current = handlers.current
      if (current.level === 'station' || current.level === 'grid') {
        return findFenceAt(fencesRef.current.grids, lnglat)
      }
    }
    const hitPinIcon = (event: { offsetX: number; offsetY: number }, fences: MapFence[]) => {
      for (const fence of fences) {
        const pixel = chart.convertToPixel({ geoIndex: 0 }, fence.center)
        if (!pixel) continue
        const dx = event.offsetX - pixel[0]
        const dy = event.offsetY - (pixel[1] - PIN_TIP_OFFSET)
        if (dx * dx + dy * dy <= 18 * 18) return fence
        if (Math.abs(dx) <= 72 && dy < -16 && dy > -78) return fence
      }
    }
    const hitWorkerIcon = (event: { offsetX: number; offsetY: number }) => {
      if (handlers.current.level === 'city') return
      for (const worker of fencesRef.current.workers) {
        const pixel = chart.convertToPixel({ geoIndex: 0 }, [worker.lng, worker.lat])
        if (!pixel) continue
        const icon = workerIconRef.current
        const dx = event.offsetX - pixel[0]
        const dy = event.offsetY - (pixel[1] - icon / 2)
        const hitR = icon / 2 + 6
        if (dx * dx + dy * dy <= hitR * hitR) return worker
      }
    }
    chart.getZr().on('click', (event: { offsetX: number; offsetY: number }) => {
      const current = handlers.current
      if (current.level === 'city') {
        const pin = hitPinIcon(event, fencesRef.current.stations)
        if (pin) current.onStationClick(pin.name)
        return
      }
      if (current.level === 'station') {
        const pin = hitPinIcon(event, fencesRef.current.grids)
        if (pin) {
          current.onGridClick(pin.name)
          return
        }
        if (hitWorkerIcon(event)) return
        const fence = hitFence(event)
        if (fence) current.onGridClick(fence.name)
        return
      }
      if (current.level === 'grid') {
        return
      }
    })
    chart.getZr().on('mousemove', (event: { offsetX: number; offsetY: number }) => {
      const current = handlers.current
      if (current.level === 'city') {
        chart.getZr().setCursorStyle(hitPinIcon(event, fencesRef.current.stations) ? 'pointer' : 'default')
        return
      }
      if (current.level === 'station') {
        const overPin = hitPinIcon(event, fencesRef.current.grids)
        const overWorker = hitWorkerIcon(event)
        const overFence = hitFence(event)
        chart.getZr().setCursorStyle(overPin || overWorker || overFence ? 'pointer' : 'default')
        return
      }
      if (current.level === 'grid') {
        chart.getZr().setCursorStyle(hitWorkerIcon(event) ? 'pointer' : 'default')
      }
    })
    chart.on('mouseover', (params) => {
      if (
        params.seriesType === 'map' ||
        params.seriesName === '师傅' ||
        params.seriesName === '网点围栏' ||
        params.seriesName === '网格围栏' ||
        PIN_SERIES.includes(params.seriesName as (typeof PIN_SERIES)[number])
      ) {
        chart.getZr().setCursorStyle('pointer')
      }
    })
    chart.on('mouseout', () => {
      const current = handlers.current
      if (current.level === 'nation' || current.level === 'province') {
        chart.getZr().setCursorStyle('default')
      }
    })
    chart.on('click', (params) => {
      const current = handlers.current
      const data = params.data as { name?: string } | undefined
      const name = String(params.name || data?.name || params.info || '')
      if (!name) return
      if (params.seriesName === '师傅') {
        current.onWorkerClick(name)
        return
      }
      if (params.seriesName === '网点围栏' || params.seriesName === '网点围栏绘制' || params.seriesName === '网点定位点') {
        current.onStationClick(name)
        return
      }
      if (params.seriesName === '网格围栏' || params.seriesName === '网格围栏绘制' || params.seriesName === '网格定位点') {
        if (current.level !== 'station') return
        current.onGridClick(name)
        return
      }
      if (params.componentType === 'geo' || params.seriesType === 'map') {
        if (['city', 'station', 'grid', 'worker'].includes(current.level)) return
      }
      current.onRegionClick(name)
    })
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !geo) return
    echarts.registerMap('monitor', geo as Parameters<typeof echarts.registerMap>[1])

    const mapData = heat.map((item) => paintRegion(item.name, item.value, heatMode))
    const overlay = isDeepMapLevel(level)
    const stations = STATION_MAP[filter.city] ?? []
    const entities = overlay && filter.city ? cityMapEntities(filter.city, stations) : { stations: [], grids: [], workers: [] as MapWorker[] }
    const stationHeat = Object.fromEntries(
      heatForNames(
        entities.stations.map((item) => item.name),
        heatMode,
        heatSeed,
      ).map((item) => [item.name, item.value]),
    )

    const visibleGrids =
      level === 'city'
        ? []
        : level === 'grid' && filter.grid
          ? entities.grids.filter((fence) => fence.station === filter.station && fence.name === filter.grid)
          : entities.grids.filter((fence) => !filter.station || fence.station === filter.station)
    const selectedGrid = visibleGrids.find((fence) => fence.name === filter.grid)

    const visibleWorkers =
      level === 'city'
        ? []
        : entities.workers.filter((worker) => {
            if (worker.station !== filter.station) return false
            if (level === 'grid' || level === 'worker') return !filter.grid || worker.grid === filter.grid
            return true
          })

    const cityBox = bboxOfGeo(geo)
    const focusWorkers =
      level === 'grid' && filter.grid
        ? visibleWorkers.filter((worker) => worker.grid === filter.grid)
        : visibleWorkers
    const rawTarget =
      level === 'grid'
        ? unionBoxes([bboxOfFences(selectedGrid ? [selectedGrid] : visibleGrids), bboxOfWorkers(focusWorkers)])
        : level === 'station'
          ? unionBoxes([bboxOfFences(visibleGrids), bboxOfWorkers(visibleWorkers)])
          : bboxOfFences(entities.stations)
    const fitTarget = overlay && level === 'city' ? unionBoxes([cityBox, rawTarget]) : rawTarget
    const paddedTarget = fitTarget
      ? padBox(
          fitTarget,
          level === 'city' ? 0.05 : level === 'station' ? 0.08 : 0.1,
          level === 'grid' ? 0.008 : 0,
        )
      : cityBox
    const mapLayout = readMapLayout(boardCollapsed, level)
    const boundingCoords = overlay
      ? boundingCoordsOf(paddedTarget)
      : boundingCoordsOf(regionFitBox(level, cityBox))
    const zoom = 1
    const iconPx = workerIconPx(level)
    workerIconRef.current = iconPx
    const heatedStations = entities.stations.map((fence) => ({
      ...fence,
      color: heatColor(stationHeat[fence.name] ?? 1, heatMode),
    }))
    const stationSeries =
      level === 'city' ? [makeHeatPinSeries('网点定位点', heatedStations, stationHeat, 8)] : []

    const gridHeat = Object.fromEntries(
      heatForNames(
        visibleGrids.map((item) => item.name),
        heatMode,
        heatSeed,
      ).map((item) => [item.name, item.value]),
    )
    const heatedGrids = visibleGrids.map((fence) => ({
      ...fence,
      color: level === 'grid' ? CITY_OUTLINE_STROKE : heatColor(gridHeat[fence.name] ?? 1, heatMode),
    }))
    const gridSeries =
      (level === 'station' || level === 'grid') && heatedGrids.length
        ? makeGridFenceSeries(
            heatedGrids,
            gridHeat,
            level === 'station',
            0.3,
            level === 'grid',
            0.6,
            level === 'grid' ? CITY_OUTLINE_FILL : undefined,
            level === 'station',
          )
        : []

    fencesRef.current = { stations: entities.stations, grids: visibleGrids, workers: visibleWorkers }

    const workerIconSize = () => [iconPx, iconPx] as [number, number]
    const workerSeries = visibleWorkers.length
      ? [
          {
            type: 'scatter',
            name: '师傅',
            coordinateSystem: 'geo',
            geoIndex: 0,
            symbol: `image://${publicUrl('icons/map-worker.png')}`,
            symbolSize: iconPx,
            symbolOffset: [0, -iconPx / 2],
            symbolKeepAspect: true,
            silent: false,
            cursor: 'pointer',
            tooltip: { show: false },
            label: { show: false },
            data: visibleWorkers.map((worker) => ({
              name: worker.name,
              value: [worker.lng, worker.lat],
            })),
            z: 8,
          },
        ]
      : []

    const pinBubbles: BubbleItem[] =
      level === 'city'
        ? heatedStations.map((fence) => ({
            name: fence.name,
            amount: formatHeatValue(heatMode, stationHeat[fence.name] ?? 0),
            lng: fence.center[0],
            lat: fence.center[1],
            kind: 'pin' as const,
          }))
        : level === 'station'
          ? heatedGrids.map((fence) => ({
              name: fence.name,
              amount: formatHeatValue(heatMode, gridHeat[fence.name] ?? 0),
              lng: fence.center[0],
              lat: fence.center[1],
              kind: 'pin' as const,
            }))
          : []
    const workerBubbles: BubbleItem[] = visibleWorkers.map((worker) => ({
      name: worker.name,
      lng: worker.lng,
      lat: worker.lat,
      kind: 'worker' as const,
      iconH: iconPx,
    }))
    const bubbleSeries = [
      ...(pinBubbles.length ? [makeNameBubbleSeries('定位名称', pinBubbles, 13)] : []),
      ...(workerBubbles.length ? [makeNameBubbleSeries('师傅名称', workerBubbles, 11)] : []),
    ]

    chart.setOption(
      {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          className: 'map-echarts-tooltip',
          backgroundColor: 'rgba(0,0,0,0)',
          borderColor: 'transparent',
          borderWidth: 0,
          padding: 0,
          shadowBlur: 0,
          extraCssText:
            'box-shadow:none !important;background:transparent !important;border:none !important;padding:0 !important;pointer-events:none;',
          hideDelay: 0,
          transitionDuration: 0,
          position: (
            point: number[],
            params: unknown,
            _dom: unknown,
            _rect: unknown,
            size: { contentSize: number[] },
          ) => {
            const [w, h] = size.contentSize
            const p = params as { name?: string; seriesName?: string; value?: number | number[] }
            const finder = overlay ? { geoIndex: 0 } : { seriesIndex: 0 }
            const lnglat = isGeoPoint(p.value) ? [p.value[0], p.value[1]] : regionLngLat(geo, p.name ?? '')
            let x = point[0]
            let y = point[1]
            if (lnglat) {
              const pixel = chart.convertToPixel(finder, lnglat)
              if (pixel && Number.isFinite(pixel[0]) && Number.isFinite(pixel[1])) {
                x = pixel[0]
                y = pixel[1]
                if (p.seriesName === '师傅') {
                  const [, iconH] = workerIconSize()
                  y = y - iconH
                }
                if (PIN_SERIES.includes(p.seriesName as (typeof PIN_SERIES)[number])) {
                  y = y - PIN_SIZE
                }
              }
            }
            return [x - w / 2, y - h - 8]
          },
          formatter: (params: unknown) => {
            const p = params as { name: string; seriesName?: string; seriesType?: string; value?: number | number[] }
            if (p.seriesName === '师傅') {
              return ''
            }
            const heatLabel =
              level === 'nation' || level === 'province' || level === 'city' || level === 'station' || level === 'grid'
                ? heatTitle
                : p.name
            if (p.seriesName === '网点围栏' || p.seriesName === '网点定位点') {
              return formatHeatTooltip(heatMode, heatLabel, stationHeat[p.name])
            }
            if (p.seriesName === '网格围栏' || p.seriesName === '网格定位点' || p.seriesName === '网格名称') {
              return ''
            }
            const value = Array.isArray(p.value) ? p.value[0] : p.value
            return formatHeatTooltip(heatMode, heatLabel, value)
          },
        },
        geo: overlay
          ? {
              map: 'monitor',
              roam: true,
              silent: true,
              zoom,
              boundingCoords,
              scaleLimit: { min: 0.8, max: 20 },
              aspectScale: 0.9,
              ...mapLayout,
              itemStyle: {
                areaColor: CITY_OUTLINE_FILL,
                borderColor: CITY_OUTLINE_STROKE,
                borderWidth: 2,
                borderType: 'dashed',
                opacity: 1,
              },
              emphasis: {
                itemStyle: {
                  areaColor: CITY_OUTLINE_FILL,
                  borderColor: CITY_OUTLINE_STROKE,
                },
              },
              label: { show: false },
              regions: mapData.map((item) => ({
                name: item.name,
                itemStyle: {
                  areaColor: CITY_OUTLINE_FILL,
                  borderColor: CITY_OUTLINE_STROKE,
                  borderWidth: 2,
                  borderType: 'dashed',
                  opacity: 1,
                },
                emphasis: {
                  itemStyle: {
                    areaColor: CITY_OUTLINE_FILL,
                    borderColor: CITY_OUTLINE_STROKE,
                  },
                },
              })),
            }
          : undefined,
        series: overlay
          ? [...stationSeries, ...gridSeries, ...workerSeries, ...bubbleSeries]
          : [
              {
                type: 'map',
                map: 'monitor',
                roam: true,
                selectedMode: false,
                cursor: 'pointer',
                zoom,
                boundingCoords,
                scaleLimit: { min: 0.8, max: 20 },
                ...mapLayout,
                label: { show: true, fontSize: 10, color: '#525765' },
                itemStyle: {
                  borderColor: '#fff',
                  borderWidth: 1,
                  areaColor: '#ffd5b8',
                  opacity: 0.8,
                },
                emphasis: {
                  label: { color: '#23252b' },
                  itemStyle: { opacity: 1 },
                },
                data: mapData,
              },
            ],
      },
      true,
    )
    chart.resize()
  }, [geo, heat, heatMode, heatSeed, heatTitle, level, filter, boardCollapsed, layoutTick])

  return <div className="map-canvas" ref={ref} />
}
