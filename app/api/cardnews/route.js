import { NextResponse } from "next/server";

const PROMPT = (text, subject) => `너는 헤레디움 미술관의 SNS 카드뉴스 기획자야.
아래 자료를 바탕으로 인스타그램 카드뉴스를 만들어.

[대상] ${subject || "아래 자료의 주제"}

[자료]
${text.slice(0, 6000)}

[장수 결정 — 중요]
고정된 장수가 아니라 자료의 분량과 밀도에 맞게 스스로 판단해서 정해.
- 자료가 짧거나 다룰 내용이 적으면: 3~4장으로 압축. 억지로 늘리지 말 것.
- 자료가 보통 분량이면: 5~6장.
- 자료가 풍부하고 다룰 소재가 많으면: 7~9장.
- 절대로 같은 내용을 다른 문장으로 반복해서 장수를 채우지 말 것. 채울 내용이 없으면 장을 줄여라.

[구성 원칙]
- 1장은 항상 스크롤을 멈추게 하는 후킹(질문/반전/선언). kicker는 "HOOK".
- 중간 장들은 이 자료에서 실제로 다룰 수 있는 서로 다른 포인트 각 1개씩 (예: 배경, 일화, 철학, 의미, 맥락 중 자료에 실제 등장하는 것만 골라서). kicker는 내용에 맞게 영어 단어 하나로 직접 지어라 (예: WHY, STORY, VOICE, WORK, CONTEXT 등 — 꼭 이 목록일 필요 없음).
- 마지막 장은 관람 유도. kicker는 "VISIT".
- 각 장은 반드시 서로 다른 정보를 담아야 함. 중복 금지.

[작성 규칙]
- title: 2~3줄. 각 줄은 12자 이내. 줄바꿈은 \\n 으로 표기. 짧고 강렬하게.
- body: 2~3줄. 각 줄은 32자 이내. 줄바꿈은 \\n 으로 표기. 반드시 60자 이상 작성.
- 모든 내용은 자료에 근거해야 함. 자료에 없는 사실을 지어내지 말 것.
- 과장 광고 문구는 쓰지 말 것.
- 한국어로 작성.

[출력 형식]
JSON 배열만 출력. 마크다운, 백틱, 설명 절대 금지. 장수는 위 기준에 따라 스스로 정한 개수로:
[{"kicker":"HOOK","title":"...","body":"..."},{"kicker":"...","title":"...","body":"..."}]`;


const NEWS_PROMPT = (text, subject, meta) => `너는 헤레디움 미술관의 SNS 카드뉴스 기획자야.
아래 미술계 뉴스를 인스타그램 카드뉴스 7장으로 재구성해.

[기사 제목] ${subject || ""}
${meta?.press ? `[언론사] ${meta.press}` : ""}
${meta?.date ? `[보도일] ${meta.date}` : ""}

[기사 내용]
${text.slice(0, 6000)}

[각 장의 역할]
1장 (kicker "NEWS"): 이 뉴스의 핵심을 한 문장으로 압축한 후킹 문구. 궁금증을 유발할 것.
2장 (kicker "WHAT"): 무슨 일이 일어났는지. 육하원칙 중심으로 사실 전달.
3장 (kicker "WHY"): 왜 이게 중요한 뉴스인지. 미술계 맥락에서 설명.
4장 (kicker "BACKGROUND"): 이 사안의 배경이나 앞선 경위.
5장 (kicker "IMPACT"): 미술계·관객에게 어떤 영향이 있을지.
6장 (kicker "VIEW"): 이 뉴스를 보는 흥미로운 관점이나 시사점.
7장 (kicker "NOTE"): 앞으로 지켜볼 지점, 또는 관련해 생각해볼 질문.

[작성 규칙]
- title: 2~3줄. 각 줄 12자 이내. 줄바꿈은 \n 으로 표기.
- body: 2~3줄. 각 줄 32자 이내. 줄바꿈은 \n 으로 표기. 반드시 60자 이상.
- 반드시 기사에 실제로 나온 내용만 사용. 없는 사실을 지어내지 말 것.
- 자극적 과장이나 낚시성 표현 금지. 사실에 근거한 흥미 유발만.
- 한국어로 작성.

[출력 형식]
JSON 배열만 출력. 마크다운, 백틱, 설명 절대 금지:
[{"kicker":"NEWS","title":"...","body":"..."},...]`;

