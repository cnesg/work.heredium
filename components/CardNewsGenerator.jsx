"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, UploadCloud, Download, Wand2, Info,
  Trash2, Package, RefreshCw, Loader2, Plus,
} from "lucide-react";
import { uploadFile } from "../lib/storage";
import { loadSection } from "../lib/supabase";
import { exhibitions } from "../lib/data";

const C = {
  bg: "var(--bg)", surface2: "var(--surface2)", border: "var(--border)",
  text: "var(--text)", muted: "var(--muted)", accent: "#c35131", blue: "#7B9EA8",
};

const THEMES = [
  { id: "dark", label: "다크", bg: "#141414", fg: "#F5F2EC", accent: "#c35131" },
  { id: "ivory", label: "아이보리", bg: "#F2EDE3", fg: "#1A1A1A", accent: "#8B6D3F" },
  { id: "klein", label: "클랭블루", bg: "#c35131", fg: "#FFFFFF", accent: "#FFD700" },
  { id: "wine", label: "와인", bg: "#3B1F26", fg: "#F5EDE8", accent: "#D4A5A5" },
];

export default function CardNewsGenerator() {
  const [source, setSource] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [selectedEx, setSelectedEx] = useState("");
  const [docentSections, setDocentSections] = useState([]);
  const [slides, setSlides] = useState([]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const [genMode, setGenMode] = useState("docent");
  const [genMeta, setGenMeta] = useState(null);
  const stageRefs = useRef([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("heredium-cardnews-handoff");
      if (raw) {
        const h = JSON.parse(raw);
        sessionStorage.removeItem("heredium-cardnews-handoff");
        if (h.docent) {
          setSource(h.docent);
          const subj = h.subject || h.docent.split("\n")[0].slice(0, 60);
          setSubject(subj);
          runGenerate(h.docent, subj, h.mode || "docent", h.meta || null);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickExhibition = async (id) => {
    setSelectedEx(id);
    setDocentSections([]);
    if (!id) return;
    setStatus("도슨트 불러오는 중...");
    const data = await loadSection(id, "docent", { sections: [] });
    setDocentSections(data.sections || []);
    setStatus(
      (data.sections || []).length
        ? `${data.sections.length}개 항목 · 아래에서 선택하면 바로 생성됩니다`
        : "이 전시엔 저장된 도슨트가 없어요. 좌측 메뉴 '도슨트 관리'에서 먼저 등록해주세요."
    );
  };

  const pickDocent = async (name) => {
    const entry = docentSections.find((d) => d.name === name);
    if (!entry) return;
    setSource(entry.text);
    setSubject(name);
    await runGenerate(entry.text, name, "docent", null);
  };

  const runGenerate = async (text, subj, mode = "docent", meta = null) => {
    if (!text?.trim()) return;
    setGenerating(true);
    setSlides([]);
    setStatus(mode === "news" ? "뉴스 기반 카드뉴스 생성 중..." : "카드뉴스 생성 중...");
    setGenMode(mode);
    setGenMeta(meta);
    try {
      const ex = exhibitions.find((e) => e.id === selectedEx);
      const res = await fetch("/api/cardnews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text, subject: subj, mode, meta,
          exhibition: ex ? { title: ex.title, date: ex.date } : null,
        }),
      });
      const data = await res.json();
      setSlides((data.slides || []).map((s) => ({ ...s, image: "", overlay: 0.6 })));
      setStatus(
        data.provider === "template"
          ? "⚠️ AI 키가 없어 템플릿으로 만들었어요 — Vercel에 GOOGLE_API_KEY를 넣으면 훨씬 좋아집니다"
          : `${data.provider}가 ${(data.slides || []).length}장을 생성했어요`
      );
    } catch {
      setStatus("생성에 실패했어요");
    } finally {
      setGenerating(false);
    }
  };

  const updateSlide = (idx, patch) =>
    setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const removeSlide = (idx) => setSlides((prev) => prev.filter((_, i) => i !== idx));

  const addSlide = () => {
    setSlides((prev) => [
      ...prev,
      { kicker: "MORE", title: "새 카드", body: "", image: "", overlay: 0.6 },
    ]);
  };

  const onImage = async (idx, file) => {
    if (!file) return;
    setUploadingIdx(idx);
    const r = await uploadFile("cardnews", file);
    setUploadingIdx(null);
    if (r?.url) updateSlide(idx, { image: r.url });
    else setStatus(`이미지 업로드 실패: ${r?.error || "알 수 없는 오류"}`);
  };

  const generateBackground = async (idx) => {
    const slide = slides[idx];
    setUploadingIdx(idx);
    setStatus("AI 배경 생성 중... (10~20초 정도 걸려요)");
    try {
      const prompt =
        `미술관 카드뉴스 배경 이미지. 텍스트나 글자는 절대 넣지 마. ` +
        `분위기: ${theme.label} 톤에 어울리는 무드. ` +
        `주제: ${(slide.title || subject || "art exhibition").replace(/\n/g, " ")}. ` +
        `추상적이고 편집디자인에 어울리는 아트워크, 사진 또는 텍스처, 정사각형 구도.`;
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!data.image) {
        setStatus(`AI 배경 생성 실패: ${data.error || data.message || "알 수 없는 오류"}`);
        return;
      }
      const blob = await (await fetch(`data:${data.mimeType};base64,${data.image}`)).blob();
      const file = new File([blob], `ai-bg-${Date.now()}.png`, { type: data.mimeType });
      const r = await uploadFile("cardnews", file);
      if (r?.url) { updateSlide(idx, { image: r.url }); setStatus("✓ AI 배경 생성 완료"); }
      else setStatus(`업로드 실패: ${r?.error || "알 수 없는 오류"}`);
    } catch (e) {
      setStatus(`AI 배경 생성 실패: ${e.message}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  const exportOne = async (idx) => {
    const el = stageRefs.current[idx];
    if (!el) return;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(el, { width: 1080, height: 1080, pixelRatio: 1, cacheBust: true });
    const a = document.createElement("a");
    a.href = dataUrl; a.download = `heredium-card-${String(idx + 1).padStart(2, "0")}.png`; a.click();
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (let i = 0; i < slides.length; i++) {
        const el = stageRefs.current[i];
        if (!el) continue;
        const dataUrl = await toPng(el, { width: 1080, height: 1080, pixelRatio: 1, cacheBust: true });
        zip.file(`card-${String(i + 1).padStart(2, "0")}.png`, dataUrl.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "heredium-cardnews.zip"; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "28px 36px" }}>
      <Link href="/content" className="mono" style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 4, marginBottom: 20 }}>
        <ArrowLeft size={12} /> 콘텐츠 제작 목록으로
      </Link>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
        <div>
          <div className="mono" style={{ fontSize: 10, color: C.accent, letterSpacing: "0.1em" }}>CARD NEWS</div>
          <h1 className="disp" style={{ fontSize: 26, fontWeight: 500, color: C.text, marginTop: 4 }}>
            {slides.length > 0 ? "생성된 카드뉴스 리뷰 및 편집" : "카드뉴스 제작"}
          </h1>
        </div>

        {/* source pickers stay available at top */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select value={selectedEx} onChange={(e) => pickExhibition(e.target.value)}
            style={{ fontSize: 12, padding: "8px 10px", minWidth: 170 }}>
            <option value="">전시 선택</option>
            {exhibitions.map((ex) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
          </select>
          {docentSections.length > 0 && (
            <select defaultValue="" onChange={(e) => e.target.value && pickDocent(e.target.value)}
              style={{ fontSize: 12, padding: "8px 10px", minWidth: 200 }}>
              <option value="" disabled>작가/작품 선택 → 자동 생성</option>
              {docentSections.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {status && (
        <div className="mono" style={{ fontSize: 11, color: C.blue, background: "rgba(123,158,168,0.1)", padding: "9px 12px", marginBottom: 16, lineHeight: 1.6 }}>
          {status}
        </div>
      )}

      {generating && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 13, padding: "40px 0" }}>
          <Loader2 size={16} className="spin-slow" /> 카드뉴스를 만들고 있어요...
        </div>
      )}

      {/* ── TOOLBAR ── */}
      {slides.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => setTheme(t)}
              style={{ ...btn, padding: "6px 13px",
                background: theme.id === t.id ? t.bg : "transparent",
                color: theme.id === t.id ? t.fg : C.muted,
                border: `1px solid ${theme.id === t.id ? t.accent : C.border}` }}>
              {t.label}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: C.border, margin: "0 6px" }} />
          <button onClick={() => runGenerate(source, subject, genMode, genMeta)} disabled={generating}
            style={{ ...btn, border: `1px solid ${C.border}`, color: C.muted }}>
            <RefreshCw size={12} /> 다시 생성
          </button>
          <button onClick={addSlide}
            style={{ ...btn, border: `1px solid ${C.border}`, color: C.text, marginLeft: "auto" }}>
            <Plus size={12} /> 카드 추가
          </button>
          <button onClick={exportAll} disabled={exporting}
            style={{ ...btn, background: C.accent, color: "#141414" }}>
            <Package size={13} /> {exporting ? "만드는 중..." : `전체 ${slides.length}장 ZIP`}
          </button>
        </div>
      )}

      {/* ── CARD BOARD ── */}
      {slides.length > 0 && (
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 20 }}>
          {slides.map((s, i) => (
            <div key={i} style={{
              minWidth: 268, width: 268, flexShrink: 0,
              background: C.surface2, border: `1px solid ${C.border}`,
            }}>
              {/* live preview */}
              <div style={{ width: 268, height: 268, overflow: "hidden", position: "relative" }}>
                <div style={{ transform: `scale(${268 / 1080})`, transformOrigin: "top left" }}>
                  <Slide slide={s} theme={theme} innerRef={(el) => (stageRefs.current[i] = el)} />
                </div>
                <div className="mono" style={{
                  position: "absolute", top: 6, right: 6, fontSize: 9,
                  background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 6px",
                }}>
                  {i + 1}
                </div>
              </div>

              {/* inline editing */}
              <div style={{ padding: 12 }}>
                <div className="mono" style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>라벨</div>
                <input value={s.kicker || ""} onChange={(e) => updateSlide(i, { kicker: e.target.value })}
                  style={{ width: "100%", fontSize: 11, padding: "5px 7px", marginBottom: 8 }} />

                <div className="mono" style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>제목</div>
                <textarea value={s.title || ""} onChange={(e) => updateSlide(i, { title: e.target.value })}
                  rows={2} style={{ width: "100%", fontSize: 11, padding: "6px 7px", marginBottom: 8, lineHeight: 1.5 }} />

                <div className="mono" style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>본문</div>
                <textarea value={s.body || ""} onChange={(e) => updateSlide(i, { body: e.target.value })}
                  rows={3} style={{ width: "100%", fontSize: 11, padding: "6px 7px", marginBottom: 10, lineHeight: 1.5 }} />

                {s.image && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="mono" style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>
                      배경 어둡게 {Math.round((s.overlay ?? 0.6) * 100)}%
                    </div>
                    <input type="range" min={0} max={0.95} step={0.05} value={s.overlay ?? 0.6}
                      onChange={(e) => updateSlide(i, { overlay: Number(e.target.value) })}
                      style={{ width: "100%" }} />
                  </div>
                )}

                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  <button onClick={() => generateBackground(i)} disabled={uploadingIdx === i}
                    style={{ ...btn, padding: "6px 9px", fontSize: 10, border: `1px solid ${C.accent}`, color: C.accent }}>
                    <Wand2 size={11} /> {uploadingIdx === i ? "생성 중..." : "AI 배경 생성"}
                  </button>
                  <label style={{ ...btn, padding: "6px 9px", fontSize: 10, border: `1px solid ${C.blue}`, color: C.blue, cursor: "pointer" }}>
                    <UploadCloud size={11} /> {uploadingIdx === i ? "..." : s.image ? "배경 변경" : "직접 업로드"}
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => onImage(i, e.target.files?.[0])} />
                  </label>
                  {s.image && (
                    <button onClick={() => updateSlide(i, { image: "" })}
                      style={{ ...btn, padding: "6px 9px", fontSize: 10, border: `1px solid ${C.border}`, color: C.muted }}>
                      제거
                    </button>
                  )}
                  <button onClick={() => exportOne(i)}
                    style={{ ...btn, padding: "6px 9px", fontSize: 10, border: `1px solid ${C.border}`, color: C.text }}>
                    <Download size={11} /> PNG
                  </button>
                  <button onClick={() => removeSlide(i)}
                    style={{ ...btn, padding: "6px 9px", fontSize: 10, border: `1px solid ${C.border}`, color: "#E88080" }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MANUAL INPUT ── */}
      {slides.length === 0 && !generating && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: C.surface2, border: `1px solid ${C.border}`, padding: 14, marginBottom: 20, maxWidth: 580 }}>
            <Info size={14} style={{ color: C.muted, flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              위에서 <b style={{ color: C.text }}>전시 → 작가</b>를 고르거나, 뉴스 페이지에서 "카드뉴스 만들기"를 누르면
              자료 분량에 맞게 자동 생성되고 이 화면에 나란히 펼쳐집니다. 각 카드는 문구 수정과 함께
              <b style={{ color: C.accent }}> AI 배경 생성</b>(Gemini) 또는 직접 이미지 업로드 중 골라서 배경을 채울 수 있어요.
            </span>
          </div>

          <details>
            <summary className="mono" style={{ fontSize: 10, color: C.muted, cursor: "pointer" }}>
              직접 텍스트 넣기 (보도자료 등)
            </summary>
            <div style={{ marginTop: 10, maxWidth: 580 }}>
              <input value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="주제 (예: 낸 골딘, 시오타 치하루 전시)"
                style={{ width: "100%", fontSize: 12, padding: "8px 10px", marginBottom: 8 }} />
              <textarea value={source} onChange={(e) => setSource(e.target.value)} rows={5}
                placeholder="자료 텍스트를 붙여넣으세요..."
                style={{ width: "100%", fontSize: 12, padding: "10px 12px", lineHeight: 1.6 }} />
              <button onClick={() => runGenerate(source, subject, "docent", null)} disabled={generating || !source.trim()}
                style={{ ...btn, background: C.accent, color: "#141414", marginTop: 8 }}>
                <Wand2 size={13} /> 카드뉴스 생성
              </button>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function Slide({ slide, theme, innerRef }) {
  const hasImg = Boolean(slide.image);
  const ov = slide.overlay ?? 0.6;
  const titleLines = String(slide.title || "").split("\n");
  const bodyLines = String(slide.body || "").split("\n");
  const isInfo = slide.isInfo || slide.kicker === "INFO" || slide.kicker === "SOURCE";

  return (
    <div ref={innerRef} style={{
      width: 1080, height: 1080, position: "relative", overflow: "hidden",
      background: hasImg ? `${theme.bg} url(${slide.image}) center/cover no-repeat` : theme.bg,
      fontFamily: "'Inter', sans-serif",
    }}>
      {hasImg && <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${ov})` }} />}
      <div style={{ position: "absolute", inset: 44, border: `1px solid ${theme.accent}`, opacity: 0.3 }} />

      <div style={{ position: "relative", height: "100%", padding: 104, display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 21, letterSpacing: 5, color: theme.accent, marginBottom: 56 }}>
          {slide.kicker}
        </div>

        <div className="disp" style={{
          fontSize: isInfo ? 68 : 76, fontWeight: 600, lineHeight: 1.22,
          color: theme.fg, letterSpacing: "-0.02em", wordBreak: "keep-all",
        }}>
          {titleLines.map((l, i) => <div key={i}>{l}</div>)}
        </div>

        {slide.body && (
          <div style={{
            fontSize: isInfo ? 30 : 33, lineHeight: 1.75, color: theme.fg,
            opacity: 0.85, marginTop: 44, wordBreak: "keep-all",
          }}>
            {bodyLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 64, height: 3, background: theme.accent }} />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 19, color: theme.fg, opacity: 0.55, letterSpacing: 2 }}>
            HEREDIUM · heredium.art
          </div>
        </div>
      </div>
    </div>
  );
}

const btn = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace",
  border: "none", cursor: "pointer", background: "transparent",
};
