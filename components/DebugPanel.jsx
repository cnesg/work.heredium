"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";
import { BUCKET } from "../lib/storage";

const box = {
  background: "var(--surface2)", border: "1px solid var(--border)",
  padding: 14, marginBottom: 12, fontSize: 12, lineHeight: 1.7,
  fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "pre-wrap",
  wordBreak: "break-all", color: "var(--text)",
};
const btn = {
  padding: "9px 16px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
  background: "#c35131", color: "#141414", border: "none", cursor: "pointer",
  marginBottom: 16,
};

export default function DebugPanel() {
  const [log, setLog] = useState("");
  const [running, setRunning] = useState(false);

  const add = (line) => setLog((p) => p + line + "\n");

  const runTests = async () => {
    setRunning(true);
    setLog("");

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    add("=== 1. 환경변수 ===");
    add(`URL 원본: ${JSON.stringify(rawUrl)}`);
    add(`URL 길이: ${rawUrl?.length}`);
    add(`URL 끝 슬래시: ${rawUrl?.endsWith("/") ? "있음 ⚠️" : "없음 ✓"}`);
    add(`KEY 앞 12자: ${rawKey?.slice(0, 12)}...`);
    add(`KEY 길이: ${rawKey?.length}`);
    add(`클라이언트 생성됨: ${supabase ? "예 ✓" : "아니오 ✗"}`);
    add("");

    if (!supabase) {
      add("→ 환경변수가 없어 여기서 중단합니다.");
      setRunning(false);
      return;
    }

    add("=== 2. DB 읽기 테스트 ===");
    try {
      const { data, error } = await supabase.from("heredium_data").select("project_id, section").limit(3);
      if (error) add(`✗ 실패: ${error.message}\n   상세: ${JSON.stringify(error)}`);
      else add(`✓ 성공 · ${data.length}행 조회됨\n   ${JSON.stringify(data)}`);
    } catch (e) { add(`✗ 예외: ${e.message}`); }
    add("");

    add("=== 3. DB 쓰기 테스트 ===");
    try {
      const { error } = await supabase.from("heredium_data").upsert(
        { project_id: "__debug__", section: "test", payload: { at: new Date().toISOString() }, updated_at: new Date().toISOString() },
        { onConflict: "project_id,section" }
      );
      if (error) add(`✗ 실패: ${error.message}\n   상세: ${JSON.stringify(error)}`);
      else add("✓ 성공 · __debug__ 행 저장됨");
    } catch (e) { add(`✗ 예외: ${e.message}`); }
    add("");

    add("=== 4. 버킷 목록 ===");
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) add(`✗ 실패: ${error.message}`);
      else add(`✓ 버킷: ${data.map((b) => b.name).join(", ") || "(없음)"}`);
    } catch (e) { add(`✗ 예외: ${e.message}`); }
    add("");

    add("=== 5. 파일 업로드 테스트 (ASCII 이름) ===");
    const testPath = `__debug__/test-${Date.now()}.txt`;
    add(`시도 경로: ${testPath}`);
    try {
      const blob = new Blob(["heredium debug"], { type: "text/plain" });
      const { error } = await supabase.storage.from(BUCKET).upload(testPath, blob, { upsert: true });
      if (error) add(`✗ 실패: ${error.message}\n   상세: ${JSON.stringify(error)}`);
      else add("✓ 성공");
    } catch (e) { add(`✗ 예외: ${e.message}`); }
    add("");

    add("=== 6. 파일 업로드 테스트 (한글 이름) ===");
    const krPath = `__debug__/${Date.now()}-시오타 포스터.png`;
    add(`시도 경로: ${krPath}`);
    try {
      const blob = new Blob(["x"], { type: "image/png" });
      const { error } = await supabase.storage.from(BUCKET).upload(krPath, blob, { upsert: true });
      if (error) add(`✗ 실패: ${error.message}`);
      else add("✓ 성공");
    } catch (e) { add(`✗ 예외: ${e.message}`); }

    add("\n=== 진단 완료 ===");
    setRunning(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "32px 40px" }}>
      <div className="mono" style={{ fontSize: 10, color: "#c35131", letterSpacing: "0.1em" }}>DIAGNOSTICS</div>
      <h1 className="disp" style={{ fontSize: 26, fontWeight: 500, color: "var(--text)", marginTop: 4, marginBottom: 16 }}>
        Supabase 연결 진단
      </h1>
      <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16, lineHeight: 1.7 }}>
        아래 버튼을 누르면 환경변수 → DB 읽기 → DB 쓰기 → 버킷 → 파일 업로드 순서로 테스트하고,
        실패한 지점의 원본 에러를 그대로 보여줍니다. 결과 전체를 복사해서 알려주세요.
      </p>

      <button onClick={runTests} disabled={running} style={btn}>
        {running ? "진단 중..." : "진단 시작"}
      </button>

      {log && <div style={box}>{log}</div>}
    </div>
  );
}
