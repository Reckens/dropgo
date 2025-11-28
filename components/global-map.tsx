"use client"

import { useEffect, useRef, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"

export interface DriverLocation {
    id: string
    full_name: string
    latitude: number
    longitude: number
    profile_image_url: string | null
    is_online: boolean
    average_rating: number
    total_ratings: number
}

export interface GlobalMapProps {
    // Origin and destination for routes
    origin?: [number, number] | null
    destination?: [number, number] | null

    // Callbacks
    onMapClick?: (lat: number, lng: number) => void
    onDriverSelect?: (driver: DriverLocation) => void
    onMapReady?: (map: any) => void

    // Display options
    showDrivers?: boolean
    showRoute?: boolean
    selectedDriverId?: string | null
    currentDriverId?: string

    // Map settings
    center?: [number, number]
    zoom?: number
}

export default function GlobalMap({
    origin,
    destination,
    onMapClick,
    onDriverSelect,
    onMapReady,
    showDrivers = false,
    showRoute = true,
    selectedDriverId,
    currentDriverId,
    center,
    zoom = 13,
}: GlobalMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const mapRef = useRef<any>(null)
    const [L, setL] = useState<any>(null)

    // Markers
    const originMarkerRef = useRef<any>(null)
    const destMarkerRef = useRef<any>(null)
    const polylineRef = useRef<any>(null)
    const circleRef = useRef<any>(null)
    const driverMarkersRef = useRef<Map<string, any>>(new Map())

    // State
    const [drivers, setDrivers] = useState<DriverLocation[]>([])
    const supabase = getSupabaseClient()

    // Load Leaflet
    useEffect(() => {
        import("leaflet").then((module) => setL(module.default))
    }, [])

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || mapRef.current || !L) return

        // Use provided center or default to Cochabamba
        const mapCenter = center || origin || [-17.3895, -66.1568]
        mapRef.current = L.map(mapContainer.current).setView(mapCenter, zoom)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
            maxZoom: 19,
        }).addTo(mapRef.current)

        // Add click handler
        if (onMapClick) {
            mapRef.current.on("click", (e: any) => {
                const { lat, lng } = e.latlng

                if (circleRef.current) mapRef.current.removeLayer(circleRef.current)

                circleRef.current = L.circle([lat, lng], {
                    radius: 50,
                    color: "#ef4444",
                    fillColor: "#ef4444",
                    fillOpacity: 0.2,
                    weight: 2,
                }).addTo(mapRef.current)

                onMapClick(lat, lng)
            })
        }

        // Notify parent that map is ready
        if (onMapReady) {
            onMapReady(mapRef.current)
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
    }, [L])

    // Update origin marker
    useEffect(() => {
        if (!mapRef.current || !L || !origin) return

        const icon = L.divIcon({
            html: '<div class="flex items-center justify-center w-10 h-10 bg-accent text-primary rounded-full border-3 border-white shadow-lg font-bold">📍</div>',
            iconSize: [40, 40],
            className: "custom-icon",
        })

        if (originMarkerRef.current) {
            originMarkerRef.current.setLatLng(origin)
        } else {
            originMarkerRef.current = L.marker(origin, { icon }).bindPopup("Origen").addTo(mapRef.current)
        }

        mapRef.current.setView(origin, zoom)
    }, [origin, L, zoom])

    // Update destination and route
    useEffect(() => {
        if (!mapRef.current || !L) return

        if (destination && showRoute && origin) {
            const icon = L.divIcon({
                html: '<div class="flex items-center justify-center w-10 h-10 bg-destructive text-white rounded-full border-3 border-white shadow-lg font-bold">📌</div>',
                iconSize: [40, 40],
                className: "custom-icon",
            })

            if (destMarkerRef.current) {
                destMarkerRef.current.setLatLng(destination)
            } else {
                destMarkerRef.current = L.marker(destination, { icon }).bindPopup("Destino").addTo(mapRef.current)
            }

            if (polylineRef.current) {
                polylineRef.current.setLatLngs([origin, destination])
            } else {
                polylineRef.current = L.polyline([origin, destination], {
                    color: "#ef4444",
                    weight: 4,
                    opacity: 0.8,
                }).addTo(mapRef.current)
            }

            const group = new L.FeatureGroup([originMarkerRef.current, destMarkerRef.current])
            mapRef.current.fitBounds(group.getBounds().pad(0.1))
        } else {
            if (destMarkerRef.current) {
                mapRef.current.removeLayer(destMarkerRef.current)
                destMarkerRef.current = null
            }
            if (polylineRef.current) {
                mapRef.current.removeLayer(polylineRef.current)
                polylineRef.current = null
            }
        }
    }, [destination, origin, L, showRoute, zoom])


    // Fetch and subscribe to drivers
    useEffect(() => {
        if (!supabase || !showDrivers) return // Removed !L dependency - fetch immediately

        const fetchDrivers = async () => {
            const { data } = await supabase
                .from("drivers")
                .select("*")
                .eq("is_online", true)
                .not("latitude", "is", null)

            if (data) setDrivers(data)
        }

        fetchDrivers()

        const channel = supabase
            .channel("drivers-global")
            .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, (payload: any) => {
                if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
                    setDrivers((prev) => {
                        const idx = prev.findIndex((d) => d.id === payload.new.id)
                        if (idx >= 0) {
                            const updated = [...prev]
                            updated[idx] = payload.new
                            return updated
                        }
                        return [...prev, payload.new]
                    })
                } else if (payload.eventType === "DELETE") {
                    setDrivers((prev) => prev.filter((d) => d.id !== payload.old.id))
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, showDrivers]) // Removed L from dependencies

    // Render driver markers
    useEffect(() => {
        if (!mapRef.current || !L || !showDrivers) return

        driverMarkersRef.current.forEach((m) => mapRef.current.removeLayer(m))
        driverMarkersRef.current.clear()

        drivers.forEach((driver) => {
            if (!driver.latitude || !driver.longitude) return

            const isSelected = driver.id === selectedDriverId
            const isCurrent = driver.id === currentDriverId
            const size = isSelected || isCurrent ? 96 : 64

            const div = document.createElement("div")
            div.className = "relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
            div.style.width = size + "px"
            div.style.height = size + "px"

            const circle = document.createElement("div")
            circle.className = "absolute inset-0 rounded-full border-4 flex items-center justify-center"
            circle.style.borderColor = isCurrent ? "#FFA500" : isSelected ? "#EF4444" : "#16A34A"
            circle.style.backgroundColor = isCurrent ? "#FFD700" : isSelected ? "#FECACA" : "#22C55E"

            const img = document.createElement("img")
            img.src = driver.profile_image_url || "/driver-profile.png"
            img.alt = driver.full_name
            img.className = "w-full h-full rounded-full object-cover border-2 border-white"
            img.style.width = "calc(100% - 8px)"
            img.style.height = "calc(100% - 8px)"

            circle.appendChild(img)
            div.appendChild(circle)

            const icon = L.divIcon({
                html: div.outerHTML,
                iconSize: [size, size],
                className: "driver-marker",
            })

            const marker = L.marker([driver.latitude, driver.longitude], { icon })
                .bindTooltip(driver.full_name, { permanent: false, direction: "top", offset: [0, -10] })

            if (onDriverSelect) {
                marker.on("click", () => onDriverSelect(driver))
            }

            marker.addTo(mapRef.current)
            driverMarkersRef.current.set(driver.id, marker)
        })
    }, [drivers, selectedDriverId, currentDriverId, onDriverSelect, L, showDrivers])

    return <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden" />
}
