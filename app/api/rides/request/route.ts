import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const {
            customer_id,
            pickup_location,
            pickup_latitude,
            pickup_longitude,
            dropoff_location,
            dropoff_latitude,
            dropoff_longitude
        } = await request.json()

        // Validate required fields
        if (!customer_id || !pickup_location || !pickup_latitude || !pickup_longitude) {
            return NextResponse.json(
                { error: 'Faltan campos requeridos' },
                { status: 400 }
            )
        }

        // Find nearby drivers directly
        const { data: allDrivers, error: driversError } = await supabase
            .from('drivers')
            .select('id, full_name, phone, latitude, longitude, profile_image_url')
            .eq('is_online', true)

        if (driversError) {
            console.error('Error fetching drivers:', driversError)
            throw driversError
        }

        // Calculate distance for each driver
        const driversWithDistance = (allDrivers || []).map((driver: any) => {
            const distance = calculateDistance(
                pickup_latitude,
                pickup_longitude,
                driver.latitude,
                driver.longitude
            )
            return { ...driver, distance }
        })

        // Filter drivers within 5km
        const nearbyDrivers = driversWithDistance
            .filter(d => d.distance <= 5)
            .sort((a, b) => a.distance - b.distance)

        if (nearbyDrivers.length === 0) {
            return NextResponse.json(
                { error: 'No hay conductores disponibles cerca de tu ubicación' },
                { status: 404 }
            )
        }

        // Create a group ID for all requests
        const request_group_id = uuidv4()

        // Create one ride request for each nearby driver
        const rideRequests = nearbyDrivers.map((driver: any) => ({
            request_group_id,
            customer_id,
            driver_id: driver.id,
            pickup_location,
            pickup_latitude,
            pickup_longitude,
            dropoff_location: dropoff_location || null,
            dropoff_latitude: dropoff_latitude || null,
            dropoff_longitude: dropoff_longitude || null,
            status: 'pending'
        }))

        // Insert all ride requests
        const { data, error } = await supabase
            .from('ride_requests')
            .insert(rideRequests)
            .select()

        if (error) throw error

        return NextResponse.json({
            success: true,
            request_group_id,
            drivers_notified: nearbyDrivers.length,
            requests: data
        })
    } catch (err: any) {
        console.error('Error creating ride request:', err)
        return NextResponse.json(
            { error: err.message || 'Error al crear solicitud de viaje' },
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
