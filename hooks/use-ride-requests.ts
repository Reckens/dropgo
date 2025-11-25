import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"

export interface RideRequest {
    id: string
    customer_id: string
    customer_name: string
    customer_phone: string
    driver_id: string
    pickup_location: string
    pickup_latitude: number
    pickup_longitude: number
    dropoff_location: string | null
    dropoff_latitude: number | null
    dropoff_longitude: number | null
    status: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
    created_at: string
    customer?: {
        full_name: string
        phone: string
        profile_image_url: string | null
    }
}

export function useRideRequests(driverId: string | null) {
    const [requests, setRequests] = useState<RideRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = getSupabaseClient()

    useEffect(() => {
        if (!driverId || !supabase) {
            setLoading(false)
            return
        }

        // Load initial requests
        const loadRequests = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from("ride_requests")
                    .select(`
            *,
            customer:customers(full_name, phone, profile_image_url)
          `)
                    .eq("driver_id", driverId)
                    .eq("status", "pending")
                    .order("created_at", { ascending: false })

                if (fetchError) throw fetchError

                // Map data to include customer_name and customer_phone
                const mappedData = (data || []).map((req: any) => ({
                    ...req,
                    customer_name: req.customer?.full_name || "Cliente",
                    customer_phone: req.customer?.phone || "",
                }))

                setRequests(mappedData)
            } catch (err: any) {
                console.error("[v0] Error loading ride requests:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        loadRequests()

        // Subscribe to real-time updates
        const channel = supabase
            .channel("ride_requests_changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "ride_requests",
                    filter: `driver_id=eq.${driverId}`,
                },
                async (payload: any) => {
                    console.log("[v0] New ride request:", payload)

                    // Fetch customer details for the new request
                    const { data: customerData } = await supabase
                        .from("customers")
                        .select("full_name, phone, profile_image_url")
                        .eq("id", payload.new.customer_id)
                        .single()

                    const newRequest = {
                        ...payload.new,
                        customer: customerData,
                        customer_name: customerData?.full_name || "Cliente",
                        customer_phone: customerData?.phone || "",
                    }

                    setRequests((prev) => [newRequest, ...prev])

                    // Play notification sound (optional)
                    if (typeof Audio !== "undefined") {
                        try {
                            const audio = new Audio("/notification.mp3")
                            audio.play().catch(() => {
                                // Ignore if audio fails
                            })
                        } catch {
                            // Ignore
                        }
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "ride_requests",
                    filter: `driver_id=eq.${driverId}`,
                },
                (payload: any) => {
                    console.log("[v0] Ride request updated:", payload)
                    setRequests((prev) =>
                        prev.map((req) => (req.id === payload.new.id ? { ...req, ...payload.new } : req))
                    )
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [driverId, supabase])

    const acceptRequest = async (requestId: string) => {
        if (!supabase) return { error: "Supabase not initialized" }

        try {
            // First, get the request to find its group_id
            const { data: request, error: fetchError } = await supabase
                .from("ride_requests")
                .select("request_group_id")
                .eq("id", requestId)
                .single()

            if (fetchError) throw fetchError

            // Update THIS request to accepted
            const { error: updateError } = await supabase
                .from("ride_requests")
                .update({
                    status: "accepted",
                    accepted_at: new Date().toISOString()
                })
                .eq("id", requestId)

            if (updateError) throw updateError

            // Cancel all OTHER requests in the same group
            if (request.request_group_id) {
                await supabase
                    .from("ride_requests")
                    .update({
                        status: "cancelled",
                        cancelled_at: new Date().toISOString(),
                        cancelled_by: "system"
                    })
                    .eq("request_group_id", request.request_group_id)
                    .neq("id", requestId)
                    .eq("status", "pending")
            }

            setRequests((prev) => prev.filter((req) => req.id !== requestId))
            return { error: null }
        } catch (err: any) {
            console.error("[v0] Error accepting request:", err)
            return { error: err.message }
        }
    }

    const rejectRequest = async (requestId: string) => {
        if (!supabase) return { error: "Supabase not initialized" }

        try {
            const { error: updateError } = await supabase
                .from("ride_requests")
                .update({
                    status: "cancelled",
                    cancelled_at: new Date().toISOString(),
                    cancelled_by: "driver"
                })
                .eq("id", requestId)

            if (updateError) throw updateError

            setRequests((prev) => prev.filter((req) => req.id !== requestId))
            return { error: null }
        } catch (err: any) {
            console.error("[v0] Error rejecting request:", err)
            return { error: err.message }
        }
    }

    return {
        requests,
        loading,
        error,
        acceptRequest,
        rejectRequest,
    }
}
