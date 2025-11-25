"use client"

import { useState, useRef, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useRideRequests } from "@/hooks/use-ride-requests"
import { useCustomerNotifications } from "@/hooks/use-customer-notifications"
import { Check, X } from "lucide-react"

interface NotificationBellProps {
    userType: "driver" | "customer"
    userId: string
}

export default function NotificationBell({ userType, userId }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [processingRequest, setProcessingRequest] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Driver notifications (ride requests)
    const { requests, loading: driverLoading, acceptRequest, rejectRequest } = useRideRequests(
        userType === "driver" ? userId : null
    )

    // Customer notifications
    const {
        notifications,
        loading: customerLoading,
        unreadCount: customerUnreadCount,
        markAsRead,
        markAllAsRead,
    } = useCustomerNotifications(userType === "customer" ? userId : null)

    const unreadCount = userType === "driver" ? requests.length : customerUnreadCount

    useEffect(() => {
        setMounted(true)
    }, [])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    const handleAccept = async (requestId: string) => {
        setProcessingRequest(requestId)
        const success = await acceptRequest(requestId)
        setProcessingRequest(null)
        if (success) {
            setIsOpen(false)
            // Redirect to active ride page
            window.location.href = '/driver/active-ride'
        }
    }

    const handleReject = async (requestId: string) => {
        setProcessingRequest(requestId)
        await rejectRequest(requestId)
        setProcessingRequest(null)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "accepted":
                return "text-green-600"
            case "in_progress":
                return "text-blue-600"
            case "completed":
                return "text-green-700"
            case "cancelled":
                return "text-red-600"
            default:
                return "text-yellow-600"
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case "pending":
                return "🔍 Buscando conductor..."
            case "accepted":
                return "✅ Conductor asignado"
            case "in_progress":
                return "🚗 Viaje en progreso"
            case "completed":
                return "✅ Viaje completado"
            case "cancelled":
                return "❌ Viaje cancelado"
            default:
                return status
        }
    }

    // Format time only on client side to avoid hydration mismatch
    const formatTime = (dateString: string) => {
        if (!mounted) return ""
        return new Date(dateString).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    if (!mounted) return null

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center animate-pulse">
                        {unreadCount}
                    </span>
                )}
            </Button>

            {/* Dropdown */}
            {isOpen && (
                <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-xl border-border/50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-border/50 flex justify-between items-center bg-muted/30">
                        <h3 className="font-semibold text-sm">Notificaciones</h3>
                        {userType === "customer" && unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 px-2 text-primary hover:text-primary/80"
                                onClick={markAllAsRead}
                            >
                                Marcar leídas
                            </Button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto p-2">
                        {/* Driver Notifications (Ride Requests) */}
                        {userType === "driver" && (
                            <div className="space-y-3">
                                {driverLoading ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                                ) : requests.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No hay solicitudes pendientes
                                    </p>
                                ) : (
                                    requests.map((request) => (
                                        <Card key={request.id} className="p-3 bg-card/50 border-border/30">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-medium text-foreground">{request.customer_name}</p>
                                                        <p className="text-sm text-muted-foreground">{request.customer_phone}</p>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatTime(request.created_at)}
                                                    </span>
                                                </div>

                                                <div className="text-sm">
                                                    <p className="text-foreground">
                                                        <span className="font-medium">Origen:</span> {request.pickup_location}
                                                    </p>
                                                    {request.dropoff_location && (
                                                        <p className="text-foreground">
                                                            <span className="font-medium">Destino:</span> {request.dropoff_location}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                                        onClick={() => handleAccept(request.id)}
                                                        disabled={processingRequest === request.id}
                                                    >
                                                        <Check className="w-4 h-4 mr-1" />
                                                        Aceptar
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="flex-1"
                                                        onClick={() => handleReject(request.id)}
                                                        disabled={processingRequest === request.id}
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Rechazar
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Customer Notifications */}
                        {userType === "customer" && (
                            <div className="space-y-3">
                                {customerLoading ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                                ) : notifications.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No hay notificaciones
                                    </p>
                                ) : (
                                    notifications.map((notification) => (
                                        <Card
                                            key={notification.id}
                                            className={`p-3 cursor-pointer transition-colors ${notification.read ? "bg-card/30" : "bg-card/80 border-primary/30"
                                                }`}
                                            onClick={() => markAsRead(notification.id)}
                                        >
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-start">
                                                    <p className={`font-medium ${getStatusColor(notification.status)}`}>
                                                        {getStatusText(notification.status)}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground">
                                                    Conductor: {notification.driver_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {notification.pickup_location}
                                                </p>
                                            </div>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </Card>
            )}
        </div>
    )
}
