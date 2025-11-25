"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase/client"
import { MapPin, Navigation, User, Phone, Clock } from "lucide-react"

interface ActiveRide {
    id: string
    customer_id: string
    pickup_location: string
    pickup_latitude: number
    pickup_longitude: number
    dropoff_location: string | null
    dropoff_latitude: number | null
    dropoff_longitude: number | null
    status: string
    accepted_at: string
    started_at: string | null
    completed_at: string | null
    customer?: {
        full_name: string
        phone: string
        profile_image_url: string | null
    }
}

export default function ActiveRidePage() {
    const [ride, setRide] = useState<ActiveRide | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const router = useRouter()
    const supabase = getSupabaseClient()

    useEffect(() => {
        const driverId = localStorage.getItem("driverId")
        if (!driverId) {
            router.push("/driver/login")
            return
        }

        loadActiveRide(driverId)
    }, [])

    const loadActiveRide = async (driverId: string) => {
        try {
            const { data, error } = await supabase
                .from("ride_requests")
                .select(`
          *,
          customer:customers(full_name, phone, profile_image_url)
        `)
                .eq("driver_id", driverId)
                .in("status", ["accepted", "in_progress"])
                .order("accepted_at", { ascending: false })
                .limit(1)
                .single()

            if (error) {
                console.error("Error loading active ride:", error)
                setRide(null)
            } else {
                setRide(data)
            }
        } catch (err) {
            console.error("Error:", err)
            setRide(null)
        } finally {
            setLoading(false)
        }
    }

    const handleStartRide = async () => {
        if (!ride) return

        setProcessing(true)
        try {
            const { error } = await supabase
                .from("ride_requests")
                .update({
                    status: "in_progress",
                    started_at: new Date().toISOString()
                })
                .eq("id", ride.id)

            if (error) throw error

            setRide({ ...ride, status: "in_progress", started_at: new Date().toISOString() })
            alert("¡Viaje iniciado!")
        } catch (err: any) {
            console.error("Error starting ride:", err)
            alert("Error al iniciar viaje")
        } finally {
            setProcessing(false)
        }
    }

    const handleCompleteRide = async () => {
        if (!ride) return

        setProcessing(true)
        try {
            const { error } = await supabase
                .from("ride_requests")
                .update({
                    status: "completed",
                    completed_at: new Date().toISOString()
                })
                .eq("id", ride.id)

            if (error) throw error

            alert("¡Viaje completado!")
            router.push("/driver")
        } catch (err: any) {
            console.error("Error completing ride:", err)
            alert("Error al completar viaje")
        } finally {
            setProcessing(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Cargando...</p>
            </div>
        )
    }

    if (!ride) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Card className="p-8 text-center max-w-md">
                    <h2 className="text-xl font-bold mb-4">No hay viaje activo</h2>
                    <p className="text-muted-foreground mb-6">
                        No tienes ningún viaje aceptado o en progreso en este momento.
                    </p>
                    <Button onClick={() => router.push("/driver")}>
                        Volver al Dashboard
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Viaje Activo</h1>
                    <Button variant="outline" onClick={() => router.push("/driver")}>
                        ← Volver
                    </Button>
                </div>

                <Card className="p-6 space-y-6">
                    {/* Customer Info */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            {ride.customer?.profile_image_url ? (
                                <img
                                    src={ride.customer.profile_image_url}
                                    alt={ride.customer.full_name}
                                    className="w-16 h-16 rounded-full object-cover"
                                />
                            ) : (
                                <User className="w-8 h-8 text-muted-foreground" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{ride.customer?.full_name || "Cliente"}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {ride.customer?.phone || "N/A"}
                            </p>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Estado del viaje</p>
                        <p className="font-semibold text-lg">
                            {ride.status === "accepted" && "✅ Aceptado - Listo para iniciar"}
                            {ride.status === "in_progress" && "🚗 En progreso"}
                        </p>
                    </div>

                    {/* Locations */}
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <MapPin className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                            <div>
                                <p className="text-sm text-muted-foreground">Recogida</p>
                                <p className="font-medium">{ride.pickup_location}</p>
                            </div>
                        </div>

                        {ride.dropoff_location && (
                            <div className="flex gap-3">
                                <Navigation className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Destino</p>
                                    <p className="font-medium">{ride.dropoff_location}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Timestamps */}
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>Aceptado: {new Date(ride.accepted_at).toLocaleString("es-ES")}</span>
                        </div>
                        {ride.started_at && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>Iniciado: {new Date(ride.started_at).toLocaleString("es-ES")}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-4">
                        {ride.status === "accepted" && (
                            <Button
                                onClick={handleStartRide}
                                disabled={processing}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg"
                            >
                                {processing ? "Iniciando..." : "🚗 Iniciar Viaje"}
                            </Button>
                        )}

                        {ride.status === "in_progress" && (
                            <Button
                                onClick={handleCompleteRide}
                                disabled={processing}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
                            >
                                {processing ? "Completando..." : "✅ Completar Viaje"}
                            </Button>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    )
}
