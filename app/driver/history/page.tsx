"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"
import { MapPin, Navigation, Clock, User, ArrowLeft } from "lucide-react"
import StarRating from "@/components/star-rating"

interface RideHistory {
    id: string
    customer_id: string
    pickup_location: string
    dropoff_location: string | null
    status: string
    created_at: string
    accepted_at: string | null
    started_at: string | null
    completed_at: string | null
    customer?: {
        full_name: string
        phone: string
        profile_image_url: string | null
    }
    rating?: {
        rating: number
        comment: string | null
    }
}

export default function DriverHistoryPage() {
    const [rides, setRides] = useState<RideHistory[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "completed" | "cancelled">("all")
    const [stats, setStats] = useState({ total: 0, completed: 0, cancelled: 0 })
    const router = useRouter()
    const supabase = getSupabaseClient()

    useEffect(() => {
        const driverId = localStorage.getItem("driverId")
        if (!driverId) {
            router.push("/driver/login")
            return
        }

        loadRideHistory(driverId)
    }, [filter])

    const loadRideHistory = async (driverId: string) => {
        setLoading(true)
        try {
            let query = supabase
                .from("ride_requests")
                .select(`
          *,
          customer:customers(full_name, phone, profile_image_url),
          rating:ratings!ride_request_id(rating, comment)
        `)
                .eq("driver_id", driverId)
                .order("created_at", { ascending: false })

            if (filter === "completed") {
                query = query.eq("status", "completed")
            } else if (filter === "cancelled") {
                query = query.eq("status", "cancelled")
            } else {
                query = query.in("status", ["completed", "cancelled"])
            }

            const { data, error } = await query

            if (error) throw error

            // Flatten the rating data and filter for driver ratings
            const formattedData = (data || []).map((ride: any) => {
                const driverRating = ride.rating?.find((r: any) => r.rating_from === "customer")
                return {
                    ...ride,
                    rating: driverRating || null
                }
            })

            setRides(formattedData)

            // Calculate stats
            const completed = formattedData.filter((r: any) => r.status === "completed").length
            const cancelled = formattedData.filter((r: any) => r.status === "cancelled").length
            setStats({
                total: formattedData.length,
                completed,
                cancelled
            })
        } catch (err) {
            console.error("Error loading ride history:", err)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-card border-b border-border p-4 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/driver")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">Historial de Viajes</h1>
                        <p className="text-sm text-muted-foreground">
                            {stats.completed} completados • {stats.cancelled} cancelados
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-4">
                {/* Filters */}
                <div className="flex gap-2">
                    <Button
                        variant={filter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("all")}
                    >
                        Todos ({stats.total})
                    </Button>
                    <Button
                        variant={filter === "completed" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("completed")}
                    >
                        Completados ({stats.completed})
                    </Button>
                    <Button
                        variant={filter === "cancelled" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilter("cancelled")}
                    >
                        Cancelados ({stats.cancelled})
                    </Button>
                </div>

                {/* Loading State */}
                {loading && (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">Cargando historial...</p>
                    </Card>
                )}

                {/* Empty State */}
                {!loading && rides.length === 0 && (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground mb-2">No hay viajes en tu historial</p>
                        <Button onClick={() => router.push("/driver")}>
                            Ir al Dashboard
                        </Button>
                    </Card>
                )}

                {/* Ride List */}
                {!loading && rides.map((ride) => (
                    <Card key={ride.id} className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                    {ride.customer?.profile_image_url ? (
                                        <img
                                            src={ride.customer.profile_image_url}
                                            alt={ride.customer.full_name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-6 h-6 text-muted-foreground" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold">{ride.customer?.full_name || "Cliente"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(ride.created_at)}
                                    </p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${ride.status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                {ride.status === "completed" ? "✅ Completado" : "❌ Cancelado"}
                            </span>
                        </div>

                        {/* Locations */}
                        <div className="space-y-2 pl-2 border-l-2 border-muted ml-6">
                            <div className="flex gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <div>
                                    <p className="text-muted-foreground text-xs">Recogida</p>
                                    <p className="font-medium">{ride.pickup_location}</p>
                                </div>
                            </div>
                            {ride.dropoff_location && (
                                <div className="flex gap-2 text-sm">
                                    <Navigation className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-muted-foreground text-xs">Destino</p>
                                        <p className="font-medium">{ride.dropoff_location}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Timestamps */}
                        {ride.completed_at && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>Completado: {formatDate(ride.completed_at)}</span>
                            </div>
                        )}

                        {/* Rating Received */}
                        {ride.status === "completed" && ride.rating && (
                            <div className="pt-3 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Calificación recibida:</p>
                                <div className="flex items-center gap-2">
                                    <StarRating rating={ride.rating.rating} showCount={false} size="sm" />
                                    {ride.rating.comment && (
                                        <p className="text-sm text-muted-foreground italic">
                                            "{ride.rating.comment}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {ride.status === "completed" && !ride.rating && (
                            <div className="pt-3 border-t">
                                <p className="text-xs text-muted-foreground">Sin calificación del cliente</p>
                            </div>
                        )}
                    </Card>
                ))}
            </main>
        </div>
    )
}
