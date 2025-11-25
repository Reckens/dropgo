"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, MapPin, Navigation } from "lucide-react"

interface RideRequestModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: {
        pickup_location: string
        pickup_latitude: number
        pickup_longitude: number
        dropoff_location?: string
        dropoff_latitude?: number
        dropoff_longitude?: number
    }) => void
    currentLocation: { lat: number; lng: number } | null
}

export default function RideRequestModal({
    isOpen,
    onClose,
    onSubmit,
    currentLocation
}: RideRequestModalProps) {
    const [pickupLocation, setPickupLocation] = useState("")
    const [dropoffLocation, setDropoffLocation] = useState("")
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!currentLocation) {
                alert("No se pudo obtener tu ubicación")
                return
            }

            onSubmit({
                pickup_location: pickupLocation || "Mi ubicación actual",
                pickup_latitude: currentLocation.lat,
                pickup_longitude: currentLocation.lng,
                dropoff_location: dropoffLocation || undefined,
            })

            onClose()
        } catch (err) {
            console.error(err)
            alert("Error al solicitar viaje")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Solicitar Viaje</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            <MapPin className="w-4 h-4 inline mr-2" />
                            Ubicación de recogida
                        </label>
                        <input
                            type="text"
                            value={pickupLocation}
                            onChange={(e) => setPickupLocation(e.target.value)}
                            className="w-full px-4 py-2 bg-muted text-foreground border border-border rounded-lg focus:border-primary focus:outline-none"
                            placeholder="Mi ubicación actual"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {currentLocation
                                ? `Lat: ${currentLocation.lat.toFixed(6)}, Lng: ${currentLocation.lng.toFixed(6)}`
                                : "Detectando ubicación..."}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            <Navigation className="w-4 h-4 inline mr-2" />
                            Destino (opcional)
                        </label>
                        <input
                            type="text"
                            value={dropoffLocation}
                            onChange={(e) => setDropoffLocation(e.target.value)}
                            className="w-full px-4 py-2 bg-muted text-foreground border border-border rounded-lg focus:border-primary focus:outline-none"
                            placeholder="¿A dónde vas?"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-primary hover:bg-primary/90"
                            disabled={loading || !currentLocation}
                        >
                            {loading ? "Buscando conductores..." : "Solicitar Viaje"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
