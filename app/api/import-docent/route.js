import { NextResponse } from "next/server";

export async function POST(req) {
  const { url } = await req.json();
  const match = (url || "").match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    return NextResponse.json(
      { error: "구글 문서 링크에서 문서 ID를 못 찾았어요. docs.google.com/document/d/... 형식인지 확인해주세요." },
      { status: 400 }
    );
  }
  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  const res = await fetch(exportUrl);
  if (!res.ok) {
    return NextResponse.json(
      { error: "문서를 가져오지 못했어요. 공유 설정이 '링크가 있는 모든 사용자(보기)'인지 확인해주세요." },
      { status: 502 }
    );
  }
  const text = await res.text();
  return NextResponse.json({ text });
}
