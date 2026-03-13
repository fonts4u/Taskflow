import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    // If there is a session and the user is trying to access login/signup, redirect to dashboard
    if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If there is no session and the user is trying to access dashboard/projects etc, redirect to login
    const protectedRoutes = ['/dashboard', '/projects', '/kanban', '/calendar', '/analytics', '/settings'];
    if (!session && protectedRoutes.some(path => req.nextUrl.pathname.startsWith(path))) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    return res;
}

export const config = {
    matcher: ['/dashboard/:path*', '/projects/:path*', '/kanban/:path*', '/calendar/:path*', '/analytics/:path*', '/settings/:path*', '/login', '/signup'],
};
