import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json()

        console.log('Login attempt for username:', username)

        // Query admin user
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .single()

        if (error || !data) {
            console.log('User not found or error:', error)
            return NextResponse.json(
                { error: 'Usuario o contraseña incorrectos' },
                { status: 401 }
            )
        }

        console.log('User found, password_hash from DB:', data.password_hash)
        console.log('Password provided:', password)

        // Verify password with bcrypt
        const isValidPassword = await bcrypt.compare(password, data.password_hash)

        console.log('Password valid?:', isValidPassword)

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Usuario o contraseña incorrectos' },
                { status: 401 }
            )
        }

        // Return admin data (without password)
        return NextResponse.json({
            id: data.id,
            username: data.username,
        })
    } catch (err) {
        console.error('Login error:', err)
        return NextResponse.json(
            { error: 'Error al iniciar sesión' },
            { status: 500 }
        )
    }
}
