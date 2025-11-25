"use client"

import { useCallback, useRef, useState } from "react"
import { Search, Loader } from "lucide-react"

interface LocationResult {
  name: string
  lat: number
  lng: number
  display_name: string
}

interface SearchLocationsProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  onSelect: (lat: number, lng: number, name: string) => void
}

export function SearchLocations({ placeholder, value, onChange, onSelect }: SearchLocationsProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const searchCacheRef = useRef<Map<string, LocationResult[]>>(new Map())
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSearchChange = useCallback(
    (query: string) => {
      onChange(query)

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      if (query.trim().length < 3) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      const cacheKey = query.trim().toLowerCase()
      if (searchCacheRef.current.has(cacheKey)) {
        const cachedResults = searchCacheRef.current.get(cacheKey) || []
        setSuggestions(cachedResults)
        setShowSuggestions(cachedResults.length > 0)
        return
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)

        try {
          abortControllerRef.current = new AbortController()

          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              query,
            )}, Cochabamba, Bolivia&limit=10&extratags=1`,
            {
              headers: {
                "User-Agent": "DropGo-TaxiApp/1.0",
              },
              signal: abortControllerRef.current.signal,
            },
          )

          if (!response.ok) throw new Error("Search failed")

          const data = await response.json()

          let results: LocationResult[] = []
          if (data && Array.isArray(data) && data.length > 0) {
            results = data.map((item: any) => ({
              name: item.name || item.display_name.split(",")[0],
              lat: Number.parseFloat(item.lat),
              lng: Number.parseFloat(item.lon),
              display_name: item.display_name,
            }))

            searchCacheRef.current.set(cacheKey, results)
          }

          setSuggestions(results)
          setShowSuggestions(results.length > 0)
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.log("[v0] Search error:", err.message)
          }
        } finally {
          setIsSearching(false)
        }
      }, 300)
    },
    [onChange],
  )

  return (
    <div className="relative w-full">
      <div className="relative">
        {isSearching ? (
          <Loader className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        )}
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => value.trim().length > 0 && setShowSuggestions(true)}
          className="w-full pl-8 pr-2 py-2 bg-muted text-foreground rounded-lg border border-border/50 focus:border-primary focus:outline-none text-sm"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
          {suggestions.map((location, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelect(location.lat, location.lng, location.name)
                setShowSuggestions(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted/50 border-b border-border/30 last:border-b-0 transition-colors"
            >
              <div className="font-medium truncate">📍 {location.name}</div>
              <div className="text-muted-foreground truncate text-xs opacity-75">{location.display_name}</div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !isSearching && value.length > 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg z-20 p-2">
          <p className="text-xs text-muted-foreground text-center">No se encontraron ubicaciones</p>
        </div>
      )}
    </div>
  )
}
