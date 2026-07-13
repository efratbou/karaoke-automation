import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as os from 'os';
import { extractReservationFromAudio } from './services/gemini';
import { appendReservationRow } from './services/sheets';

const app = express();
const upload = multer({ dest: os.tmpdir() });

app.get('/', (_req, res) => {
  res.send('Karaoke automation server is running.');
});

app.post('/upload', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No audio file received. Field name must be "audio".' });
    return;
  }

  const tempFilePath = req.file.path;
  console.log(`Received file: ${req.file.originalname}`);

  try {
    const reservation = await extractReservationFromAudio(tempFilePath);
    await appendReservationRow(reservation);
    res.status(200).json({ success: true, reservation });
  } catch (err) {
    console.error('Error processing upload:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  } finally {
    fs.unlink(tempFilePath, () => {});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
