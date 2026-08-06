import { NextResponse } from "next/server";
import Papa from "papaparse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SHEETS = {
  lambert: {
    id: process.env.VISITOR_SHEET_LAMBERT || "1WI4rqQHPO2BdYZF81EzLIFx2ZkPbnXGo6mP1I3J85Io",
    tabs: [{ gid: process.env.VISITOR_SHEET_LAMBERT_GID || "1454406628", label: "전체" }],
  },
  shiota: process.env.VISITOR_SHEET_SHIOTA
    ? { id: process.env.VISITOR_SHEET_SHIOTA, tabs: [{ gid: process.env.VISITOR_SHEET_SHIOTA_GID || "", label: "" }] }
    : null,
};

const TIME_SLOTS = [
  "11:00~12:00","12:00~13:00","13:00~14:00","14:00~15:00",
  "15:00~16:00","16:00~17:00","17:00~18:00","18:00~19:00",
];
const AGE_GROUPS = ["어린이","10대 (청소년)","20대","30대","40대 이상"];
const GENDERS = ["남성","여성"];
const NATIONALITIES = ["한국인","아시안(일본, 중국.. 등)","외국인(유럽, 미국 등)"];
const ALL_LABELS = [...TIME_SLOTS, ...AGE_GROUPS, ...GENDERS, ...NATIONALITIES];

// parses ONE tab's CSV into { dates, rows: { [rowLabel]: number[] } }.
// Uses Papa.parse on the RAW text (not a naive split on "\n") because some
// header cells in this sheet contain embedded newlines (e.g. "나잇대\n(유추)"),
// which breaks a simple line-by-line parser — Papa handles quoted newlines correctly.
function parseTab(csvText) {
  const { data: rowArrays } = Papa.parse(csvText, { skipEmptyLines: false });
  if (!rowArrays || rowArrays.length < 2) return null;

  const headerCols = rowArrays[0].map((c) => String(c ?? "").trim());
  const dates = headerCols.slice(7).filter((d) => /^\d{1,2}\/\d{1,2}$/.test(d));
  const dateCount = dates.length;

  const rows = {};
  for (const cols of rowArrays) {
    // the row's identifying label can be spread across columns A–G
    // (category name, sub-category, specific label) — join them all
    const rowLabel = cols.slice(0, 7).map((c) => String(c ?? "").replace(/\n/g, " ")).join(" ");
    const match = ALL_LABELS.find((label) => rowLabel.includes(label));
    if (match && !rows[match]) {
      rows[match] = cols.slice(7, 7 + dateCount).map((v) => parseInt(v) || 0);
    }
  }

  return { dates, rows };
}

async function fetchTab(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const csv = await res.text();
  return parseTab(csv);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const show = searchParams.get("show") || "lambert";
  const config = SHEETS[show];
  if (!config) {
    return NextResponse.json({ error: "NOT_CONFIGURED", show });
  }

  const tabResults = await Promise.all(
    config.tabs.filter((t) => t.gid).map((t) => fetchTab(config.id, t.gid))
  );
  const validTabs = tabResults.filter(Boolean);
  if (validTabs.length === 0) {
    return NextResponse.json({ error: "SHEET_FETCH_FAILED" }, { status: 502 });
  }

  const dates = [];
  const rows = {};
  ALL_LABELS.forEach((l) => (rows[l] = []));

  for (const tab of validTabs) {
    dates.push(...tab.dates);
    ALL_LABELS.forEach((label) => {
      const vals = tab.rows[label] || new Array(tab.dates.length).fill(0);
      rows[label].push(...vals);
    });
  }

  const dailyTotals = dates.map((_, di) =>
    TIME_SLOTS.reduce((sum, slot) => sum + (rows[slot]?.[di] || 0), 0)
  );

  const hourlyAvg = TIME_SLOTS.map((slot) => {
    const total = (rows[slot] || []).reduce((a, b) => a + b, 0);
    return { slot, total, avg: total / Math.max(dates.length, 1) };
  });

  const ageDist = AGE_GROUPS.map((g) => ({ label: g, count: (rows[g] || []).reduce((a, b) => a + b, 0) }));
  const genderDist = GENDERS.map((g) => ({ label: g, count: (rows[g] || []).reduce((a, b) => a + b, 0) }));
  const natDist = NATIONALITIES.map((n) => ({
    label: n.replace(/\(.*\)/, "").trim(), // shorter label for chart display
    count: (rows[n] || []).reduce((a, b) => a + b, 0),
  }));

  const total = dailyTotals.reduce((a, b) => a + b, 0);
  const peak = dailyTotals.reduce((max, v) => Math.max(max, v), 0);
  const peakDate = dates[dailyTotals.indexOf(peak)] || "";
  const avg = total / Math.max(dates.length, 1);

  const weeks = {};
  dates.forEach((d, i) => {
    const [mm, dd] = d.split("/");
    const weekKey = `${mm}월 ${Math.ceil(parseInt(dd) / 7)}주`;
    weeks[weekKey] = (weeks[weekKey] || 0) + dailyTotals[i];
  });

  return NextResponse.json({
    dates,
    dailyTotals,
    total,
    peak,
    peakDate,
    avg: Math.round(avg),
    hourlyAvg,
    ageDist,
    genderDist,
    natDist,
    weeklyTotals: Object.entries(weeks).map(([week, count]) => ({ week, count })),
    show,
    tabsLoaded: validTabs.length,
  });
}
