import { useEffect, useMemo, useState } from 'react'
import type { BoardModel, DayColumn, MetricGroup, MetricRow, ViewLevel } from '../types'
import { isPersonLevel } from '../data/mapEntities'
import { publicUrl } from '../publicUrl'
import { TrendBoard } from './TrendBoard'
import { AiReportDrawer } from './AiReportDrawer'

type Props = {
  board: BoardModel
  dayColumns: DayColumn[]
  heatKey?: string
  heatCol?: number
  collapsed?: boolean
  onToggleCollapsed?: () => void
  onSelectMetric?: (groupKey: string, rowKey: string, col?: number) => void
  onOpenOrders?: (label: string) => void
  onWeather?: () => void
  weatherOn?: boolean
  onViewMap?: () => void
  onRankClick?: (name: string) => void
}

function collectExpandable(rows: MetricRow[], acc: Record<string, boolean> = {}) {
  for (const row of rows) {
    if (row.children?.length) acc[row.key] = Boolean(row.defaultExpanded)
    if (row.children) collectExpandable(row.children, acc)
  }
  return acc
}

function findRow(rows: MetricRow[], key: string): MetricRow | undefined {
  for (const row of rows) {
    if (row.key === key) return row
    if (row.children) {
      const hit = findRow(row.children, key)
      if (hit) return hit
    }
  }
}

const ORDER_RANK_COLUMNS = ['下传', '妥投', '完成', '取消', '遗留']
const WORKER_RANK_COLUMNS = ['总人数', '出勤人数', '人效']
const CAPACITY_RANK_COLUMNS = ['总产能', '已用产能']
const ENGINEER_ORDER_COLUMNS = ['完成', '取消', '遗留']
const ENGINEER_DURATION_COLUMNS = ['服务时长', '在途时长']
const ENGINEER_EFF_COLUMNS = ['近7日出勤', '近7日完工']
const ENGINEER_SCHEDULE_COLUMNS = ['次日单量', '后3日单量']

function placeRankColumns(tab: number) {
  if (tab === 1) return WORKER_RANK_COLUMNS
  if (tab === 2) return CAPACITY_RANK_COLUMNS
  return ORDER_RANK_COLUMNS
}

function engineerRankColumns(level: ViewLevel, tab: number) {
  if (tab === 1) {
    if (level === 'station' || level === 'grid') {
      return [...ENGINEER_EFF_COLUMNS, ...ENGINEER_DURATION_COLUMNS]
    }
    return ENGINEER_EFF_COLUMNS
  }
  if (tab === 2) return ENGINEER_SCHEDULE_COLUMNS
  return ENGINEER_ORDER_COLUMNS
}

function rankColumns(level: ViewLevel, tab: number) {
  return isPersonLevel(level) ? engineerRankColumns(level, tab) : placeRankColumns(tab)
}

function formatRankMetric(label: string, value: number) {
  if (label === '服务时长' || label === '在途时长') return `${(value / 60).toFixed(1)}h`
  return String(value)
}
const RANK_MEDALS: Record<number, string> = {
  1: publicUrl('icons/rank-1.png'),
  2: publicUrl('icons/rank-2.png'),
  3: publicUrl('icons/rank-3.png'),
}

type RankSort = { key: 'rank'; dir: 'asc' | 'desc' } | { key: 'metric'; index: number; dir: 'asc' | 'desc' }

function sortIconSrc(sort: RankSort, target: 'rank' | number) {
  const active =
    target === 'rank' ? sort.key === 'rank' : sort.key === 'metric' && sort.index === target
  if (!active) return publicUrl('icons/rank-sort-default.svg')
  return sort.dir === 'asc' ? publicUrl('icons/rank-sort-asc.svg') : publicUrl('icons/rank-sort-desc.svg')
}

