import { NextResponse } from 'next/server';

export async function GET() {
  const hasKey = !!(process.env.GROQ_API_KEY?.trim());
  return NextResponse.json({ configured: hasKey });
}
