import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function testGemini() {
  if (!process.env.GOOGLE_API_KEY) return { configured: false };
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": process.env.GOOGLE_API_KEY,
        },
        body: JSON.stringify({ contents: [{ parts: [{ text: "안녕이라고만 답해줘" }] }] }),
      }
    );
    const data = await res.json();
    if (data?.candidates?.[0]?.content) {
      return { configured: true, working: true };
    }
    return { configured: true, working: false, error: data?.error?.message || JSON.stringify(data).slice(0, 300) };
  } catch (e) {
    return { configured: true, working: false, error: e.message };
  }
}

export async function GET() {
  const gemini = await testGemini();
  return NextResponse.json({
    GOOGLE_API_KEY: gemini,
    ANTHROPIC_API_KEY: Boolean(process.env.ANTHROPIC_API_KEY),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    YOUTUBE_API_KEY: Boolean(process.env.YOUTUBE_API_KEY),
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  });
}
