import { useEffect, useRef, useState } from 'react'
import type { FilterState } from '../types'
import {
  allCities,
  allStations,
  BUSINESS_LINES,
  CITY_MAP,
  cityOfStation,
  clampFilterDate,
  FULFILLERS,
  DEFAULT_FULFILLERS,
  PERSON_TYPES,
  PROVINCES,
  provinceOfCity,
  STATION_MAP,
  stationsOfProvince,
  todayISO,
} from '../data/mock'
import { publicUrl } from '../publicUrl'

type Props = {
  draft: FilterState
  onChange: (patch: Partial<FilterState>) => void
  onReset: () => void
  onQuery: () => void
}

function withCurrent(options: string[], value: string) {
  return value && !options.includes(value) ? [value, ...options] : options
}

function FulfillerSelect({
  values = [],
  onChange,
}: {
  values: string[]
  onChange: (values: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (name: string) => {
    onChange(values.includes(name) ? values.filter((item) => item !== name) : [...values, name])
  }

  return (
    <div className={`multi-select ${open ? 'is-open' : ''}`} ref={rootRef}>
      <div
        className={`multi-select-trigger ${values.length ? '' : 'is-placeholder'}`}
        data-testid="filter-fulfiller"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="履约方"
        tabIndex={0}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen((prev) => !prev)
          }
        }}
      >
        <div className="multi-select-tags">
          {values.length === 0 && <span className="multi-select-placeholder">请选择</span>}
          {values.map((name) => (
            <span className="ms-tag" key={name}>
              {name}
              <button
                className="ms-tag-close"
                type="button"
                aria-label={`移除${name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  toggle(name)
                }}
              >
                <img src={publicUrl('icons/tag-close.svg')} alt="" />
              </button>
            </span>
          ))}
        </div>
        <img className="multi-select-caret" src={publicUrl('nav/arrow-down.svg')} alt="" />
      </div>
      {open && (
        <div className="multi-select-menu" role="listbox" aria-multiselectable="true">
          {FULFILLERS.map((name) => {
            const selected = values.includes(name)
            return (
              <button
                className={`multi-select-option ${selected ? 'is-on' : ''}`}
                type="button"
                role="option"
                aria-selected={selected}
                key={name}
                onClick={() => toggle(name)}
              >
                <span className="ms-check" />
                {name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function FilterBar({ draft, onChange, onReset, onQuery }: Props) {
  const cities = withCurrent(draft.province ? (CITY_MAP[draft.province] ?? []) : allCities(), draft.city)
  const stations = withCurrent(
    draft.city
      ? (STATION_MAP[draft.city] ?? [])
      : draft.province
        ? stationsOfProvince(draft.province)
        : allStations(),
    draft.station,
  )
  const provinces = withCurrent(PROVINCES, draft.province)
  const today = todayISO()

  return (
    <div className="filter-bar">
      <div className="filter-row">
        <div className="filter-item">
          <label>省</label>
          <select
            className={`control ${draft.province ? '' : 'is-placeholder'}`}
            data-testid="filter-province"
            value={draft.province}
            onChange={(e) => {
              const province = e.target.value
              if (!province) {
                onChange({ province: '', city: '', station: '', grid: '', worker: '' })
                return
              }
              const cityOk = (CITY_MAP[province] ?? []).includes(draft.city)
              const stationOk = cityOk && (STATION_MAP[draft.city] ?? []).includes(draft.station)
              onChange({
                province,
                city: cityOk ? draft.city : '',
                station: stationOk ? draft.station : '',
                grid: stationOk ? draft.grid : '',
                worker: stationOk ? draft.worker : '',
              })
            }}
          >
            <option value="">请选择</option>
            {provinces.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>市</label>
          <select
            className={`control ${draft.city ? '' : 'is-placeholder'}`}
            data-testid="filter-city"
            value={draft.city}
            onChange={(e) => {
              const city = e.target.value
              if (!city) {
                onChange({ city: '', station: '', grid: '', worker: '' })
                return
              }
              onChange({
                city,
                province: provinceOfCity(city),
                station: (STATION_MAP[city] ?? []).includes(draft.station) ? draft.station : '',
                grid: '',
                worker: '',
              })
            }}
          >
            <option value="">请选择</option>
            {cities.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>网点</label>
          <select
            className={`control ${draft.station ? '' : 'is-placeholder'}`}
            data-testid="filter-station"
            value={draft.station}
            onChange={(e) => {
              const station = e.target.value
              if (!station) {
                onChange({ station: '', grid: '', worker: '' })
                return
              }
              const city = cityOfStation(station)
              onChange({
                station,
                city,
                province: provinceOfCity(city),
                grid: '',
                worker: '',
              })
            }}
          >
            <option value="">请选择</option>
            {stations.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>业务线</label>
          <select
            className={`control ${draft.businessLine ? '' : 'is-placeholder'}`}
            value={draft.businessLine}
            onChange={(e) => onChange({ businessLine: e.target.value })}
          >
            <option value="">请选择</option>
            {BUSINESS_LINES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="filter-row">
        <div className="filter-item fulfiller">
          <label>履约方</label>
          <FulfillerSelect
            values={draft.fulfillers ?? DEFAULT_FULFILLERS}
            onChange={(fulfillers) => onChange({ fulfillers })}
          />
        </div>
        <div className="filter-item">
          <label>日期</label>
          <div className={`date-control ${draft.date ? '' : 'is-empty'}`}>
            <input
              className={`control ${draft.date ? '' : 'is-placeholder'}`}
              type="date"
              data-testid="filter-date"
              value={draft.date}
              max={today}
              onChange={(e) => onChange({ date: clampFilterDate(e.target.value, today) })}
            />
            {!draft.date && <span className="date-placeholder">请选择</span>}
          </div>
        </div>
        <div className="filter-item grow">
          <label>人员</label>
          <div className="combo">
            <select value={draft.personType} onChange={(e) => onChange({ personType: e.target.value })}>
              {PERSON_TYPES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <span className="split" />
            <input
              placeholder="请搜索"
              value={draft.personKeyword}
              onChange={(e) => onChange({ personKeyword: e.target.value })}
            />
          </div>
        </div>
        <div className="filter-actions">
          <button className="btn btn-ghost" type="button" data-testid="filter-reset" onClick={onReset}>
            重置
          </button>
          <button className="btn btn-primary" type="button" data-testid="filter-query" onClick={onQuery}>
            查询
          </button>
        </div>
      </div>
    </div>
  )
}