function nextDir(prev: RankSort, key: RankSort['key'], index?: number): RankSort {
  if (key === 'rank') {
    if (prev.key === 'rank') return { key: 'rank', dir: prev.dir === 'asc' ? 'desc' : 'asc' }
    return { key: 'rank', dir: 'asc' }
  }
  if (prev.key === 'metric' && prev.index === index) {
    return { key: 'metric', index: index!, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
  }
  return { key: 'metric', index: index!, dir: 'asc' }
}

function collectTrendGroups(groups: MetricGroup[], keys: string[]) {
  const buckets = new Map<string, { key: string; label: string; rows: MetricRow[] }>()
  for (const key of keys) {
    for (const group of groups) {
      const row = findRow(group.rows, key)
      if (!row) continue
      const bucket = buckets.get(group.key) ?? { key: group.key, label: group.label, rows: [] }
      bucket.rows.push(row)
      buckets.set(group.key, bucket)
      break
    }
  }
  return groups.map((group) => buckets.get(group.key)).filter(Boolean) as {
    key: string
    label: string
    rows: MetricRow[]
  }[]
}

function kindLabel(kind: DayColumn['kind']) {
  if (kind === 'actual') return '实际'
  if (kind === 'realtime') return '实时'
  return '预测'
}

function MetricLine({
  row,
  selected,
  selectedCol,
  onSelect,
  expandable,
  expanded,
  onToggle,
  clickable,
  trendOn,
  onTrend,
  dayColumns,
  onOpenOrders,
}: {
  row: MetricRow
  selected?: boolean
  selectedCol?: number
  onSelect?: (col?: number) => void
  expandable?: boolean
  expanded?: boolean
  onToggle?: () => void
  clickable?: boolean
  trendOn?: boolean
  onTrend?: () => void
  dayColumns: DayColumn[]
  onOpenOrders?: () => void
}) {
  return (
    <div
      className={`metric ${selected ? 'is-selected' : ''} ${expandable ? 'is-parent' : ''} ${clickable ? 'is-level1' : ''}`}
    >
      <div className="metric-name">
        {clickable ? (
          <button
            className="metric-label"
            type="button"
            onClick={() => {
              onSelect?.()
              onToggle?.()
            }}
          >
            {row.label}
          </button>
        ) : (
          <button className="metric-label is-sub" type="button" onClick={() => onSelect?.()}>
            {row.label}
          </button>
        )}
        {expandable && (
          <button
            className="metric-caret"
            type="button"
            aria-label={expanded ? '收起' : '展开'}
            onClick={(e) => {
              e.stopPropagation()
              onToggle?.()
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <g
                transform={
                  expanded
                    ? 'translate(6 6) rotate(-90) scale(-1 1) translate(-1.646445 -3)'
                    : 'translate(6 6) rotate(90) scale(-1 1) translate(-1.646445 -3)'
                }
              >
                <path
                  d="M2.43934 0.146447C2.6346 -0.0488155 2.95118 -0.0488155 3.14645 0.146447C3.34171 0.341709 3.34171 0.658291 3.14645 0.853553L1.35391 2.64641C1.15876 2.84173 1.15876 3.15827 1.35391 3.35359L3.14645 5.14645C3.32669 5.32669 3.34055 5.6103 3.18804 5.80645L3.14645 5.85355C2.95118 6.04882 2.6346 6.04882 2.43934 5.85355L0.292893 3.70711C-0.0976311 3.31658 -0.0976311 2.68342 0.292893 2.29289L2.43934 0.146447Z"
                  fill="currentColor"
                />
              </g>
            </svg>
          </button>
        )}
        <button
          className={`metric-trend ${trendOn ? 'is-on' : ''}`}
          type="button"
          aria-label="查看趋势"
          aria-pressed={trendOn}
          onClick={(e) => {
            e.stopPropagation()
            onTrend?.()
          }}
        >
          <img className="trend-off" src={publicUrl('nav/trend-default.svg')} alt="" width={14} height={14} />
          <img className="trend-on" src={publicUrl('nav/trend-selected.svg')} alt="" width={14} height={14} />
        </button>
      </div>
      <div className="metric-vals">
        {row.values.map((value, i) => {
          const col = dayColumns[i]
          const kind = col?.kind
          const className = [
            'metric-val',
            kind === 'realtime' ? 'realtime' : '',
            kind === 'forecast' ? 'forecast' : '',
            selected && selectedCol === i ? 'is-on' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              className={className}
              type="button"
              key={`${row.key}-${i}`}
              onClick={() => onOpenOrders?.()}
            >
              {value}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MetricTree({
  groupKey,
  rows,
  heatKey,
  heatCol,
  onSelectMetric,
  expanded,
  toggle,
  selectedKeys,
  onTrend,
  dayColumns,
  onOpenOrders,
}: {
  groupKey: string
  rows: MetricRow[]
  heatKey?: string
  heatCol?: number
  onSelectMetric?: (groupKey: string, rowKey: string, col?: number) => void
  expanded: Record<string, boolean>
  toggle: (key: string) => void
  selectedKeys: string[]
  onTrend: (key: string) => void
  dayColumns: DayColumn[]
  onOpenOrders?: (label: string) => void
}) {
  return (
    <>
      {rows.map((row) => {
        const hasChildren = Boolean(row.children?.length)
        const isOpen = hasChildren && expanded[row.key]
        return (
          <div key={row.key}>
            <MetricLine
              row={row}
              selected={heatKey === row.key}
              selectedCol={heatCol}
              onSelect={(col) => onSelectMetric?.(groupKey, row.key, col)}
              expandable={hasChildren}
              expanded={isOpen}
              onToggle={hasChildren ? () => toggle(row.key) : undefined}
              clickable
              trendOn={selectedKeys.includes(row.key)}
              onTrend={() => onTrend(row.key)}
              dayColumns={dayColumns}
              onOpenOrders={() => onOpenOrders?.(row.label.replace(/\n/g, ''))}
            />
            {hasChildren && isOpen && (
              <div className="metric-children">
                {row.children!.map((child) => (
                  <MetricLine
                    key={child.key}
                    row={child}
                    selected={heatKey === child.key}
                    selectedCol={heatCol}
                    onSelect={(col) => onSelectMetric?.(groupKey, child.key, col)}
                    trendOn={selectedKeys.includes(child.key)}
                    onTrend={() => onTrend(child.key)}
                    dayColumns={dayColumns}
                    onOpenOrders={() => onOpenOrders?.(child.label.replace(/\n/g, ''))}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

export function Dashboard({
  board,
  dayColumns,
  heatKey,
  heatCol,
  collapsed,
  onToggleCollapsed,
  onSelectMetric,
  onOpenOrders,
  onWeather,
  weatherOn,
  onRankClick,
}: Props) {
  const [rankTab, setRankTab] = useState(0)
  const [rankSort, setRankSort] = useState<RankSort>({ key: 'rank', dir: 'asc' })
  useEffect(() => {
    setRankSort({ key: 'rank', dir: 'asc' })
  }, [board.level])
  const expandSeed = useMemo(
    () => collectExpandable(board.groups.flatMap((group) => group.rows)),
    [board.groups],
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>(expandSeed)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [aiOpen, setAiOpen] = useState(false)
  const trendGroups = useMemo(() => collectTrendGroups(board.groups, selectedKeys), [board.groups, selectedKeys])

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const onTrend = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  const showAiReport = board.level === 'nation' || board.level === 'province'

  return (
    <>
      {showAiReport && aiOpen && <AiReportDrawer board={board} onClose={() => setAiOpen(false)} />}
      <div className={`board-layer ${collapsed ? 'is-collapsed' : ''}`}>
      {trendGroups.length > 0 && !collapsed && (
        <TrendBoard groups={trendGroups} dayColumns={dayColumns} onClose={() => setSelectedKeys([])} />
      )}
      <div className="board-dock">
      <button
        className="board-toggle"
        type="button"
        data-testid="board-toggle"
        title={collapsed ? '展开数据看板' : '收起数据看板'}
        aria-label={collapsed ? '展开数据看板' : '收起数据看板'}
        aria-expanded={!collapsed}
        onClick={onToggleCollapsed}
      >
        <img
          src={collapsed ? publicUrl('icons/board-handle-expand.svg') : publicUrl('icons/board-handle-collapse.svg')}
          width={16}
          height={72}
          alt=""
        />
      </button>
      <aside className="board">
      <div className="board-scroll">
        <div className="board-head">
          <div className="board-heading">
            <h2 className="board-title" data-testid="board-title">{board.title}</h2>
            {board.tags && (
              <div className="tags">
                {board.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          {(board.showWeatherAction || showAiReport) && (
          <div className="head-actions">
            {board.showWeatherAction && (
              <button
                className={`ghost-btn ${weatherOn ? 'is-on' : ''}`}
                type="button"
                aria-pressed={weatherOn}
                onClick={onWeather}
              >
                <img className="btn-icon-off" src={publicUrl('icons/sun.svg')} alt="" />
                <img className="btn-icon-on" src={publicUrl('icons/sun-hover.svg')} alt="" />
                天气
              </button>
            )}
            {showAiReport && (
            <button
              className={`ai-btn ${aiOpen ? 'is-on' : ''}`}
              type="button"
              aria-pressed={aiOpen}
              onClick={() => setAiOpen((open) => !open)}
            >
              <img className="btn-icon-off" src={publicUrl('icons/ai.svg')} alt="" />
              <img className="btn-icon-on" src={publicUrl('icons/ai-hover.svg')} alt="" />
              AI报告
            </button>
            )}
          </div>
          )}
        </div>

        {board.today && (
          <section className="today-overview">
            <div className="today-head">
              <div className="today-title">
                <h3>今日总览</h3>
                <span className="muted">{board.today.updatedAt}</span>
              </div>
              <div className="today-rate">
                <span>完成率</span>
                <div className="rate-track" aria-hidden="true">
                  <span className="rate-fill" style={{ width: board.today.rate }} />
                </div>
                <span className="rate-num">{board.today.rate}</span>
              </div>
            </div>
            <div className="kpis">
              <div className="kpi">
                <div className="label">活跃工程师</div>
                <div className="value">{board.today.activeEngineers}</div>
              </div>
              <div className="kpi-split" />
              <div className="kpi">
                <div className="label">剩余单量</div>
                <div className="value">{board.today.remain}</div>
              </div>
              <div className="kpi-split" />
              <div className="kpi">
                <div className="label">未派工剩余单量</div>
                <div className="value">{board.today.unassigned}</div>
              </div>
              <div className="kpi-split" />
              <div className="kpi">
                <div className="label">完工单量</div>
                <div className="value">{board.today.done}</div>
              </div>
            </div>
          </section>
        )}

        {board.groups.length > 0 ? (
          <section>
            <div className="week-head">
              <h3>近7天数据</h3>
              <div className="days">
                {dayColumns.map((col) => (
                  <div className={`day ${col.kind} ${col.anchor ? 'is-anchor' : ''}`} key={col.date}>
                    <span className="day-date">{col.label}</span>
                    <span className="kind">{kindLabel(col.kind)}</span>
                  </div>
                ))}
              </div>
            </div>
            {board.groups.map((group) => (
              <div className="group" key={group.key}>
                <span className="group-label">{group.label}</span>
                <MetricTree
                  groupKey={group.key}
                  rows={group.rows}
                  heatKey={heatKey}
                  heatCol={heatCol}
                  onSelectMetric={onSelectMetric}
                  expanded={expanded}
                  toggle={toggle}
                  selectedKeys={selectedKeys}
                  onTrend={onTrend}
                  dayColumns={dayColumns}
                  onOpenOrders={onOpenOrders}
                />
              </div>
            ))}
          </section>
        ) : null}

        <section className="rank-section">
          <div className="section-head">
            <h3>{board.rankTitle}</h3>
            <span className="muted">{board.rankCountLabel}</span>
          </div>
          <div className="rank-tabs">
            {board.rankTabs.map((tab, i) => (
              <button
                className={rankTab === i ? 'active' : ''}
                key={tab}
                type="button"
                onClick={() => {
                  setRankTab(i)
                  setRankSort({ key: 'rank', dir: 'asc' })
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div
            className={`rank-list ${isPersonLevel(board.level) ? 'is-engineer' : 'is-city'} is-cols-${
              rankColumns(board.level, rankTab).length
            }`}
          >
            {(() => {
              const engineer = isPersonLevel(board.level)
              const columns = rankColumns(board.level, rankTab)
              const metricsOf = (item: (typeof board.ranks)[number]) => {
                if (engineer) {
                  if (rankTab === 1) return item.effMetrics ?? []
                  if (rankTab === 2) return item.scheduleMetrics ?? []
                  return item.metrics
                }
                if (rankTab === 1) return item.workerMetrics ?? []
                if (rankTab === 2) return item.capMetrics ?? []
                return item.metrics
              }
              const rows = [...board.ranks].sort((a, b) => {
                if (rankSort.key === 'rank') {
                  return rankSort.dir === 'asc' ? a.rank - b.rank : b.rank - a.rank
                }
                const left = metricsOf(a)[rankSort.index] ?? 0
                const right = metricsOf(b)[rankSort.index] ?? 0
                return rankSort.dir === 'asc' ? left - right : right - left
              })
              return (
                <>
            <div className="rank-head">
              <button
                className={`rank-head-rank ${rankSort.key === 'rank' ? `is-${rankSort.dir}` : ''}`}
                type="button"
                onClick={() => setRankSort((prev) => nextDir(prev, 'rank'))}
              >
                <span>排名</span>
                <img className="rank-sort" src={sortIconSrc(rankSort, 'rank')} width={12} height={12} alt="" />
              </button>
              {columns.map((label, index) => (
                <button
                  className={`rank-head-metric ${rankSort.key === 'metric' && rankSort.index === index ? `is-${rankSort.dir}` : ''}`}
                  key={label}
                  type="button"
                  onClick={() => setRankSort((prev) => nextDir(prev, 'metric', index))}
                >
                  {label}
                  <img className="rank-sort" src={sortIconSrc(rankSort, index)} width={12} height={12} alt="" />
                </button>
              ))}
            </div>
            {rows.map((item) => {
              const weatherParts = (item.weather ?? '').split(/\s+/).filter(Boolean)
              const metrics = metricsOf(item).slice(0, columns.length)
              return (
                <div
                  className={`rank-row ${onRankClick ? 'is-clickable' : ''} ${item.name === board.title ? 'is-current' : ''}`}
                  key={item.name}
                  onClick={() => onRankClick?.(item.name)}
                >
                  <div className="rank-identity">
                    {RANK_MEDALS[item.rank] ? (
                      <img className="rank-medal" src={RANK_MEDALS[item.rank]} width={24} height={24} alt={`${item.rank}`} />
                    ) : (
                      <span className="rank-badge">{item.rank}</span>
                    )}
                    {engineer && (
                      <img className="rank-avatar" src={publicUrl('icons/rank-avatar.png')} width={30} height={30} alt="" />
                    )}
                    <div className="rank-copy">
                      <div className="rank-title-line">
                        <span className="rank-name">{item.name}</span>
                        {item.tag && <span className="rank-tag">{item.tag}</span>}
                      </div>
                      {engineer && item.sub && (
                        <div className="rank-sub">
                          {item.sub.split(/\s+/).map((part) => (
                            <span key={part}>{part}</span>
                          ))}
                        </div>
                      )}
                      {!engineer && weatherParts.length > 0 && (
                        <div className="rank-sub">
                          {weatherParts.map((part) => (
                            <span key={part}>{part}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {metrics.map((value, index) => (
                    <span className="rank-metric" key={`${item.name}-${index}`}>
                      {formatRankMetric(columns[index] ?? '', value)}
                    </span>
                  ))}
                </div>
              )
            })}
                </>
              )
            })()}
          </div>
        </section>
      </div>
    </aside>
      </div>
      </div>
    </>
  )
}
