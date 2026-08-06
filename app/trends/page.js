import Link from "next/link";

export default function TrendsPage() {
  return (
    <div className="px-6 md:px-12 py-10">
      <div className="mono text-xs" style={{ color: "#C9C5BE" }}>TREND DASHBOARD</div>
      <h1 className="disp text-2xl mt-1" style={{ fontWeight: 500 }}>
        음악 트렌드 · 미술 트렌드
      </h1>
      <p className="text-sm mt-2 max-w-md" style={{ color: "#C9C5BE" }}>
        YouTube 기반으로 미술/음악 트렌드를 따로 봅니다. 영상을 바로 카드뉴스 소재로 넘길 수 있어요.
      </p>

      <div className="flex gap-3 mt-8">
        <Link
          href="/trends/art"
          className="px-4 py-3 text-sm"
          style={{ border: "1px solid #002FA7", color: "#c35131" }}
        >
          미술 트렌드 →
        </Link>
        <Link
          href="/trends/music"
          className="px-4 py-3 text-sm"
          style={{ border: "1px solid #7A2E1D", color: "#c35131" }}
        >
          음악 트렌드 →
        </Link>
      </div>

      <div
        className="mt-8 border p-4 text-xs"
        style={{ borderColor: "var(--border)", color: "#C9C5BE" }}
      >
        TODO: ARTPULSE의 SNS 트렌드(X/릴스/틱톡)까지 확장 — 지금은 YouTube만 연동됨
      </div>
    </div>
  );
}
