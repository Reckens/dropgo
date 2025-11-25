import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const { pickup_latitude, pickup_longitude, max_distance = 5 } = await request.json()

        if (!pickup_latitude || !pickup_longitude) {
            return NextResponse.json(
                { error: 'Se requiere ubicación de recogida' },
                { status: 400 }
            )
        }

        // Find nearby drivers using Haversine formula
        // Distance in kilometers
        const { data: drivers, error } = await supabase.rpc('find_nearby_drivers', {
            pickup_lat: pickup_latitude,
            pickup_lng: pickup_longitude,
            max_dist: max_distance
        })

        if (error) {
            console.error('Error finding drivers:', error)
            // Fallback: get all online drivers if RPC doesn't exist
            const { data: allDrivers, error: fallbackError } = await supabase
                .from('drivers')
                .select('id, full_name, phone, latitude, longitude, profile_image_url')
                .eq('is_online', true)

            if (fallbackError) throw fallbackError

            // Calculate distance in JavaScript (less efficient but works)
            const driversWithDistance = (allDrivers || []).map((driver: any) => {
                const distance = calculateDistance(
                    pickup_latitude,
                    pickup_longitude,
                    driver.latitude,
                    driver.longitude
                )
                return { ...driver, distance }
            })

            const nearbyDrivers = driversWithDistance
                .filter(d => d.distance <= max_distance)
                .sort((a, b) => a.distance - b.distance)

            return NextResponse.json({
                drivers: nearbyDrivers,
                count: nearbyDrivers.length
            })
        }

        return NextResponse.json({
            drivers: drivers || [],
            count: (drivers || []).length
        })
    } catch (err: any) {
        console.error('Error in find-drivers:', err)
        return NextResponse.json(
            { error: 'Error al buscar conductores' },
            { status: 500 }
        )
    }
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

function toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
}
