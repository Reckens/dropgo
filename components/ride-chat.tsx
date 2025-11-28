"use client"

import { useEffect, useState, useRef } from "react"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Send, MessageCircle } from "lucide-react"

interface Message {
    id: string
    sender_type: 'customer' | 'driver'
    message: string
    is_predefined: boolean
    created_at: string
    read_at: string | null
}

interface RideChatProps {
    rideId: string
    userType: 'customer' | 'driver'
    userId: string
    onClose: () => void
}

const QUICK_MESSAGES = [
    "Ya llegué 📍",
    "5 minutos ⏱️",
    "Estoy en camino 🚗",
    "¿Dónde estás? 📍",
    "Gracias 👍",
]

export default function RideChat({ rideId, userType, userId, onClose }: RideChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = getSupabaseClient()

    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Load messages
    useEffect(() => {
        if (!supabase || !rideId) return

        const loadMessages = async () => {
            const { data, error } = await supabase
                .from('ride_messages')
                .select('*')
                .eq('ride_request_id', rideId)
                .order('created_at', { ascending: true })

            if (!error && data) {
                setMessages(data)

                // Mark messages as read
                const unreadMessages = data.filter(
                    msg => msg.sender_type !== userType && !msg.read_at
                )

                if (unreadMessages.length > 0) {
                    await supabase
                        .from('ride_messages')
                        .update({ read_at: new Date().toISOString() })
                        .in('id', unreadMessages.map(m => m.id))
                }
            }
        }

        loadMessages()

        // Subscribe to new messages
        const channel = supabase
            .channel(`ride-chat-${rideId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ride_messages',
                    filter: `ride_request_id=eq.${rideId}`,
                },
                (payload: any) => {
                    setMessages(prev => [...prev, payload.new])

                    // Mark as read if not from current user
                    if (payload.new.sender_type !== userType) {
                        supabase
                            .from('ride_messages')
                            .update({ read_at: new Date().toISOString() })
                            .eq('id', payload.new.id)
                    }
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [rideId, supabase, userType])

    const sendMessage = async (messageText: string, isPredefined = false) => {
        if (!messageText.trim() || sending || !supabase) return

        setSending(true)
        try {
            const { error } = await supabase
                .from('ride_messages')
                .insert({
                    ride_request_id: rideId,
                    sender_type: userType,
                    sender_id: userId,
                    message: messageText,
                    is_predefined: isPredefined,
                })

            if (error) throw error

            setNewMessage("")
        } catch (err) {
            console.error("Error sending message:", err)
        } finally {
            setSending(false)
        }
    }

    const handleSend = () => {
        sendMessage(newMessage, false)
    }

    const handleQuickMessage = (message: string) => {
        sendMessage(message, true)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <Card className="w-full sm:max-w-md h-[80vh] sm:h-[600px] flex flex-col bg-card border-border/50 rounded-t-2xl sm:rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Chat del Viaje</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                            <p className="text-sm">No hay mensajes aún</p>
                            <p className="text-xs">Envía un mensaje para empezar</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isOwn = msg.sender_type === userType
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${isOwn
                                                ? 'bg-primary text-primary-foreground rounded-br-sm'
                                                : 'bg-muted text-foreground rounded-bl-sm'
                                            }`}
                                    >
                                        <p className="text-sm">{msg.message}</p>
                                        <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Messages */}
                <div className="px-4 py-2 border-t border-border">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {QUICK_MESSAGES.map((msg) => (
                            <Button
                                key={msg}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickMessage(msg)}
                                disabled={sending}
                                className="whitespace-nowrap text-xs"
                            >
                                {msg}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 px-4 py-2 bg-muted text-foreground rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={sending}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || sending}
                            size="icon"
                            className="rounded-full"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
