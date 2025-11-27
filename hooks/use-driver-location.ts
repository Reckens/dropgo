"use client"

import { useEffect, useRef, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"

interface UseDriverLocationProps {
    driverId: string | null
    isActive: boolean // True when driver has an active ride
}

export function useDriverLocation({ driverId, isActive }: UseDriverLocationProps) {
    const [isSharing, setIsSharing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const watchIdRef = useRef<number | null>(null)
    const supabase = getSupabaseClient()

    useEffect(() => {
        if (!driverId || !isActive || !supabase) {
            // Stop sharing location if not active
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
                setIsSharing(false)

                // Clear location in database
                supabase
                    .from('drivers')
                    .update({
                        is_sharing_location: false,
                        current_lat: null,
                        current_lng: null,
                    })
                    .eq('id', driverId)
            }
            return
        }

        // Check if geolocation is available
        if (!navigator.geolocation) {
            setError("Geolocalización no disponible en este dispositivo")
            return
        }

        const updateLocation = async (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords

            try {
                const { error: updateError } = await supabase
                    .from('drivers')
                    .update({
                        current_lat: latitude,
                        current_lng: longitude,
                        last_location_update: new Date().toISOString(),
                        is_sharing_location: true,
                    })
                    .eq('id', driverId)

                if (updateError) {
                    console.error("Error updating location:", updateError)
                    setError("Error al actualizar ubicación")
                } else {
                    setIsSharing(true)
                    setError(null)
                }
            } catch (err) {
                console.error("Error updating location:", err)
                setError("Error al actualizar ubicación")
            }
        }

        const handleError = (error: GeolocationPositionError) => {
            console.error("Geolocation error:", error)
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    setError("Permiso de ubicación denegado")
                    break
                case error.POSITION_UNAVAILABLE:
                    setError("Ubicación no disponible")
                    break
                case error.TIMEOUT:
                    setError("Tiempo de espera agotado")
                    break
                default:
                    setError("Error desconocido al obtener ubicación")
            }
            setIsSharing(false)
        }

        // Start watching position
        const watchId = navigator.geolocation.watchPosition(
            updateLocation,
            handleError,
            {
                enableHighAccuracy: true, // Better accuracy
                timeout: 10000, // 10 seconds timeout
                maximumAge: 5000, // Accept cached position up to 5 seconds old
            }
        )

        watchIdRef.current = watchId
        setIsSharing(true)

        // Cleanup on unmount
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
                setIsSharing(false)

                // Clear location in database
                if (driverId && supabase) {
                    supabase
                        .from('drivers')
                        .update({
                            is_sharing_location: false,
                            current_lat: null,
                            current_lng: null,
                        })
                        .eq('id', driverId)
                }
            }
        }
    }, [driverId, isActive, supabase])

    return { isSharing, error }
}
