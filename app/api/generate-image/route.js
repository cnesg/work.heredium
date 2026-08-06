import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { prompt } = await req.json();
  if (!prompt || !prompt.trim()) {
    return NextResponse.json({ error: "프롬프트가 비어있어요" }, { status: 400 });
  }
  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "NO_KEY", message: "GOOGLE_API_KEY가 설정되지 않았어요." },
      { status: 501 }
    );
  }

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": process.env.GOOGLE_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      }
    );
    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) {
      return NextResponse.json(
        { error: data?.error?.message || "이미지 생성 결과가 없어요", raw: JSON.stringify(data).slice(0, 300) },
        { status: 500 }
      );
    }
    return NextResponse.json({
      image: part.inlineData.data,
      mimeType: part.inlineData.mimeType || "image/png",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
