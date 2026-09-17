import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppShell } from './components/AppShell'
import { Dashboard } from './components/Dashboard'
import { FilterBar } from './components/FilterBar'
import { SupplyMap } from './components/SupplyMap'
import { resetMap, zoomMap } from './mapTools'
import {
  breadcrumb,
  buildBoard,
  buildDayColumns,
  clampFilterDate,
  EMPTY_FILTER,
  fillParentAddress,
  allCities,
  CITY_MAP,
  matchListedName,
  PROVINCES,
  heatForNames,
  heatModeOf,
  HEAT_SCHEMES,
  metricTitleOf,
  resolveLevel,
} from './data/mock'
import { isPersonLevel } from './data/mapEntities'
import { loadGeo, type GeoJSON } from './geo'
import type { FilterState, HeatRegion } from './types'

const DEFAULT_HEAT = { group: 'order', key: 'download', col: 3 }

export default function App() {
  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTER)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTER)
  const [geo, setGeo] = useState<object | null>(null)
  const [toast, setToast] = useState('')
  const [heatPick, setHeatPick] = useState(DEFAULT_HEAT)
  const [boardCollapsed, setBoardCollapsed] = useState(false)

  const level = resolveLevel(applied)
  const board = useMemo(() => buildBoard(applied), [applied])
  const dayColumns = useMemo(() => buildDayColumns(applied.date), [applied.date])
  const crumbs = breadcrumb(applied)
  const heatMode = heatModeOf(heatPick.group, heatPick.key)
  const heatSeed = `${heatPick.group}-${heatPick.key}-${heatPick.col}`
  const heatTitle = metricTitleOf(heatPick.key)
  const legend = HEAT_SCHEMES[heatMode]

  const heat: HeatRegion[] = useMemo(() => {
    if (!geo) return []
    if (applied.city && (level === 'city' || level === 'station' || level === 'grid' || level === 'worker')) {
      return heatForNames([applied.city], heatMode, heatSeed)
    }
    const names = (geo as GeoJSON).features.map((f) => f.properties.name)
    return heatForNames(names, heatMode, heatSeed)
  }, [geo, heatMode, heatSeed, applied.city, level])

  useEffect(() => {
    let cancelled = false
    loadGeo(level, applied.province, applied.city).then((data) => {
      if (!cancelled) setGeo(data)
    })
    return () => {
      cancelled = true
    }
  }, [level, applied.province, applied.city])

  const showToast = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(''), 1600)
  }

  const applyFilter = (next: FilterState) => {
    setApplied(next)
    setDraft(next)
  }

  const onRegionClick = useCallback(
    (name: string) => {
      if (!name) return
      if (level === 'nation') {
        const province = matchListedName(name, PROVINCES)
        applyFilter(fillParentAddress({ ...applied, province, city: '', station: '', grid: '', worker: '' }))
        return
      }
      if (level === 'province') {
        const cityOptions = applied.province ? (CITY_MAP[applied.province] ?? allCities()) : allCities()
        const city = matchListedName(name, cityOptions)
        applyFilter(fillParentAddress({ ...applied, city, station: '', grid: '', worker: '' }))
      }
    },
    [applied, level],
  )

  const onStationClick = useCallback(
    (name: string) => {
      applyFilter(fillParentAddress({ ...applied, station: name, grid: '', worker: '' }))
    },
    [applied],
  )

  const onGridClick = useCallback(
    (name: string) => {
      applyFilter(fillParentAddress({ ...applied, grid: name, worker: '' }))
    },
    [applied],
  )

  const onWorkerClick = useCallback((name: string) => {
    showToast(`已显示「${name}」工人轨迹跟踪`)
  }, [])

  const onRankClick = (name: string) => {
    if (level === 'nation') {
      applyFilter(fillParentAddress({ ...applied, province: matchListedName(name, PROVINCES), city: '', station: '', grid: '', worker: '' }))
      return
    }
    if (level === 'province') {
      applyFilter(fillParentAddress({ ...applied, city: name, station: '', grid: '', worker: '' }))
      return
    }
    if (level === 'city') {
      applyFilter(fillParentAddress({ ...applied, station: name, grid: '', worker: '' }))
      return
    }
    if (isPersonLevel(level)) {
      showToast(`已显示「${name}」工人轨迹跟踪`)
    }
  }

  const jumpCrumb = (index: number) => {
    if (index === 0) applyFilter({ ...applied, province: '', city: '', station: '', grid: '', worker: '' })
    if (index === 1) applyFilter({ ...applied, city: '', station: '', grid: '', worker: '' })
    if (index === 2) applyFilter({ ...applied, station: '', grid: '', worker: '' })
    if (index === 3) applyFilter({ ...applied, grid: '', worker: '' })
    if (index === 4) applyFilter({ ...applied, worker: '' })
  }

  return (
    <AppShell>
      <div className={`map-stage ${boardCollapsed ? 'is-board-collapsed' : ''}`}>
        {level !== 'grid' && level !== 'worker' ? (
          <div className={`legend legend-${heatMode}`}>
            {legend.items.map((item) => (
              <div className={`legend-item ${item.color ? '' : 'is-prefix'}`} key={item.label}>
                {item.color ? <span className="swatch" style={{ background: item.color }} /> : null}
                {item.label}
              </div>
            ))}
          </div>
        ) : null}
        <div className="map-tools">
          <button type="button" onClick={() => zoomMap(0.2)} title="放大">
            +
          </button>
          <button type="button" onClick={() => zoomMap(-0.2)} title="缩小">
            −
          </button>
          <button type="button" onClick={resetMap} title="定位">
            ⌖
          </button>
          <button type="button" onClick={() => showToast('已刷新地图数据')} title="刷新">
            ↻
          </button>
        </div>
        <SupplyMap
          level={level}
          geo={geo}
          heat={heat}
          heatMode={heatMode}
          heatSeed={heatSeed}
          heatTitle={heatTitle}
          filter={applied}
          boardCollapsed={boardCollapsed}
          onRegionClick={onRegionClick}
          onStationClick={onStationClick}
          onGridClick={onGridClick}
          onWorkerClick={onWorkerClick}
        />
      </div>

      <div className="workspace-ui">
        <FilterBar
          draft={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          onReset={() => {
            setDraft(EMPTY_FILTER)
            setApplied(EMPTY_FILTER)
            setHeatPick(DEFAULT_HEAT)
          }}
          onQuery={() => applyFilter(fillParentAddress({ ...draft, date: clampFilterDate(draft.date) }))}
        />
        <div className="workspace-body">
          <div className="crumb">
            {crumbs.map((item, i) => (
              <button key={`${item}-${i}`} type="button" onClick={() => jumpCrumb(i)}>
                {i === 0 ? item : `/ ${item}`}
              </button>
            ))}
          </div>
          <Dashboard
            key={`${board.level}-${board.title}`}
            board={board}
            dayColumns={dayColumns}
            heatKey={heatPick.key}
            heatCol={heatPick.col}
            onSelectMetric={(group, key, col) => setHeatPick({ group, key, col: col ?? -1 })}
            onOpenOrders={(label) => showToast(`已跳转至「${label}」服务单列表`)}
            onWeather={() =>
              setHeatPick((prev) =>
                prev.group === 'weather' ? DEFAULT_HEAT : { group: 'weather', key: 'temp', col: -1 },
              )
            }
            weatherOn={heatPick.group === 'weather'}
            collapsed={boardCollapsed}
            onToggleCollapsed={() => setBoardCollapsed((open) => !open)}
            onViewMap={() => showToast('已定位未派工单到地图')}
            onRankClick={onRankClick}
          />
        </div>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </AppShell>
  )
}
