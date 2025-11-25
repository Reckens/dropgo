"use client"

import { Star } from "lucide-react"

interface StarRatingProps {
    rating: number
    totalRatings?: number
    size?: "sm" | "md" | "lg"
    showCount?: boolean
}

export default function StarRating({ rating, totalRatings = 0, size = "md", showCount = true }: StarRatingProps) {
    const sizeClasses = {
        sm: "w-3 h-3",
        md: "w-4 h-4",
        lg: "w-5 h-5"
    }

    const iconSize = sizeClasses[size]

    // Round to nearest 0.5
    const roundedRating = Math.round(rating * 2) / 2

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= Math.floor(roundedRating)
                const half = star === Math.ceil(roundedRating) && roundedRating % 1 !== 0

                return (
                    <div key={star} className="relative">
                        <Star
                            className={`${iconSize} ${filled
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                        />
                        {half && (
                            <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                                <Star className={`${iconSize} fill-yellow-400 text-yellow-400`} />
                            </div>
                        )}
                    </div>
                )
            })}
            {showCount && totalRatings > 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                    ({totalRatings})
                </span>
            )}
            {showCount && totalRatings === 0 && (
                <span className="text-xs text-muted-foreground ml-1">
                    Sin calificaciones
                </span>
            )}
        </div>
    )
}
