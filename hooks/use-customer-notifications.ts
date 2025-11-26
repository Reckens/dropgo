"use client"

import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"

export interface CustomerNotification {
    id: string
    ride_request_id: string
    status: string
    driver_name: string
    pickup_location: string
    created_at: string
    read: boolean
}

export function useCustomerNotifications(customerId: string | null) {
    const [notifications, setNotifications] = useState<CustomerNotification[]>([])
    const [loading, setLoading] = useState(true)
    const [unreadCount, setUnreadCount] = useState(0)
    const supabase = getSupabaseClient()

    useEffect(() => {
        if (!customerId || !supabase) return

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from("ride_requests")
                .select(`
          id,
          status,
          pickup_location,
          created_at,
          driver:drivers(full_name)
        `)
                .eq("customer_id", customerId)
                .eq("status", "accepted") // Only show when driver accepts
                .order("created_at", { ascending: false })
                .limit(10)

            if (!error && data) {
                const formattedNotifications: CustomerNotification[] = data.map((req: any) => ({
                    id: req.id,
                    ride_request_id: req.id,
                    status: req.status,
                    driver_name: req.driver?.full_name || "Conductor",
                    pickup_location: req.pickup_location,
                    created_at: req.created_at,
                    read: false, // Always mark as unread so user sees the notification
                }))

                setNotifications(formattedNotifications)
                setUnreadCount(formattedNotifications.filter(n => !n.read).length)
            }
            setLoading(false)
        }

        fetchNotifications()

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`customer-notifications-${customerId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "ride_requests",
                    filter: `customer_id=eq.${customerId}`,
                },
                (payload: any) => {
                    fetchNotifications() // Refetch on any change
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [customerId, supabase])

    const markAsRead = (notificationId: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }

    return {
        notifications,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
    }
}
