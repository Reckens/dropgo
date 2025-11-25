"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"

export interface CustomerRideRequest {
    id: string
    driver_id: string
    status: string
    created_at: string
    accepted_at: string | null
    cancelled_at: string | null
    cancelled_by: string | null
    driver?: {
        full_name: string
        phone: string
        profile_image_url: string | null
    }
}

export function useCustomerRideRequests(customerId: string | null) {
    const [requests, setRequests] = useState<CustomerRideRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = getSupabaseClient()

    useEffect(() => {
        if (!customerId || !supabase) {
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
            driver:drivers(full_name, phone, profile_image_url)
          `)
                    .eq("customer_id", customerId)
                    .in("status", ["pending", "accepted", "in_progress"])
                    .order("created_at", { ascending: false })

                if (fetchError) throw fetchError

                setRequests(data || [])
            } catch (err: any) {
                console.error("Error loading customer requests:", err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        loadRequests()

        // Subscribe to real-time updates
        const channel = supabase
            .channel("customer_ride_requests")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ride_requests",
                    filter: `customer_id=eq.${customerId}`
                },
                async (payload: any) => {
                    console.log("Customer ride request update:", payload)

                    if (payload.eventType === "INSERT") {
                        // Fetch driver details for new request
                        const { data: driverData } = await supabase
                            .from("drivers")
                            .select("full_name, phone, profile_image_url")
                            .eq("id", payload.new.driver_id)
                            .single()

                        const newRequest = {
                            ...payload.new,
                            driver: driverData
                        }

                        setRequests((prev) => [newRequest, ...prev])
                    } else if (payload.eventType === "UPDATE") {
                        // Fetch driver details for updated request
                        const { data: driverData } = await supabase
                            .from("drivers")
                            .select("full_name, phone, profile_image_url")
                            .eq("id", payload.new.driver_id)
                            .single()

                        const updatedRequest = {
                            ...payload.new,
                            driver: driverData
                        }

                        setRequests((prev) => {
                            // If status is completed or cancelled for more than 5 seconds, remove it
                            if (["completed", "cancelled"].includes(payload.new.status)) {
                                // Keep it for a moment so user sees the update, then remove
                                setTimeout(() => {
                                    setRequests((current) => current.filter((r) => r.id !== payload.new.id))
                                }, 3000)
                            }

                            return prev.map((req) =>
                                req.id === payload.new.id ? updatedRequest : req
                            )
                        })
                    } else if (payload.eventType === "DELETE") {
                        setRequests((prev) => prev.filter((req) => req.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [customerId, supabase])

    return {
        requests,
        loading,
        error
    }
}
