"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Search, MoreVertical, Trash2 } from "lucide-react"
import { AdminNav } from "@/components/admin-nav"
import Image from "next/image"

interface Customer {
    id: string
    phone: string
    full_name: string
    profile_image_url: string | null
    created_at: string
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [adminUsername, setAdminUsername] = useState("")
    const [deleting, setDeleting] = useState<string | null>(null)
    const router = useRouter()
    const supabase = getSupabaseClient()

    useEffect(() => {
        const adminId = localStorage.getItem("adminId")
        const username = localStorage.getItem("adminUsername")

        if (!adminId || !username) {
            router.push("/admin/login")
            return
        }

        setAdminUsername(username)
        loadCustomers()
    }, [router])

    useEffect(() => {
        if (searchTerm) {
            const filtered = customers.filter(
                (customer) =>
                    customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    customer.phone.includes(searchTerm)
            )
            setFilteredCustomers(filtered)
        } else {
            setFilteredCustomers(customers)
        }
    }, [searchTerm, customers])

    const loadCustomers = async () => {
        try {
            const { data, error } = await supabase
                .from("customers")
                .select("*")
                .order("created_at", { ascending: false })

            if (error) throw error

            setCustomers(data || [])
            setFilteredCustomers(data || [])
        } catch (err) {
            console.error("Error loading customers:", err)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteCustomer = async (customerId: string, customerName: string) => {
        setDeleting(customerId)
        try {
            const { error } = await supabase.from("customers").delete().eq("id", customerId)

            if (error) throw error

            // Remove from local state
            setCustomers((prev) => prev.filter((c) => c.id !== customerId))
            setFilteredCustomers((prev) => prev.filter((c) => c.id !== customerId))
        } catch (err: any) {
            console.error("Error deleting customer:", err)
            alert("Error al eliminar cliente: " + err.message)
        } finally {
            setDeleting(null)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("adminId")
        localStorage.removeItem("adminUsername")
        router.push("/admin/login")
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Cargando clientes...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <AdminNav onLogout={handleLogout} adminUsername={adminUsername} />

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
                    <p className="text-muted-foreground">Gestión de usuarios clientes</p>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Total de Clientes</p>
                        <p className="text-2xl font-bold">{customers.length}</p>
                    </Card>
                    <Card className="p-4">
                        <p className="text-sm text-muted-foreground">Resultados de Búsqueda</p>
                        <p className="text-2xl font-bold">{filteredCustomers.length}</p>
                    </Card>
                </div>

                {/* Customers List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCustomers.map((customer) => (
                        <Card key={customer.id} className="p-4 hover:shadow-lg transition-shadow relative">
                            {/* Dropdown Menu */}
                            <div className="absolute top-2 right-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            disabled={deleting === customer.id}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive cursor-pointer"
                                            onSelect={(e) => {
                                                e.preventDefault()
                                                console.log('DELETE CLICKED FOR:', customer.full_name)
                                                handleDeleteCustomer(customer.id, customer.full_name)
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Eliminar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                    {customer.profile_image_url ? (
                                        <Image
                                            src={customer.profile_image_url}
                                            alt={customer.full_name}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pr-8">
                                    <p className="font-semibold text-foreground truncate">{customer.full_name}</p>
                                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Registrado: {new Date(customer.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            {deleting === customer.id && (
                                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                                    <p className="text-sm text-muted-foreground">Eliminando...</p>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>

                {filteredCustomers.length === 0 && (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No se encontraron clientes</p>
                    </Card>
                )}
            </main>
        </div>
    )
}