async function callAI(prompt) {
  if (process.env.GOOGLE_API_KEY) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": process.env.GOOGLE_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 3000 },
        }),
      }
    );
    const d = await r.json();
    const out = (d?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    if (out) return { provider: "gemini", raw: out };
    return { provider: "gemini", raw: "", error: d?.error?.message };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    return { provider: "claude", raw: (d?.content || []).map((c) => c.text || "").join("") };
  }

  if (process.env.OPENAI_API_KEY) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
      }),
    });
    const d = await r.json();
    return { provider: "openai", raw: d?.choices?.[0]?.message?.content || "" };
  }

  return null;
}

const KICKERS = ["HOOK", "WHY", "STORY", "VOICE", "WORK", "CONTEXT", "VISIT"];
const NEWS_KICKERS = ["NEWS", "WHAT", "WHY", "BACKGROUND", "IMPACT", "VIEW", "NOTE"];

function wrap(s, per) {
  const words = s.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > per) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur.trim());
  return lines.slice(0, 3).join("\n");
}

// used only when no API key is configured — length follows available content,
// never repeats the same sentence to pad out a fixed count
function fallback(text, subject, kickers = KICKERS) {
  const clean = text.replace(/\s+/g, " ").trim();
  const sents = clean.split(/(?<=[.!?])\s+/).filter((s) => s.length > 15);
  const count = Math.max(1, Math.min(sents.length, kickers.length - 1)); // -1 leaves room for closing card
  const usable = sents.slice(0, count);
  if (usable.length === 0) usable.push(clean.slice(0, 96) || subject || "");

  return usable.map((s, i) => ({
    kicker: kickers[i] || kickers[kickers.length - 1],
    title: i === 0 ? wrap(subject || s.slice(0, 30), 12) : wrap(s.slice(0, 30), 12),
    body: wrap(s.slice(0, 96), 32),
  }));
}

export async function POST(req) {
  const { text, subject, exhibition, mode, meta } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "텍스트가 비어있어요" }, { status: 400 });
  }

  let slides = null;
  let provider = "template";
  let aiError = null;

  try {
    const isNews = mode === "news";
    const ai = await callAI(isNews ? NEWS_PROMPT(text, subject, meta) : PROMPT(text, subject));
    if (ai?.raw) {
      const cleaned = ai.raw.replace(/```json|```/g, "").trim();
      const a = cleaned.indexOf("[");
      const b = cleaned.lastIndexOf("]");
      if (a >= 0 && b > a) {
        const parsed = JSON.parse(cleaned.slice(a, b + 1));
        if (Array.isArray(parsed) && parsed.length > 0) {
          const ks = mode === "news" ? NEWS_KICKERS : KICKERS;
          slides = parsed.map((s, i) => ({
            kicker: s.kicker || ks[i] || "",
            title: (s.title || "").replace(/\\n/g, "\n"),
            body: (s.body || "").replace(/\\n/g, "\n"),
          }));
          provider = ai.provider;
        }
      }
    } else if (ai?.error) {
      aiError = ai.error;
    }
  } catch (e) {
    aiError = e.message;
  }

  if (!slides) slides = fallback(text, subject, mode === "news" ? NEWS_KICKERS : KICKERS);

  // closing info card
  slides.push(
    mode === "news"
      ? {
          kicker: "SOURCE",
          title: "더 많은\n미술 이야기",
          body: [
            meta?.press ? `출처 · ${meta.press}` : "",
            meta?.date || "",
            "헤레디움 · 대전 동구 대전로 735",
            "@heredium.art.magazine",
          ].filter(Boolean).join("\n"),
          isInfo: true,
        }
      : {
          kicker: "INFO",
          title: "이 작품 앞에,\n직접 서보세요",
          body: [
            exhibition?.title || "헤레디움 전시",
            exhibition?.date || "",
            "헤레디움 · 대전 동구 대전로 735",
            "11:00 – 19:00 (입장 마감 18:30)",
          ].filter(Boolean).join("\n"),
          isInfo: true,
        }
  );

  return NextResponse.json({ slides, provider, aiError });
}
