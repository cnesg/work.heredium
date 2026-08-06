"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderOpen,
  CheckSquare,
  Square,
  UploadCloud,
  X,
  Download,
  Info,
} from "lucide-react";
import { ASSET_CATEGORIES, ASSET_CATEGORY_SLUGS } from "../lib/data";
import { loadSection, saveSection, supabase } from "../lib/supabase";
import { uploadFile, listFiles, deleteFile } from "../lib/storage";

const PALETTE = {
  paper: "var(--surface)",
  ink: "var(--text)",
  stone: "#C9C5BE",
  art: "#c35131",
  music: "#c35131",
};

export default function AssetsWorkspace({ item, mode }) {
  const accent = mode === "music" ? PALETTE.music : PALETTE.art;

  const [driveLink, setDriveLink] = useState("");
  const [checked, setChecked] = useState(() =>
    Object.fromEntries(ASSET_CATEGORIES.map((c) => [c, false]))
  );
  const [notes, setNotes] = useState(() =>
    Object.fromEntries(ASSET_CATEGORIES.map((c) => [c, ""]))
  );
  const [files, setFiles] = useState({}); // { [category]: [{name, path, url}] }
  const [zipping, setZipping] = useState(false);
  const [uploadingCat, setUploadingCat] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [saveState, setSaveState] = useState({ status: "idle", msg: "" });
  const [loaded, setLoaded] = useState(false);

  const catSlug = (cat) => ASSET_CATEGORY_SLUGS[ASSET_CATEGORIES.indexOf(cat)];

  const refreshFiles = async () => {
    const entries = await Promise.all(
      ASSET_CATEGORIES.map(async (cat) => [cat, await listFiles(`${item.id}/${catSlug(cat)}`)])
    );
    setFiles(Object.fromEntries(entries));
  };

  useEffect(() => {
    refreshFiles();
  }, [item.id]);

  // load from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadSection(item.id, "assets", {
        driveLink: "",
        checked: {},
        notes: {},
      });
      if (cancelled) return;
      setDriveLink(data.driveLink || "");
      setChecked((prev) => ({ ...prev, ...(data.checked || {}) }));
      setNotes((prev) => ({ ...prev, ...(data.notes || {}) }));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  // save to Supabase whenever the trackable fields change (skip the initial load)
  useEffect(() => {
    if (!loaded) return;
    setSaveState({ status: "saving", msg: "" });
    saveSection(item.id, "assets", { driveLink, checked, notes }).then((r) => {
      setSaveState(
        r?.ok
          ? { status: "saved", msg: "" }
          : { status: "error", msg: r?.error || "알 수 없는 오류" }
      );
    });
  }, [driveLink, checked, notes, loaded]);

  const toggleCategory = (cat) => {
    setChecked((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const updateNote = (cat, val) => {
    setNotes((prev) => ({ ...prev, [cat]: val }));
  };

  const saveDriveLink = (val) => {
    setDriveLink(val);
  };

  const onFilesSelected = async (cat, fileList) => {
    setUploadingCat(cat);
    setUploadError("");
    for (const file of Array.from(fileList)) {
      const r = await uploadFile(`${item.id}/${catSlug(cat)}`, file);
      if (r?.error) {
        setUploadError(`${file.name}: ${r.error}`);
        break;
      }
    }
    await refreshFiles();
    setUploadingCat(null);
  };

  const removeFile = async (path) => {
    await deleteFile(path);
    await refreshFiles();
  };

  const allFiles = ASSET_CATEGORIES.flatMap((cat) => (files[cat] || []).map((f) => ({ ...f, category: cat })));

  const downloadZip = async () => {
    if (allFiles.length === 0) return;
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(
        allFiles.map(async ({ url, name, category }) => {
          const res = await fetch(url);
          const blob = await res.blob();
          zip.folder(category).file(name, blob);
        })
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.code}-자료모음.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setZipping(false);
    }
  };

  const doneCount = ASSET_CATEGORIES.filter((c) => checked[c]).length;

  return (
    <div style={{ background: PALETTE.paper, color: PALETTE.ink, minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-0 py-10">
        <Link
          href="/assets"
          className="flex items-center gap-1 mono text-xs mb-8"
          style={{ color: PALETTE.stone }}
        >
          <ArrowLeft size={12} /> 프로젝트 목록으로
        </Link>

        <div className="mono text-xs" style={{ color: accent }}>{item.code}</div>
        <h1 className="disp text-2xl mt-1" style={{ fontWeight: 600 }}>{item.title} · 자료실</h1>
        <div className="text-sm mt-1" style={{ color: "var(--muted)" }}>{item.sub}</div>

        {saveState.status !== "idle" && (
          <div className="mono text-xs mt-3 p-2" style={{
            background: saveState.status === "error" ? "rgba(139,58,58,0.25)" : "rgba(123,158,168,0.12)",
            color: saveState.status === "error" ? "#E88080" : "#7B9EA8",
            lineHeight: 1.6,
          }}>
            {saveState.status === "saving" && "저장 중..."}
            {saveState.status === "saved" && "✓ Supabase에 저장됨"}
            {saveState.status === "error" && `저장 실패: ${saveState.msg}`}
          </div>
        )}

        {/* drive link */}
        <div className="mt-8">
          <div className="mono text-xs mb-2" style={{ color: PALETTE.stone }}>구글 드라이브 폴더 링크</div>
          <div className="flex items-center gap-2">
            <FolderOpen size={16} style={{ color: accent }} />
            <input
              value={driveLink}
              onChange={(e) => saveDriveLink(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="flex-1 text-sm px-3 py-2"
              style={{ border: `1px solid #E2DCCB`, background: "var(--surface2)" }}
            />
          </div>
          {driveLink && (
            <a
              href={driveLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs mt-1 inline-block"
              style={{ color: accent }}
            >
              폴더 열기 →
            </a>
          )}
        </div>

        {/* category checklist */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <div className="mono text-xs" style={{ color: PALETTE.stone }}>기초자료 확보 현황</div>
            <div className="mono text-xs" style={{ color: PALETTE.stone }}>
              {doneCount}/{ASSET_CATEGORIES.length}
            </div>
          </div>

          {uploadError && (
            <div className="text-xs mb-2 p-3" style={{ background: "rgba(139,58,58,0.2)", color: "#E88080", lineHeight: 1.6 }}>
              업로드 실패: {uploadError}
            </div>
          )}

          <div style={{ border: "1px solid var(--border)" }}>
            {ASSET_CATEGORIES.map((cat, i) => (
              <div
                key={cat}
                className="px-4 py-3"
                style={{ borderBottom: i < ASSET_CATEGORIES.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-3 text-sm text-left"
                    style={{ color: checked[cat] ? "var(--muted)" : PALETTE.ink }}
                  >
                    {checked[cat] ? (
                      <CheckSquare size={16} style={{ color: accent }} />
                    ) : (
                      <Square size={16} style={{ color: PALETTE.stone }} />
                    )}
                    {cat}
                  </button>

                  <label
                    className="mono text-[11px] flex items-center gap-1 cursor-pointer px-2 py-1"
                    style={{ color: accent, border: `1px solid ${accent}` }}
                  >
                    <UploadCloud size={12} /> {uploadingCat === cat ? "업로드 중..." : "파일 추가"}
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) onFilesSelected(cat, e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                <input
                  value={notes[cat]}
                  onChange={(e) => updateNote(cat, e.target.value)}
                  placeholder="비고 (예: OO담당자가 갖고 있음, 수정 필요 등)"
                  className="text-xs mt-2 w-full px-2 py-1"
                  style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}
                />

                {(files[cat] || []).length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {files[cat].map((f) => (
                      <div key={f.path} className="flex items-center justify-between text-xs px-2 py-1" style={{ background: "var(--surface2)" }}>
                        <a href={f.url} target="_blank" rel="noreferrer" className="truncate" style={{ color: accent }}>
                          {f.name}
                        </a>
                        <button onClick={() => removeFile(f.path)} aria-label="삭제">
                          <X size={11} style={{ color: PALETTE.stone }} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* zip download */}
        {allFiles.length > 0 && (
          <div className="mt-8">
            <div className="mono text-xs mb-2" style={{ color: PALETTE.stone }}>
              업로드된 파일 총 {allFiles.length}개
            </div>
            <button
              onClick={downloadZip}
              disabled={zipping}
              className="flex items-center gap-2 mono text-xs px-3 py-2"
              style={{ background: PALETTE.ink, color: PALETTE.paper }}
            >
              <Download size={14} /> {zipping ? "압축 중..." : "전체 ZIP으로 다운로드"}
            </button>
          </div>
        )}

        {!supabase && (
          <div
            className="flex items-start gap-2 text-xs mt-8 p-3"
            style={{ background: "rgba(139,58,58,0.2)", border: "1px solid rgba(200,100,100,0.4)", color: "#c35131" }}
          >
            <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              Supabase 연결 전이라 지금 입력은 저장되지 않아요. README의 안내대로
              .env.local(또는 Vercel 환경변수)에 키를 넣어주세요.
            </span>
          </div>
        )}

        <button
          onClick={async () => {
            setSaveState({ status: "saving", msg: "" });
            const r = await saveSection(item.id, "assets", { driveLink, checked, notes });
            setSaveState(r?.ok ? { status: "saved", msg: "" } : { status: "error", msg: r?.error || "알 수 없는 오류" });
          }}
          className="mono text-xs px-5 py-3 mt-8 w-full"
          style={{ background: accent, color: "#fff", border: "none", cursor: "pointer" }}
        >
          저장하기
        </button>

        <div
          className="flex items-start gap-2 text-xs mt-4 p-3"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--muted)" }}
        >
          <Info size={14} style={{ marginTop: 2, flexShrink: 0, color: PALETTE.stone }} />
          <span>
            체크리스트·비고·드라이브 링크·업로드한 파일 모두 Supabase에 저장돼요.
            팀원 누구나 이 사이트에 접속하면 같은 자료를 보고, 내려받고, 지울 수 있어요.
          </span>
        </div>
      </div>
    </div>
  );
}
