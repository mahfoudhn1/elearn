import { NextApiRequest, NextApiResponse } from "next";
import axiosSSRInstance from "../../lib/axiosServer";

export async function POST(req: Request) {
  const { meetingNumber, role } = await req.json(); // Parse JSON body from the request

  try {
    const response = await axiosSSRInstance.post('/livestream/signiture/', {
      meeting_number:meetingNumber ,
      role,
    });

    return new Response(JSON.stringify(response.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Error generating signature' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// If you want to handle other HTTP methods, you can add them here as well
