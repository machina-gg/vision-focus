import React, { useState, useCallback, useMemo } from 'react'
import { Clock, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react'

import { Input } from '~/components/ui'
import { getMessage } from '~/lib/i18n'
import { formatTime } from '~/lib/time'
import type { AnalyticsData, SiteTime } from '~/types/storage'

interface SiteCategoryManagerProps {
  analytics: AnalyticsData
  onCategoryChange: (
    domain: string,
    category: 'waste' | 'invest' | 'neutral'
  ) => void
}

type SortKey = 'time' | 'domain' | 'category'
type SortOrder = 'asc' | 'desc'

const CATEGORY_OPTIONS: {
  value: 'waste' | 'invest' | 'neutral'
  label: string
  color: string
}[] = [
  {
    value: 'waste',
    label: 'Waste',
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  {
    value: 'invest',
    label: 'Invest',
    color: 'text-green-600 bg-green-50 border-green-200',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    color: 'text-gray-600 bg-gray-50 border-gray-200',
  },
]

export function SiteCategoryManager({
  analytics,
  onCategoryChange,
}: SiteCategoryManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('time')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'waste' | 'invest' | 'neutral'
  >('all')

  // Get all sites with their time and category
  const sites = useMemo(() => {
    const siteList: (SiteTime & {
      category: 'waste' | 'invest' | 'neutral'
    })[] = []

    for (const [domain, siteTime] of Object.entries(analytics.siteTime)) {
      const category =
        analytics.siteCategories[domain] || siteTime.category || 'neutral'
      siteList.push({
        ...siteTime,
        domain,
        category,
      })
    }

    return siteList
  }, [analytics.siteTime, analytics.siteCategories])

  // Filter and sort sites
  const filteredSites = useMemo(() => {
    let result = [...sites]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((site) =>
        site.domain.toLowerCase().includes(query)
      )
    }

    // Filter by category
    if (filterCategory !== 'all') {
      result = result.filter((site) => site.category === filterCategory)
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0

      switch (sortKey) {
        case 'time':
          comparison = a.time - b.time
          break
        case 'domain':
          comparison = a.domain.localeCompare(b.domain)
          break
        case 'category': {
          const categoryOrder = { waste: 0, invest: 1, neutral: 2 }
          comparison = categoryOrder[a.category] - categoryOrder[b.category]
          break
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [sites, searchQuery, filterCategory, sortKey, sortOrder])

  // Toggle sort
  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortOrder('desc')
      }
    },
    [sortKey]
  )

  // Get category icon
  const getCategoryIcon = (category: 'waste' | 'invest' | 'neutral') => {
    switch (category) {
      case 'waste':
        return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'invest':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'neutral':
        return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  // Calculate totals by category
  const totals = useMemo(() => {
    const result = { waste: 0, invest: 0, neutral: 0 }
    for (const site of sites) {
      result[site.category] += site.time
    }
    return result
  }, [sites])

  if (sites.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {getMessage('noSiteData')}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-red-600">
              {getMessage('waste')}
            </span>
          </div>
          <p className="text-lg font-bold text-red-700">
            {formatTime(totals.waste)}
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-green-600">
              {getMessage('invest')}
            </span>
          </div>
          <p className="text-lg font-bold text-green-700">
            {formatTime(totals.invest)}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Minus className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">
              {getMessage('neutral')}
            </span>
          </div>
          <p className="text-lg font-bold text-gray-700">
            {formatTime(totals.neutral)}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={getMessage('searchSites')}
            className="pl-9"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) =>
            setFilterCategory(e.target.value as typeof filterCategory)
          }
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">{getMessage('allCategories')}</option>
          <option value="waste">{getMessage('waste')}</option>
          <option value="invest">{getMessage('invest')}</option>
          <option value="neutral">{getMessage('neutral')}</option>
        </select>
      </div>

      {/* Site List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-200">
          <button
            onClick={() => handleSort('domain')}
            className="col-span-5 text-left flex items-center gap-1 hover:text-gray-700"
          >
            {getMessage('site')}
            {sortKey === 'domain' && (
              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          <button
            onClick={() => handleSort('time')}
            className="col-span-3 text-left flex items-center gap-1 hover:text-gray-700"
          >
            {getMessage('time')}
            {sortKey === 'time' && (
              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
          <button
            onClick={() => handleSort('category')}
            className="col-span-4 text-left flex items-center gap-1 hover:text-gray-700"
          >
            {getMessage('category')}
            {sortKey === 'category' && (
              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        </div>

        {/* Rows */}
        <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
          {filteredSites.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              {getMessage('noMatchingSites')}
            </div>
          ) : (
            filteredSites.map((site) => (
              <div
                key={site.domain}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-gray-50"
              >
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  {getCategoryIcon(site.category)}
                  <span
                    className="text-sm text-gray-900 truncate"
                    title={site.domain}
                  >
                    {site.domain}
                  </span>
                </div>
                <div className="col-span-3 flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-3 h-3" />
                  {formatTime(site.time)}
                </div>
                <div className="col-span-4">
                  <div className="flex gap-1">
                    {CATEGORY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          onCategoryChange(site.domain, option.value)
                        }
                        className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                          site.category === option.value
                            ? option.color
                            : 'text-gray-400 bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option.value === 'waste' && getMessage('wasteShort')}
                        {option.value === 'invest' && getMessage('investShort')}
                        {option.value === 'neutral' &&
                          getMessage('neutralShort')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-500">{getMessage('siteCategoryHelp')}</p>
    </div>
  )
}
