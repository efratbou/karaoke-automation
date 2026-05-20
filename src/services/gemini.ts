import { VertexAI } from '@google-cloud/vertexai';
import * as fs from 'fs';
import * as path from 'path';
import { ReservationData } from '../types';

const VERTEX_PROJECT = 'karaoke-app-496909';
const VERTEX_LOCATION = 'us-central1';
const VERTEX_MODEL = 'gemini-1.5-flash-002';
const CREDENTIALS_PATH = path.resolve(process.cwd(), 'credentials.json');

const MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
};

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function formatDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}

function getHebrewDay(date: Date): string {
  return HEBREW_DAYS[date.getDay()];
}

function buildPrompt(callDate: string, callDay: string): string {
  return `אתה עוזר עברי לניהול הזמנות קריוקי.
האזן לשיחת הטלפון ותמצא את כל הפרטים הרלוונטיים להזמנה.

פרטים קבועים (אל תשנה אותם):
- "שם הפותח": "אפרת"
- "תאריך": "${callDate}"
- "יום": "${callDay}"
- "איך הגיעו אלינו": "טלפון"
- "סוגר": "אפרת"

לוגיקת תמחור (אלא אם נאמר אחרת בשיחה):
- 3 שעות = מחיר 80 ₪ למשתתף, מינימום 9 משתתפים
- 4 שעות = מחיר 100 ₪ למשתתף, מינימום 7 משתתפים
- כל שעה נוספת מעל 4 שעות = +25 ₪ למשתתף
- מינימום לכל משך מעל 4 שעות = 7 משתתפים

שים לב:
- "ביטחון": אם אמרו כרטיס אשראי → "כ.א", אם אמרו מקדמה/מזומן → "מקדמה"
- "יום בשבוע": יום האירוע (לא יום השיחה)
- "כמות שעות": חשב לפי הפרש שעת התחלה ושעת סיום
- אם פרט לא הוזכר בשיחה, השאר מחרוזת ריקה או 0 לשדות מספריים

החזר אך ורק JSON תקין ללא שום טקסט נוסף לפניו או אחריו, בפורמט הבא:
{
  "שם הפותח": "אפרת",
  "תאריך": "${callDate}",
  "יום": "${callDay}",
  "איך הגיעו אלינו": "טלפון",
  "שם לקוח": "",
  "טלפון": "",
  "סיבת אירוע": "",
  "מגורים": "",
  "מס' משתתפים": 0,
  "גילאים": "",
  "תאריך האירוע": "",
  "יום בשבוע": "",
  "שעת התחלה": "",
  "שעת סיום": "",
  "כמות שעות": 0,
  "מחיר למשתתף": 0,
  "מינימום": 0,
  "הטבות ללקוח": "",
  "הטבות לביט": "",
  "ביטחון": "",
  "דמי ביטול": "",
  "הערות": "",
  "סוגר": "אפרת"
}`;
}

function parseReservationJson(raw: string): ReservationData {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as ReservationData;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as ReservationData;
    }
    throw new Error(`Gemini returned non-JSON response:\n${raw}`);
  }
}

export async function extractReservationFromAudio(
  audioFilePath: string
): Promise<ReservationData> {
  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`Audio file not found: ${audioFilePath}`);
  }

  const vertexAI = new VertexAI({
    project: VERTEX_PROJECT,
    location: VERTEX_LOCATION,
    googleAuthOptions: { keyFilename: CREDENTIALS_PATH },
  });

  const model = vertexAI.getGenerativeModel({ model: VERTEX_MODEL });

  const ext = path.extname(audioFilePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] ?? 'audio/mpeg';

  console.log(`Reading audio file: ${path.basename(audioFilePath)}...`);
  const base64Audio = fs.readFileSync(audioFilePath).toString('base64');

  const now = new Date();
  const prompt = buildPrompt(formatDate(now), getHebrewDay(now));

  console.log('Sending to Vertex AI...');
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: base64Audio } },
          { text: prompt },
        ],
      },
    ],
  });

  const text =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return parseReservationJson(text);
}
