"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, Car, Settings, Calculator, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AdminNavProps {
    onLogout: () => void
    adminUsername: string
}

export function AdminNav({ onLogout, adminUsername }: AdminNavProps) {
    const pathname = usePathname()

    const navItems = [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/customers", label: "Clientes", icon: Users },
        { href: "/admin/drivers", label: "Conductores", icon: Car },
    ]

    return (
        <div className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-sm">DG</span>
                            </div>
                            <span className="font-bold text-lg">Admin Panel</span>
                        </div>

                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href
                                return (
                                    <Link key={item.href} href={item.href}>
                                        <Button
                                            variant={isActive ? "default" : "ghost"}
                                            size="sm"
                                            className="gap-2"
                                        >
                                            <Icon className="w-4 h-4" />
                                            {item.label}
                                        </Button>
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 rounded-full p-0 overflow-hidden border-2 border-primary/50 hover:border-primary transition-all"
                                    title="Menú de administrador"
                                >
                                    <div className="w-full h-full bg-primary flex items-center justify-center text-lg text-primary-foreground font-bold">
                                        {adminUsername.charAt(0).toUpperCase()}
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>👤 {adminUsername}</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                <DropdownMenuItem asChild>
                                    <Link href="/admin/settings" className="cursor-pointer">
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Configuración</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem asChild>
                                    <Link href="/admin/config" className="cursor-pointer">
                                        <Calculator className="mr-2 h-4 w-4" />
                                        <span>Tarifas</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Cerrar sesión</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <nav className="md:hidden flex items-center gap-1 pb-3 overflow-x-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                            <Link key={item.href} href={item.href}>
                                <Button
                                    variant={isActive ? "default" : "ghost"}
                                    size="sm"
                                    className="gap-2 whitespace-nowrap"
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
