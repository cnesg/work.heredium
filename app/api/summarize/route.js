import { NextResponse } from "next/server";
import { summarizeText } from "../../../lib/summarize";

export async function POST(req) {
  const { text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "text가 비어있어요" }, { status: 400 });
  }
  try {
    const result = await summarizeText(text);
    return NextResponse.json(result);
  } catch (e) {
    if (e.code === "NO_PROVIDER_CONFIGURED") {
      return NextResponse.json(
        { error: "NO_PROVIDER_CONFIGURED", message: "요약 API 키가 아직 설정되지 않았어요." },
        { status: 501 }
      );
    }
    return NextResponse.json({ error: e.message || "요약 실패" }, { status: 500 });
  }
}
