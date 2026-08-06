import Link from "next/link";
import { concerts, exhibitions } from "../../lib/data";

const PALETTE = { paper: "var(--bg)", ink: "var(--text)", stone: "#C9C5BE", art: "#c35131", music: "#c35131" };

export default function SnsIndex() {
  return (
    <div style={{ background: PALETTE.paper, minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-6 md:px-0 py-10">
        <div className="mono text-xs" style={{ color: PALETTE.stone }}>SNS · 배포 워크플로우</div>
        <h1 className="disp text-2xl mt-1" style={{ fontWeight: 600, color: PALETTE.ink }}>
          어떤 프로젝트의 SNS 기획을 열까요?
        </h1>

        <Section title="음악회" items={concerts} type="music" accent={PALETTE.music} />
        <Section title="전시" items={exhibitions} type="art" accent={PALETTE.art} />
      </div>
    </div>
  );
}

function Section({ title, items, type, accent }) {
  return (
    <div className="mt-10">
      <div className="mono text-xs mb-3" style={{ color: PALETTE.stone }}>{title}</div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/sns/${type}/${item.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--surface2)" }}
          >
            <span>
              <span className="mono text-xs mr-2" style={{ color: accent }}>{item.code}</span>
              {item.title}
            </span>
            <span style={{ color: "#C9C5BE" }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
