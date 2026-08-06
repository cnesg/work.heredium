import Link from "next/link";
import { Sparkles } from "lucide-react";

const PALETTE = { paper: "#F6F3EC", ink: "#17170F", stone: "#B7AF9C", accent: "#c35131" };

const TILES = [
  { title: "도슨트 기반 카드뉴스", desc: "작가 선택(이봉 랑베르 전 스크립트) 또는 직접 텍스트 입력 → 헤드라인+배경이미지", href: "/content/cardnews", ready: true },
  { title: "뉴스 기반 카드뉴스", desc: "헤레디움_기사모음 시트 연동", href: "/content/news", ready: true },
  { title: "국내 아트 트렌드 카드뉴스", desc: "한국경제 arte 뉴스 (헤레디움 아카이빙 · hankyung 탭)", href: "/content/trend-domestic", ready: true },
  { title: "해외 아트 트렌드 카드뉴스", desc: "해외 저명 아트매거진 뉴스 (헤레디움 아카이빙 · global 탭)", href: "/content/trend-global", ready: true },
  { title: "릴스 기획안 → 영상", desc: "기획안 텍스트 기반 영상 생성 (준비중)", href: null, ready: false },
];

export default function ContentIndex() {
  return (
    <div style={{ background: PALETTE.paper, minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-0 py-10">
        <div className="mono text-xs" style={{ color: PALETTE.stone }}>CONTENT · 콘텐츠 제작</div>
        <h1 className="disp text-2xl mt-1 mb-8" style={{ fontWeight: 600, color: PALETTE.ink }}>
          무엇을 만들까요?
        </h1>

        <div className="flex flex-col gap-2">
          {TILES.map((t) => {
            const inner = (
              <div
                className="flex items-center justify-between px-4 py-4"
                style={{
                  border: "1px solid var(--border)",
                  background: t.ready ? "white" : "#FBF9F4",
                  opacity: t.ready ? 1 : 0.6,
                }}
              >
                <div>
                  <div className="text-sm" style={{ fontWeight: 600, color: PALETTE.ink }}>{t.title}</div>
                  <div className="text-xs mt-1" style={{ color: "#C9C5BE" }}>{t.desc}</div>
                </div>
                {t.ready && <Sparkles size={16} style={{ color: PALETTE.accent }} />}
              </div>
            );
            return t.href ? (
              <Link key={t.title} href={t.href}>{inner}</Link>
            ) : (
              <div key={t.title}>{inner}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
