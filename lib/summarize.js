// Provider-agnostic summarizer. Set ONE of these on the server
// (Vercel → Settings → Environment Variables) and this automatically picks it up:
//
//   ANTHROPIC_API_KEY  — Claude. Needs Anthropic Console billing (separate from a
//                        claude.ai subscription — a Claude Pro/Max plan does NOT
//                        cover this).
//   GOOGLE_API_KEY     — Gemini, via Google AI Studio. Has a free tier — this is
//                        the easiest "keep working even if Claude access lapses"
//                        option.
//   OPENAI_API_KEY     — GPT. Needs OpenAI platform billing (separate from a
//                        ChatGPT Plus subscription — that plan does NOT cover this
//                        either).
//
// Priority if more than one is set: Anthropic > Gemini > OpenAI.
// If none are set, throws NO_PROVIDER_CONFIGURED so callers can fall back to a
// "paste your own summary" UI instead of failing silently.

const prompt = (text) =>
  `다음 텍스트를 한국어로 3문장 이내, 카드뉴스 소재로 쓸 핵심 포인트 위주로 요약해줘:\n\n${text}`;

export async function summarizeText(text) {
  if (process.env.ANTHROPIC_API_KEY) return summarizeWithClaude(text);
  if (process.env.GOOGLE_API_KEY) return summarizeWithGemini(text);
  if (process.env.OPENAI_API_KEY) return summarizeWithOpenAI(text);
  const err = new Error("NO_PROVIDER_CONFIGURED");
  err.code = "NO_PROVIDER_CONFIGURED";
  throw err;
}

async function summarizeWithClaude(text) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt(text) }],
    }),
  });
  const data = await res.json();
  const summary = (data?.content || []).map((c) => c.text || "").join("").trim();
  if (!summary) throw new Error(data?.error?.message || "Claude summarize failed");
  return { provider: "claude", summary };
}

async function summarizeWithGemini(text) {
  // Google's newer "AQ." Auth keys reject the old ?key= query-param style —
  // send it as a header instead, which works for both AIza and AQ. keys.
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": process.env.GOOGLE_API_KEY,
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt(text) }] }] }),
    }
  );
  const data = await res.json();
  const summary = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  if (!summary) throw new Error(data?.error?.message || "Gemini summarize failed");
  return { provider: "gemini", summary };
}

async function summarizeWithOpenAI(text) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt(text) }],
      max_tokens: 300,
    }),
  });
  const data = await res.json();
  const summary = data?.choices?.[0]?.message?.content?.trim();
  if (!summary) throw new Error(data?.error?.message || "OpenAI summarize failed");
  return { provider: "openai", summary };
}
