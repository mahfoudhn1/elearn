import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // Construct the path to the JSON file
    const filePath = path.join(process.cwd(), 'public', 'data', 'wilaya.json');

    // Read the JSON file
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Error reading the JSON file' });
            return;
        }

        try {
            // Parse the JSON data
            const jsonData = JSON.parse(data);
            res.status(200).json(jsonData);
        } catch (parseError) {
            res.status(500).json({ error: 'Error parsing the JSON file' });
        }
    });
}
