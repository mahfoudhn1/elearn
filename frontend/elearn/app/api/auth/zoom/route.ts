import { NextResponse } from 'next/server';
import axiosSSRInstance from '../../../lib/axiosServer';

export async function GET(req: Request) {
  const zoomAuthUrl = 'livestream/oauth/zoom_authenticate/'
  
  try {
    const response = await axiosSSRInstance.get(zoomAuthUrl);
    const authUrl = response.data.auth_url; 
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error fetching Zoom auth URL:', error);
    return NextResponse.json({ error: 'Error connecting to Zoom' }, { status: 500 });
  }
}