import 'dotenv/config';
import * as path from 'path';
import { extractReservationFromAudio } from './services/gemini';
import { appendReservationRow } from './services/sheets';

async function main() {
  const audioFilePath = process.argv[2];
  if (!audioFilePath) {
    console.error('Usage: npx ts-node src/index.ts <path-to-audio-file>');
    process.exit(1);
  }

  if (!process.env.SPREADSHEET_ID) {
    console.error('Missing SPREADSHEET_ID in .env');
    process.exit(1);
  }

  const resolvedPath = path.resolve(audioFilePath);
  console.log(`Processing: ${resolvedPath}`);

  const reservation = await extractReservationFromAudio(resolvedPath);

  console.log('\nExtracted reservation:');
  console.log(JSON.stringify(reservation, null, 2));

  await appendReservationRow(reservation);
  console.log('\nDone! Reservation saved to Google Sheets.');
}

main().catch((err) => {
  console.error('Error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
