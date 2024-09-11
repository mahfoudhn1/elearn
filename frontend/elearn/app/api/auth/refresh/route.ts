
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Get the refresh token from the request body
    const { refreshToken } = await request.json(); // Use request.json() to parse the body
    console.log(refreshToken);
    
    const refreshResponse = await axios.post('http://localhost:8000/api/token/refresh/', {
      refreshToken,
    }, {
      withCredentials: true,
    });

    if (!refreshResponse.data) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
    }
    
    const { access_token, refresh_token } = refreshResponse.data;
    
    const response = NextResponse.json({ access_token, refresh_token }, { status: 200 });

    // Set cookies in the response
    response.cookies.set('access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response; // Return the response with cookies set
  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
