import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  const { code } = req.query;

  if (typeof code === 'string') {
    try {
      // Send the authorization code to your Django backend
      const response = await axios.post('http://localhost:8000/api/auth/callback/google/', {
        code: code
      });

      // Redirect the user to your frontend or handle the response as needed
      res.redirect(response.data.redirect_url);
    } catch (error) {
      console.error('Error sending code to backend:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(400).send('Invalid code');
  }
}
