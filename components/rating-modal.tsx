"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Star, X } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase/client"

interface RatingModalProps {
    isOpen: boolean
    onClose: () => void
    rideId: string
    customerId: string
    driverId: string
    driverName: string
    ratingFrom: "customer" | "driver"
    targetName: string // Name of person being rated
}

export default function RatingModal({
    isOpen,
    onClose,
    rideId,
    customerId,
    driverId,
    driverName,
    ratingFrom,
    targetName
}: RatingModalProps) {
    const [rating, setRating] = useState(0)
    const [hoveredRating, setHoveredRating] = useState(0)
    const [comment, setComment] = useState("")
    const [loading, setLoading] = useState(false)
    const supabase = getSupabaseClient()

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (rating === 0) {
            alert("Por favor selecciona una calificación")
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.from("ratings").insert([
                {
                    ride_request_id: rideId,
                    customer_id: customerId,
                    driver_id: driverId,
                    rating_from: ratingFrom,
                    rating: rating,
                    comment: comment.trim() || null
                }
            ])

            if (error) throw error

            alert("¡Gracias por tu calificación!")
            onClose()
        } catch (err: any) {
            console.error("Error submitting rating:", err)
            alert("Error al enviar calificación")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Califica tu experiencia</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                <div className="text-center">
                    <p className="text-muted-foreground mb-2">
                        ¿Cómo fue tu experiencia con {targetName}?
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Star Rating */}
                    <div className="flex justify-center gap-2 py-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className="transition-transform hover:scale-110"
                            >
                                <Star
                                    className={`w-10 h-10 ${star <= (hoveredRating || rating)
                                            ? "fill-yellow-400 text-yellow-400"
                                            : "text-gray-300"
                                        }`}
                                />
                            </button>
                        ))}
                    </div>

                    {rating > 0 && (
                        <p className="text-center text-sm font-medium">
                            {rating === 1 && "😞 Muy malo"}
                            {rating === 2 && "😕 Malo"}
                            {rating === 3 && "😐 Regular"}
                            {rating === 4 && "😊 Bueno"}
                            {rating === 5 && "😍 Excelente"}
                        </p>
                    )}

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Comentario (opcional)
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full px-4 py-2 bg-muted text-foreground border border-border rounded-lg focus:border-primary focus:outline-none resize-none"
                            placeholder="Cuéntanos más sobre tu experiencia..."
                            rows={3}
                            maxLength={500}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            {comment.length}/500 caracteres
                        </p>
                    </div>

                    {/* Buttons */}
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
                            disabled={loading || rating === 0}
                        >
                            {loading ? "Enviando..." : "Enviar Calificación"}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
