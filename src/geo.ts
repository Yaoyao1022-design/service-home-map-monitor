import type { ViewLevel } from './types'

export type GeoJSON = {
  type?: string
  features: Array<{
    type?: string
    properties: {
      name: string
      adcode?: number
    }
    geometry?: unknown
  }>
}

const cache = new Map<string, GeoJSON>()

async function fetchGeo(url: string): Promise<GeoJSON> {
  const hit = cache.get(url)
  if (hit) return hit
  const res = await fetch(url)
  if (!res.ok) throw new Error(`geo ${res.status}`)
  const data = (await res.json()) as GeoJSON
  cache.set(url, data)
  return data
}

function adcodeOf(geo: GeoJSON, name: string) {
  return geo.features.find((f) => f.properties.name === name)?.properties.adcode
}

function outlineOf(geo: GeoJSON, name: string): GeoJSON | null {
  const feature = geo.features.find((item) => item.properties.name === name)
  if (!feature) return null
  return {
    type: 'FeatureCollection',
    features: [
      {
        ...feature,
        properties: { ...feature.properties, name },
      },
    ],
  }
}

async function loadCityOutline(province: string, city: string, china: GeoJSON): Promise<GeoJSON> {
  if (province === '河北省') {
    const hebei = await fetchGeo('/geo/hebei.json')
    return outlineOf(hebei, city) ?? hebei
  }

  const provinceCode = adcodeOf(china, province)
  if (!provinceCode) return china

  if (city === province) {
    try {
      return await fetchGeo(`https://geo.datav.aliyun.com/areas_v3/bound/${provinceCode}.json`)
    } catch {
      return outlineOf(china, province) ?? china
    }
  }

  try {
    const cities = await fetchGeo(`https://geo.datav.aliyun.com/areas_v3/bound/${provinceCode}_full.json`)
    return outlineOf(cities, city) ?? cities
  } catch {
    return china
  }
}

export async function loadGeo(level: ViewLevel, province: string, city: string): Promise<GeoJSON> {
  const china = await fetchGeo('/geo/china.json')

  if (level === 'nation') return china

  if (level === 'city' || level === 'station' || level === 'grid' || level === 'worker') {
    return loadCityOutline(province, city, china)
  }

  if (province === '河北省') return fetchGeo('/geo/hebei.json')

  const code = adcodeOf(china, province)
  if (code) {
    try {
      return await fetchGeo(`https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json`)
    } catch {
      return china
    }
  }
  return china
}
