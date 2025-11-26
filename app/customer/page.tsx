"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UserNav } from "@/components/user-nav"
import GlobalMap from "@/components/global-map"
import { SearchLocations } from "@/components/search-locations"
import { getSupabaseClient } from "@/lib/supabase/client"
import NotificationBell from "@/components/notification-bell"
import CustomerRideStatus from "@/components/customer-ride-status"
import StarRating from "@/components/star-rating"
import { MapPin, Calculator, Clock } from "lucide-react"

interface DriverLocation {
  id: string
  full_name: string
  latitude: number
  longitude: number
  profile_image_url: string | null
  is_online: boolean
}

export default function CustomerPage() {
  const [customerId, setCustomerId] = useState<string>("")
  const [customerName, setCustomerName] = useState<string>("")
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null)
  const [pickupLocation, setPickupLocation] = useState<string>("")
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [dropoffLocation, setDropoffLocation] = useState<string>("")
  const [dropoffLat, setDropoffLat] = useState<number | null>(null)
  const [dropoffLng, setDropoffLng] = useState<number | null>(null)
  const [pickupEdited, setPickupEdited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  const [hasActiveRide, setHasActiveRide] = useState(false)
  const [activeRideStatus, setActiveRideStatus] = useState<string | null>(null)
  const router = useRouter()
  const [supabase, setSupabase] = useState<ReturnType<typeof getSupabaseClient> | null>(null)

  useEffect(() => {
    const client = getSupabaseClient()
    setSupabase(client)
    setMounted(true)
    const id = localStorage.getItem("customerId")
    const phone = localStorage.getItem("customerPhone")

    if (!id || !phone) {
      router.push("/auth/customer")
      return
    }

    setCustomerId(id)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupLat(position.coords.latitude)
        setPickupLng(position.coords.longitude)
        setPickupLocation("Mi ubicación actual")
        setPickupEdited(false)
      },
      () => {
        setPickupLat(-17.3895)
        setPickupLng(-66.1568)
        setPickupLocation("Cochabamba")
        setPickupEdited(false)
      },
    )

    // Fetch customer name
    const fetchCustomer = async () => {
      if (!client) return
      const { data } = await client.from("customers").select("full_name").eq("id", id).limit(1)
      if (data && data.length > 0) {
        setCustomerName(data[0].full_name)
      }
    }

    fetchCustomer()

    // Check for active ride
    const checkActiveRide = async () => {
      if (!client) return
      const { data } = await client
        .from('ride_requests')
        .select('id, status')
        .eq('customer_id', id)
        .in('status', ['pending', 'accepted', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        setHasActiveRide(true)
        setActiveRideStatus(data[0].status)
      } else {
        setHasActiveRide(false)
        setActiveRideStatus(null)
      }
    }

    checkActiveRide()

    // Subscribe to ride changes
    const channel = client
      .channel('customer_ride_check')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ride_requests',
        filter: `customer_id=eq.${id}`
      }, () => {
        checkActiveRide()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const handleSelectPickup = (lat: number, lng: number, name: string) => {
    setPickupLat(lat)
    setPickupLng(lng)
    setPickupLocation(name)
    setPickupEdited(true)
  }

  const handleSelectDropoff = (lat: number, lng: number, name: string) => {
    setDropoffLat(lat)
    setDropoffLng(lng)
    setDropoffLocation(name)
  }

  const handleCancelSearch = async () => {
    if (!supabase) return

    setLoading(true)
    setError("")

    try {
      // Cancel ALL active rides (pending, accepted, in_progress)
      const { data: activeRides, error: fetchError } = await supabase
        .from('ride_requests')
        .select('id, status')
        .eq('customer_id', customerId)
        .in('status', ['pending', 'accepted', 'in_progress'])

      if (fetchError) throw fetchError

      if (activeRides && activeRides.length > 0) {
        // Update all active rides to cancelled
        const { error: cancelError } = await supabase
          .from('ride_requests')
          .update({ status: 'cancelled' })
          .eq('customer_id', customerId)
          .in('status', ['pending', 'accepted', 'in_progress'])

        if (cancelError) throw cancelError

        // Reset state immediately
        setHasActiveRide(false)
        setActiveRideStatus(null)
        setError("")

        console.log(`Cancelled ${activeRides.length} ride(s)`)
      } else {
        setError("No hay viajes activos para cancelar")
      }
    } catch (err) {
      console.error("Error canceling search:", err)
      setError("Error al cancelar la búsqueda")
    } finally {
      setLoading(false)
    }
  }

  const handleRequestRide = async () => {
    if (!pickupLat || !pickupLng) {
      setError("Por favor ingresa la ubicación de recogida")
      return
    }

    // Prevent duplicate requests
    if (loading) {
      console.log("Request already in progress, ignoring...")
      return
    }

    setLoading(true)
    setError("")

    try {
      // If a specific driver is selected, create request only for that driver
      if (selectedDriver) {
        const { error: insertError } = await supabase?.from("ride_requests").insert([
          {
            customer_id: customerId,
            driver_id: selectedDriver.id,
            pickup_location: pickupLocation.trim() || "Mi ubicación actual",
            pickup_latitude: pickupLat,
            pickup_longitude: pickupLng,
            dropoff_location: dropoffLocation.trim() || null,
            dropoff_latitude: dropoffLat,
            dropoff_longitude: dropoffLng,
            status: "pending",
          },
        ])

        if (insertError) throw insertError

        setError("")
        alert(`¡Solicitud enviada a ${selectedDriver.full_name}!`)
        setPickupLocation("Mi ubicación actual")
        setDropoffLocation("")
        setSelectedDriver(null)
      } else {
        // No driver selected - send to all nearby drivers
        const response = await fetch('/api/rides/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customerId,
            pickup_location: pickupLocation.trim() || "Mi ubicación actual",
            pickup_latitude: pickupLat,
            pickup_longitude: pickupLng,
            dropoff_location: dropoffLocation.trim() || null,
            dropoff_latitude: dropoffLat || null,
            dropoff_longitude: dropoffLng || null
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Error al solicitar viaje")
        }

        setError("")
        alert(`¡Solicitud enviada! ${data.drivers_notified} conductores cercanos fueron notificados.`)
        setPickupLocation("Mi ubicación actual")
        setDropoffLocation("")
      }
    } catch (err: any) {
      console.error("[v0] Request error:", err)
      setError(err.message || "Error al solicitar viaje")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !customerId) return null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-foreground">DropGo Cliente</h1>
          <p className="text-sm text-muted-foreground">Bienvenido, {customerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/customer/history">
            <Button variant="ghost" size="icon" className="relative" title="Historial de Viajes">
              <Clock className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/calculador">
            <Button variant="ghost" size="icon" className="relative" title="Calculadora de Tarifas">
              <Calculator className="h-5 w-5" />
            </Button>
          </Link>
          <NotificationBell userType="customer" userId={customerId} />
          <UserNav userRole="customer" userId={customerId} />
        </div>
      </header>

      <main className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto space-y-4">
        {/* Map Card */}
        <Card className="p-4 bg-card border-border/50 overflow-hidden shadow-lg">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Conductores Disponibles
          </h3>
          <div className="h-72 rounded-lg overflow-hidden">
            <GlobalMap
              showDrivers={true}
              onDriverSelect={setSelectedDriver}
              selectedDriverId={selectedDriver?.id || null}
              center={pickupLat && pickupLng ? [pickupLat, pickupLng] : undefined}
            />
          </div>
        </Card>

        {/* Bottom Panel - Driver Selection and Ride Details */}
        <div className="space-y-4">
          {/* Selected Driver Info */}
          {selectedDriver && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedDriver.profile_image_url && (
                    <img
                      src={selectedDriver.profile_image_url || "/placeholder.svg"}
                      alt={selectedDriver.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{selectedDriver.full_name}</p>
                    <StarRating
                      rating={selectedDriver.average_rating || 0}
                      totalRatings={selectedDriver.total_ratings || 0}
                      size="sm"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDriver(null)}>
                  Cambiar
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">📍 Recogida</label>
              <div className="relative">
                <SearchLocations
                  placeholder="Dónde te recojan"
                  value={pickupLocation}
                  onChange={(value) => {
                    setPickupLocation(value)
                    if (value === "") {
                      setPickupEdited(false)
                    } else {
                      setPickupEdited(true)
                    }
                  }}
                  onSelect={handleSelectPickup}
                />
                {pickupLocation && (
                  <button
                    onClick={() => {
                      setPickupLocation("")
                      setPickupLat(null)
                      setPickupLng(null)
                      setPickupEdited(false)
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs bg-muted/50 hover:bg-muted px-2 py-1 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">🎯 Destino (opcional)</label>
              <SearchLocations
                placeholder="¿A dónde vamos?"
                value={dropoffLocation}
                onChange={setDropoffLocation}
                onSelect={handleSelectDropoff}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Real-time Ride Status */}
          <CustomerRideStatus customerId={customerId} />

          <Button
            onClick={hasActiveRide ? handleCancelSearch : handleRequestRide}
            disabled={loading || activeRideStatus === 'in_progress'}
            size="lg"
            className={`w-full text-lg font-semibold py-6 ${activeRideStatus === 'accepted'
              ? 'bg-destructive hover:bg-destructive/90 text-white'
              : activeRideStatus === 'pending'
                ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                : activeRideStatus === 'in_progress'
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : loading
                    ? 'bg-primary/50'
                    : 'bg-primary hover:bg-primary/90'
              }`}
          >
            {activeRideStatus === 'accepted'
              ? (loading ? "Cancelando..." : "❌ Cancelar Viaje")
              : activeRideStatus === 'pending'
                ? (loading ? "Cancelando..." : "🔍 Buscando conductor...")
                : activeRideStatus === 'in_progress'
                  ? "🚗 Viaje en progreso"
                  : (loading ? "Solicitando..." : selectedDriver ? `🚕 Pedir Viaje a ${selectedDriver.full_name}` : "🚕 Buscar Conductor")
            }
          </Button>
        </div>
      </main>
    </div>
  )
}
