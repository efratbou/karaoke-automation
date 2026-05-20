import { google } from 'googleapis';
import * as path from 'path';
import { ReservationData, RESERVATION_KEY_ORDER } from '../types';

const CREDENTIALS_PATH = path.resolve(process.cwd(), 'credentials.json');
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuthClient() {
  return new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: SCOPES,
  });
}

export async function appendReservationRow(
  reservation: ReservationData
): Promise<void> {
  const spreadsheetId = process.env.SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID is not set in .env');
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  // Extract values in the exact column order defined in types.ts
  const row = RESERVATION_KEY_ORDER.map((key) => {
    const value = reservation[key];
    return value !== undefined && value !== null ? value : '';
  });

  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  const updatedRange = response.data.updates?.updatedRange ?? 'unknown range';
  console.log(`Row appended to spreadsheet at: ${updatedRange}`);
}
