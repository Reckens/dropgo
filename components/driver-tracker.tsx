"use client"

import { useEffect, useState, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import L from "leaflet"

interface DriverTrackerProps {
    driverId: string | null
    customerLat: number
    customerLng: number
    map: L.Map | null
}

interface DriverLocation {
    lat: number
    lng: number
    lastUpdate: string
}

export function DriverTracker({ driverId, customerLat, customerLng, map }: DriverTrackerProps) {
    const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)
    const [distance, setDistance] = useState<number | null>(null)
    const [eta, setEta] = useState<number | null>(null)
    const driverMarkerRef = useRef<L.Marker | null>(null)
    const supabase = getSupabaseClient()

    // Calculate distance between two points (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371 // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    // Calculate ETA (assuming average speed of 30 km/h in city)
    const calculateETA = (distanceKm: number): number => {
        const averageSpeed = 30 // km/h
        const hours = distanceKm / averageSpeed
        return Math.ceil(hours * 60) // Convert to minutes
    }

    useEffect(() => {
        if (!driverId || !supabase || !map) return

        // Fetch initial driver location
        const fetchDriverLocation = async () => {
            const { data, error } = await supabase
                .from('drivers')
                .select('current_lat, current_lng, last_location_update')
                .eq('id', driverId)
                .eq('is_sharing_location', true)
                .single()

            if (!error && data && data.current_lat && data.current_lng) {
                const location = {
                    lat: data.current_lat,
                    lng: data.current_lng,
                    lastUpdate: data.last_location_update,
                }
                setDriverLocation(location)

                // Calculate distance and ETA
                const dist = calculateDistance(customerLat, customerLng, location.lat, location.lng)
                setDistance(dist)
                setEta(calculateETA(dist))

                // Create or update driver marker
                if (!driverMarkerRef.current) {
                    // Create custom car icon
                    const carIcon = L.divIcon({
                        className: 'driver-marker',
                        html: `
              <div style="
                background: #10b981;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                font-size: 20px;
              ">
                🚗
              </div>
            `,
                        iconSize: [40, 40],
                        iconAnchor: [20, 20],
                    })

                    driverMarkerRef.current = L.marker([location.lat, location.lng], {
                        icon: carIcon,
                        zIndexOffset: 1000,
                    }).addTo(map)
                } else {
                    // Animate marker to new position
                    driverMarkerRef.current.setLatLng([location.lat, location.lng])
                }
            }
        }

        fetchDriverLocation()

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`driver-location-${driverId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'drivers',
                    filter: `id=eq.${driverId}`,
                },
                (payload: any) => {
                    if (payload.new.current_lat && payload.new.current_lng && payload.new.is_sharing_location) {
                        const location = {
                            lat: payload.new.current_lat,
                            lng: payload.new.current_lng,
                            lastUpdate: payload.new.last_location_update,
                        }
                        setDriverLocation(location)

                        // Calculate distance and ETA
                        const dist = calculateDistance(customerLat, customerLng, location.lat, location.lng)
                        setDistance(dist)
                        setEta(calculateETA(dist))

                        // Update marker position with animation
                        if (driverMarkerRef.current) {
                            driverMarkerRef.current.setLatLng([location.lat, location.lng])
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
            if (driverMarkerRef.current && map) {
                map.removeLayer(driverMarkerRef.current)
                driverMarkerRef.current = null
            }
        }
    }, [driverId, supabase, map, customerLat, customerLng])

    if (!driverLocation) return null

    return (
        <div className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg p-3 max-w-xs">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold">Conductor en camino</span>
            </div>
            {distance !== null && (
                <div className="mt-2 text-sm text-gray-600">
                    <p>📍 Distancia: <span className="font-semibold">{distance.toFixed(1)} km</span></p>
                </div>
            )}
            {eta !== null && (
                <div className="text-sm text-gray-600">
                    <p>⏱️ Tiempo estimado: <span className="font-semibold">{eta} min</span></p>
                </div>
            )}
        </div>
    )
}
