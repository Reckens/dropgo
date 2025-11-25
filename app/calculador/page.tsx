"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"
import { SearchLocations } from "@/components/search-locations"
import { UserNav } from "@/components/user-nav"
import { getSupabaseClient } from "@/lib/supabase/client"

const GlobalMap = dynamic(() => import("@/components/global-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 bg-muted rounded-lg flex items-center justify-center">Cargando mapa...</div>
  ),
})

interface TaxiConfig {
  baseFare: number
  dayPerKm: number
  nightPerKm: number
  nightStart: number
  nightEnd: number
  extraPerPassenger: number
  routeFactor: number
}

interface FareResult {
  baseFare: number
  distanceFare: number
  extraFare: number
  total: number
  distanceKm: number
  isNight: boolean
  perKm: number
  passengers: number
}

const DEFAULT_CONFIG: TaxiConfig = {
  baseFare: 7,
  dayPerKm: 2.5,
  nightPerKm: 3.5,
  nightStart: 21,
  nightEnd: 6,
  extraPerPassenger: 2,
  routeFactor: 1.2,
}

function isNight(timeStr: string, nightStart: number, nightEnd: number): boolean {
  if (!timeStr) return false
  const [h, m] = timeStr.split(":").map(Number)
  const hour = h + m / 60
  if (nightStart < nightEnd) {
    return hour >= nightStart && hour < nightEnd
  } else {
    return hour >= nightStart || hour < nightEnd
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function CalculadorPage() {
  const [config, setConfig] = useState<TaxiConfig>(DEFAULT_CONFIG)
  const [originLatLng, setOriginLatLng] = useState<[number, number] | null>(null)
  const [destLatLng, setDestLatLng] = useState<[number, number] | null>(null)
  const [originName, setOriginName] = useState<string>("")
  const [destName, setDestName] = useState<string>("")
  const [baseDistance, setBaseDistance] = useState<number>(0)
  const [passengers, setPassengers] = useState(1)
  const [time, setTime] = useState("")
  const [fareResult, setFareResult] = useState<FareResult | null>(null)
  const [error, setError] = useState("")
  const [locationError, setLocationError] = useState("")
  const [mounted, setMounted] = useState(false)
  const supabase = getSupabaseClient()

  useEffect(() => {
    // Load global tariffs from Supabase
    const loadGlobalConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("global_config")
          .select("config_value")
          .eq("config_key", "tariffs")
          .single()

        if (error) throw error

        if (data?.config_value) {
          setConfig(data.config_value as TaxiConfig)
        }
      } catch (err) {
        console.error("Error loading global config:", err)
        // Keep using DEFAULT_CONFIG if fetch fails
      }
    }

    loadGlobalConfig()

    const now = new Date()
    const hours = String(now.getHours()).padStart(2, "0")
    const minutes = String(now.getMinutes()).padStart(2, "0")
    setTime(`${hours}:${minutes}`)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOriginLatLng([position.coords.latitude, position.coords.longitude])
        setOriginName("Mi ubicación")
      },
      (error) => {
        setOriginLatLng([-17.3895, -66.1568])
        setLocationError("Ubicación: Cochabamba centro")
      },
    )

    setMounted(true)
  }, [])

  const handleSelectOrigin = (lat: number, lng: number, name: string) => {
    console.log("[v0] Origin selected:", lat, lng, name)
    setOriginLatLng([lat, lng])
    setOriginName(name)
    setError("")
    setDestLatLng(null)
    setDestName("")
    setBaseDistance(0)
    setFareResult(null)
  }

  const handleSelectDestination = (lat: number, lng: number, name: string) => {
    if (originLatLng) {
      const distance = haversineKm(originLatLng[0], originLatLng[1], lat, lng)
      setDestLatLng([lat, lng])
      setDestName(name)
      setBaseDistance(distance)
      calculateFareWithDistance(distance)
      setError("")
    }
  }

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!originLatLng) return

      const distance = haversineKm(originLatLng[0], originLatLng[1], lat, lng)
      setDestLatLng([lat, lng])
      setDestName(`Ubicación seleccionada (${distance.toFixed(2)} km)`)
      setBaseDistance(distance)
      calculateFareWithDistance(distance)
      setError("")
    },
    [originLatLng],
  )

  const calculateFareWithDistance = (distance: number) => {
    if (distance === 0 || isNaN(distance)) {
      setError("La distancia no es válida.")
      return
    }

    const adjustedDistance = distance * config.routeFactor
    const night = isNight(time, config.nightStart, config.nightEnd)
    const perKm = night ? config.nightPerKm : config.dayPerKm
    const distanceFare = adjustedDistance * perKm
    const extraPassengers = Math.max(0, passengers - 1)
    const extraFare = extraPassengers * config.extraPerPassenger
    const total = config.baseFare + distanceFare + extraFare

    setFareResult({
      baseFare: config.baseFare,
      distanceFare,
      extraFare,
      total,
      distanceKm: adjustedDistance,
      isNight: night,
      perKm,
      passengers,
    })
    setError("")
  }

  useEffect(() => {
    if (baseDistance > 0) {
      calculateFareWithDistance(baseDistance)
    }
  }, [passengers, time])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground p-2 flex items-center justify-between sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-white p-0.5 flex-shrink-0">
            <Image
              src="/logo-dropgo.png"
              alt="DropGo Logo"
              width={32}
              height={32}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-bold tracking-tight">DropGo</h1>
            <p className="text-xs opacity-90 -mt-0.5">Tarifas</p>
          </div>
        </div>
        {mounted && <UserNav userRole="customer" userId="" />}
      </header>

      <main className="flex-1 p-2 max-w-md mx-auto w-full overflow-y-auto">
        {locationError && (
          <Card className="mb-2 p-1.5 bg-secondary/20 border-secondary/50 text-xs">
            <p className="text-foreground">{locationError}</p>
          </Card>
        )}

        <Card className="mb-2 overflow-hidden shadow-lg border-primary/30">
          <div className="h-72">
            {originLatLng && (
              <GlobalMap origin={originLatLng} destination={destLatLng} onMapClick={handleMapClick} showDrivers={true} />
            )}
          </div>
        </Card>

        <Card className="mb-2 p-3 bg-card border-border/50 space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">📍 Origen</label>
            <SearchLocations
              placeholder="¿De dónde salimos?"
              value={originName}
              onChange={setOriginName}
              onSelect={handleSelectOrigin}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">🎯 Destino (opcional)</label>
            <SearchLocations
              placeholder="¿A dónde vamos?"
              value={destName}
              onChange={setDestName}
              onSelect={handleSelectDestination}
            />
          </div>
        </Card>

        {baseDistance > 0 && (
          <Card className="mb-2 p-1.5 bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/50 text-xs">
            <p className="font-medium text-foreground">
              📍 <span className="font-bold text-primary">{baseDistance.toFixed(2)} km</span>
            </p>
          </Card>
        )}

        <Card className="p-2 space-y-1.5 mb-3 bg-card border-border/50">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">👥 Pasajeros</label>
              <div className="flex items-center gap-1 justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0 rounded-full bg-transparent text-xs flex-shrink-0"
                  onClick={() => setPassengers(Math.max(1, passengers - 1))}
                >
                  <Minus className="w-2.5 h-2.5" />
                </Button>
                <span className="text-xs font-semibold text-foreground flex-grow text-center">{passengers}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0 rounded-full bg-transparent text-xs flex-shrink-0"
                  onClick={() => setPassengers(passengers + 1)}
                >
                  <Plus className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">🕐 Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-1.5 py-1.5 bg-muted text-foreground rounded-lg border border-border/50 focus:border-primary focus:outline-none text-xs"
              />
            </div>
          </div>

          {error && <p className="text-xs text-destructive bg-destructive/10 p-1 rounded-lg">{error}</p>}
        </Card>

        {fareResult && (
          <Card className="p-2.5 bg-gradient-to-br from-primary/30 via-card to-secondary/20 border-primary/50 shadow-lg">
            <div className="mb-2">
              <div className="inline-block px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full text-xs font-semibold mb-1">
                {fareResult.isNight ? "⭐ Tarifa nocturna" : "☀️ Tarifa diurna"}
              </div>
              <p className="text-2xl font-bold text-accent mb-0.5">{fareResult.total.toFixed(2)} Bs</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base:</span>
                <span className="font-semibold">{fareResult.baseFare.toFixed(2)} Bs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Distancia:</span>
                <span className="font-semibold">
                  {fareResult.distanceKm.toFixed(2)} km × {fareResult.perKm.toFixed(2)} Bs/km
                </span>
              </div>
              {fareResult.passengers > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pasajeros:</span>
                  <span className="font-semibold">+{fareResult.extraFare.toFixed(2)} Bs</span>
                </div>
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
