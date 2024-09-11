import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function cors(req: NextRequest, res: NextResponse) {
  // Check the origin of the request
  const origin = req.headers.get('origin');
  
  const allowedOrigins = ['http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    // Set CORS headers
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: res.headers });
    }
  }
  
  return res;
}