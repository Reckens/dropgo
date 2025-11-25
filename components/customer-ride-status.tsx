"use client"
import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { MapPin, Navigation, Star, X } from "lucide-react"
import RatingModal from "@/components/rating-modal"

interface RideStatus {
    id: string
    driver_id: string
    pickup_location: string
    dropoff_location: string | null
    status: string
    accepted_at: string | null
    started_at: string | null
    completed_at: string | null
    driver?: {
        full_name: string
        phone: string
        profile_image_url: string | null
    }
}

interface CustomerRideStatusProps {
    customerId: string
}

export default function CustomerRideStatus({ customerId }: CustomerRideStatusProps) {
    const [ride, setRide] = useState<RideStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [showRatingModal, setShowRatingModal] = useState(false)
    const [hasRated, setHasRated] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)
    const supabase = getSupabaseClient()

    // Load active ride and set up realtime subscription
    useEffect(() => {
        if (!customerId || !supabase) return

        const loadActiveRide = async () => {
            try {
                const { data, error } = await supabase
                    .from('ride_requests')
                    .select(`*, driver:drivers(full_name, phone, profile_image_url)`)
                    .eq('customer_id', customerId)
                    .in('status', ['pending', 'accepted', 'in_progress', 'completed'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()
                if (error) {
                    console.log('No active ride:', error)
                    setRide(null)
                } else {
                    setRide(data)
                    // If ride already completed, check localStorage to avoid showing rating again
                    if (data.status === 'completed') {
                        const stored = localStorage.getItem(`rated_${data.id}`)
                        if (stored) {
                            setHasRated(true)
                        } else {
                            checkIfRated(data.id)
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading ride:', err)
                setRide(null)
            } finally {
                setLoading(false)
            }
        }

        loadActiveRide()

        const channel = supabase
            .channel('customer_ride_status')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'ride_requests',
                filter: `customer_id=eq.${customerId}`,
            }, async (payload: any) => {
                if (payload.new.driver_id && !ride?.driver) {
                    const { data } = await supabase
                        .from('drivers')
                        .select('full_name, phone, profile_image_url')
                        .eq('id', payload.new.driver_id)
                        .single()
                    setRide({ ...payload.new, driver: data })
                } else {
                    setRide(payload.new)
                }
                if (payload.new.status === 'completed' && !hasRated) {
                    checkIfRated(payload.new.id)
                }
            })
            .subscribe()

        const interval = setInterval(() => {
            if (ride && ['accepted', 'in_progress'].includes(ride.status)) {
                loadActiveRide()
            }
        }, 5000)

        return () => {
            channel.unsubscribe()
            clearInterval(interval)
        }
    }, [customerId, supabase])

    const checkIfRated = async (rideId: string) => {
        const { data } = await supabase
            .from('ratings')
            .select('id')
            .eq('ride_request_id', rideId)
            .eq('rating_from', 'customer')
            .single()
        if (!data) {
            setShowRatingModal(true)
            setHasRated(false)
        } else {
            setHasRated(true)
        }
    }

    if (loading) {
        return (
            <Card className="p-4">
                <p className="text-sm text-muted-foreground">Cargando estado del viaje...</p>
            </Card>
        )
    }

    if (!ride || isDismissed) return null

    return (
        <>
            <Card className="p-6 space-y-4 border-2 border-primary/20 relative">
                <button
                    onClick={() => setIsDismissed(true)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center justify-between pr-6">
                    <h3 className="font-semibold text-lg">Estado del Viaje</h3>
                    <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${ride.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : ride.status === 'accepted'
                                ? 'bg-green-100 text-green-800'
                                : ride.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                    >
                        {ride.status === 'pending' && '⏳ Buscando...'}
                        {ride.status === 'accepted' && '✅ Asignado'}
                        {ride.status === 'in_progress' && '🚗 En camino'}
                        {ride.status === 'completed' && '✅ Completado'}
                    </span>
                </div>

                {ride.driver && ride.status !== 'pending' && (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center">
                            {ride.driver.profile_image_url ? (
                                <img
                                    src={ride.driver.profile_image_url}
                                    alt={ride.driver.full_name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <span className="text-lg font-bold">{ride.driver.full_name[0]}</span>
                            )}
                        </div>
                        <div>
                            <p className="font-medium">{ride.driver.full_name}</p>
                            <p className="text-sm text-muted-foreground">{ride.driver.phone}</p>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-muted-foreground">Recogida</p>
                            <p className="font-medium">{ride.pickup_location}</p>
                        </div>
                    </div>
                    {ride.dropoff_location && (
                        <div className="flex gap-2 text-sm">
                            <Navigation className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-muted-foreground">Destino</p>
                                <p className="font-medium">{ride.dropoff_location}</p>
                            </div>
                        </div>
                    )}
                </div>

                {ride.status === 'pending' && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                        Estamos buscando un conductor cercano para ti...
                    </p>
                )}

                {ride.status === 'accepted' && (
                    <p className="text-sm text-green-600 text-center py-2 font-medium">
                        ¡Tu conductor está en camino a recogerte!
                    </p>
                )}

                {ride.status === 'in_progress' && (
                    <div className="text-center pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-2">¿Cómo fue tu experiencia?</p>
                        <div className="flex justify-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className="w-6 h-6 text-yellow-400 cursor-pointer hover:fill-yellow-400"
                                    onClick={() => setShowRatingModal(true)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {ride.status === 'completed' && hasRated && (
                    <p className="text-sm text-green-600 text-center py-2">¡Gracias por tu calificación!</p>
                )}
            </Card>

            {showRatingModal && ride.driver && (
                <RatingModal
                    isOpen={showRatingModal}
                    onClose={() => {
                        setShowRatingModal(false)
                        setHasRated(true)
                        if (ride?.id) {
                            localStorage.setItem(`rated_${ride.id}`, 'true')
                        }
                    }}
                    rideId={ride.id}
                    customerId={customerId}
                    driverId={ride.driver_id}
                    driverName={ride.driver.full_name}
                    ratingFrom="customer"
                    targetName={ride.driver.full_name}
                />
            )}
        </>
    )
}
