// Splits a raw docent script into sections. Works for any exhibition's script,
// not just one hardcoded show — headers look like "1. 이름" or "3-4. 이름" or
// "17-1, 17-2. 이름", same pattern Google Docs export produces from a numbered list.

const NOISE_LINE = /이\(가\) 표시된 사진|AI 생성 콘텐츠는 정확하지 않을 수 있습니다|^이미지 없음$|^이미지$/;

function cleanText(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !NOISE_LINE.test(l))
    .join("\n");
}

export function parseDocentText(rawText) {
  const text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const pattern = /\n([\d,\-\s]+)\.\s+([^\n]+)\n/g;
  const matches = [...text.matchAll(pattern)];

  if (matches.length === 0) {
    // no numbered headers found — treat the whole thing as one section
    return [{ name: "전체", text: cleanText(text) }];
  }

  const sections = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const name = m[2].trim();
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = cleanText(text.slice(start, end));
    if (body) sections.push({ name, text: body });
  }
  return sections;
}
