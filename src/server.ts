import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { extractReservationFromAudio } from './services/gemini';
import { appendReservationRow } from './services/sheets';

const app = express();
const upload = multer({ dest: os.tmpdir() });

const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/flac': '.flac',
  'audio/aac': '.aac',
  'audio/opus': '.opus',
  'audio/webm': '.webm',
};

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

// Accepts the raw file bytes as the entire request body. Added because the
// iOS Shortcuts "Get Contents of URL" action can fail to build a multipart
// Form request with a file attached on some devices (manifests as "the
// network connection was lost"); sending the file as a raw body sidesteps
// that by avoiding multipart construction on-device entirely.
app.post(
  '/upload-raw',
  express.raw({ type: () => true, limit: '25mb' }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: 'No audio data received in request body.' });
      return;
    }

    const contentType = (req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
    const ext = CONTENT_TYPE_EXTENSIONS[contentType] || '.m4a';
    const tempFilePath = path.join(os.tmpdir(), `${crypto.randomUUID()}${ext}`);
    fs.writeFileSync(tempFilePath, req.body);
    console.log(`Received raw upload: ${req.body.length} bytes, content-type: ${contentType || 'unknown'}`);

    try {
      const reservation = await extractReservationFromAudio(tempFilePath);
      await appendReservationRow(reservation);
      res.status(200).json({ success: true, reservation });
    } catch (err) {
      console.error('Error processing raw upload:', err);
      res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      fs.unlink(tempFilePath, () => {});
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
