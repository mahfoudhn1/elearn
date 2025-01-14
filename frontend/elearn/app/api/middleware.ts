import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();


  const origin = req.headers.get('origin');
  const allowedOrigins = ['http://localhost:3000'];

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

  // Handle user state check
  const cookie = req.cookies.get('access_token'); // Replace with your actual auth token cookie key
  const authCookie = req.cookies.get('auth_token'); // Assuming you store a token in cookies
  const userRole = req.cookies.get('user_role');

  const isProtectedPage = !['/', '/login','/register', '/continuereg/role'].includes(req.nextUrl.pathname);

  if (!cookie && isProtectedPage) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (cookie && isProtectedPage) {
    const userRole = req.cookies.get('role');  // Assume you store role in a cookie

    if (!userRole) {
      // Redirect them to the continue registration page
      const url = req.nextUrl.clone();
      url.pathname = '/continuereg/role';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
