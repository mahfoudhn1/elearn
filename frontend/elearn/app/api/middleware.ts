import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();


  const origin = req.headers.get('origin');
  const allowedOrigins = ['https://riffaa.com'];
  if (req.nextUrl.pathname.startsWith('/nextapi/api/auth/google/callback')) {
    return NextResponse.next();
  }
  if (origin && allowedOrigins.includes(origin)) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
  }

  const cookie = req.cookies.get('access_token'); 
  const authCookie = req.cookies.get('auth_token');
  const userRole = req.cookies.get('user_role');

  const publicPaths = [
    '/',
    '/login',
    '/form',
    '/register',
    '/continuereg/role',
    '/student-form',
    '/student-form/4eme',
    '/student-form/terminal'
  ];

  const isProtectedPage = !publicPaths.includes(req.nextUrl.pathname);
  if (!cookie && isProtectedPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (cookie && isProtectedPage) {
    const userRole = req.cookies.get('role');  

    if (!userRole) {
      const url = req.nextUrl.clone();
      url.pathname = '/continuereg/role';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
