"use client"

export const dynamic = "force-dynamic"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamicImport from "next/dynamic"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UserNav } from "@/components/user-nav"
import { getSupabaseClient } from "@/lib/supabase/client"
import { MapPin, Upload, Calculator, Clock } from "lucide-react"
import NotificationBell from "@/components/notification-bell"
import { useDriverLocation } from "@/hooks/use-driver-location"
import RideChat from "@/components/ride-chat"

const GlobalMap = dynamicImport(() => import("@/components/global-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">Cargando mapa...</div>
  ),
})

interface Driver {
  id: string
  phone: string
  full_name: string
  profile_image_url: string | null
  is_online: boolean
  latitude: number | null
  longitude: number | null
}

export default function DriverPage() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [location, setLocation] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [hasActiveRide, setHasActiveRide] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [activeRideId, setActiveRideId] = useState<string | null>(null)
  const router = useRouter()
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseClient> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const watchIdRef = useRef<number | null>(null)

  // GPS tracking for active rides
  const { isSharing, error: gpsError } = useDriverLocation({
    driverId: driver?.id || null,
    isActive: hasActiveRide,
  })

  useEffect(() => {
    const client = getSupabaseClient()
    setSupabase(client)

    const loadDriver = async () => {
      try {
        const driverId = localStorage.getItem("driverId")
        if (!driverId) {
          router.push("/auth")
          return
        }

        if (!client) {
          setError("Conectando a la base de datos...")
          return
        }

        const { data, error } = await client.from("drivers").select("*").eq("id", driverId).single()

        if (error || !data) {
          console.error("Error loading driver:", error)
          localStorage.removeItem("driverId")
          router.push("/auth")
          return
        }

        setDriver(data)
        setIsOnline(data.is_online)

        // Start tracking location
        if (navigator.geolocation) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              const [lat, lng] = [position.coords.latitude, position.coords.longitude]
              setLocation([lat, lng])

              // Update driver location in Supabase
              client
                ?.from("drivers")
                .update({
                  latitude: lat,
                  longitude: lng,
                  last_location_update: new Date().toISOString(),
                })
                .eq("id", driverId)
                .then(() => {
                  // Location updated
                })
            },
            (error) => {
              console.error("[v0] Geolocation error:", error)
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 5000,
            },
          )
        }

        setLoading(false)
      } catch (err: any) {
        setError(err.message || "Error al cargar perfil")
        setLoading(false)
      }
    }

    loadDriver()

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [supabase])

  // Check for active rides to enable GPS tracking
  useEffect(() => {
    if (!driver?.id || !supabase) return

    const checkActiveRides = async () => {
      const { data } = await supabase
        .from('ride_requests')
        .select('id, status')
        .eq('driver_id', driver.id)
        .in('status', ['accepted', 'in_progress'])
        .limit(1)

      if (data && data.length > 0) {
        setHasActiveRide(true)
        setActiveRideId(data[0].id)

        // Debug: Log chat button visibility conditions
        console.log('🔍 Driver Chat Debug:', {
          activeRideId: data[0].id,
          hasActiveRide: true,
          shouldShowChat: !!(data[0].id)
        })
      } else {
        setHasActiveRide(false)
        setActiveRideId(null)
      }
    }

    checkActiveRides()

    // Subscribe to ride changes
    const channel = supabase
      .channel(`driver-rides-${driver.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ride_requests',
        filter: `driver_id=eq.${driver.id}`,
      }, () => {
        checkActiveRides()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [driver?.id, supabase])

  const handleToggleOnline = async () => {
    if (!driver || !supabase) return

    try {
      const newOnlineStatus = !isOnline
      const { error } = await supabase.from("drivers").update({ is_online: newOnlineStatus }).eq("id", driver.id)

      if (error) throw error

      setIsOnline(newOnlineStatus)
    } catch (err: any) {
      setError(err.message || "Error al cambiar estado")
    }
  }

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !driver || !supabase) return

    setUploading(true)
    setError("")

    try {
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        setError("La imagen debe ser menor a 5MB")
        setUploading(false)
        return
      }

      // Upload image to Supabase Storage
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg"
      const fileName = `${driver.id}-${Date.now()}.${fileExt}`
      const filePath = `driver-profiles/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("driver-profiles")
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        console.error("[v0] Upload error:", uploadError)
        setError("Error al subir la imagen. Intenta nuevamente.")
        setUploading(false)
        return
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("driver-profiles").getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from("drivers")
        .update({ profile_image_url: publicUrl })
        .eq("id", driver.id)

      if (updateError) {
        console.error("[v0] Update error:", updateError)
        setError("Error al actualizar perfil. Intenta nuevamente.")
        setUploading(false)
        return
      }

      setDriver({ ...driver, profile_image_url: publicUrl })
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err: any) {
      console.error("[v0] Upload error:", err)
      setError(err.message || "Error al subir imagen")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando perfil...</p>
      </div>
    )
  }

  if (!driver) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <h1 className="text-lg font-bold text-foreground">Panel del Conductor</h1>
        <div className="flex items-center gap-2">
          <Link href="/driver/history">
            <Button variant="ghost" size="icon" className="relative" title="Historial de Viajes">
              <Clock className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/calculador">
            <Button variant="ghost" size="icon" className="relative" title="Calculadora de Tarifas">
              <Calculator className="h-5 w-5" />
            </Button>
          </Link>
          {isSharing && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-md">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">GPS Activo</span>
            </div>
          )}
          <NotificationBell userType="driver" userId={driver.id} />
          <UserNav userRole="driver" userId={driver.id} />
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto space-y-4">
        {error && <Card className="p-3 bg-destructive/10 border-destructive/30 text-destructive text-sm">{error}</Card>}

        {/* Driver Profile Card */}
        <Card className="p-4 bg-card border-border/50">
          <div className="flex items-start gap-4">
            <div className="relative group">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border-2 border-primary hover:border-primary/80 hover:bg-muted/80 transition-all cursor-pointer disabled:opacity-50 relative"
              >
                {driver.profile_image_url ? (
                  <Image
                    src={driver.profile_image_url || "/placeholder.svg"}
                    alt={driver.full_name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 text-muted-foreground">👤</div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Upload className="w-4 h-4 text-white" />
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} hidden />
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{driver.full_name}</h2>
              <p className="text-sm text-muted-foreground">{driver.phone}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-gray-500"}`} />
                <span className="text-sm text-foreground">{isOnline ? "En línea" : "Fuera de línea"}</span>
              </div>
            </div>
          </div>

          <Button onClick={handleToggleOnline} className="w-full mt-4" variant={isOnline ? "default" : "outline"}>
            {isOnline ? "🟢 Cambiar a Fuera de Línea" : "⚫ Cambiar a En Línea"}
          </Button>
        </Card >

        {/* Map Card */}
        {
          location && (
            <Card className="p-4 bg-card border-border/50 overflow-hidden shadow-lg">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Tu Ubicación en Vivo
              </h3>
              <div className="h-72 rounded-lg overflow-hidden">
                <GlobalMap
                  showDrivers={true}
                  currentDriverId={driver.id}
                  center={location}
                />
              </div>
            </Card>
          )
        }
      </main >

      {/* Floating Chat Button */}
      {activeRideId && (
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg flex items-center justify-center z-40 transition-transform hover:scale-110"
          title="Chat con pasajero"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      )}

      {/* Chat Modal */}
      {showChat && activeRideId && driver && (
        <RideChat
          rideId={activeRideId}
          userType="driver"
          userId={driver.id}
          onClose={() => setShowChat(false)}
        />
      )}
    </div >
  )
}
