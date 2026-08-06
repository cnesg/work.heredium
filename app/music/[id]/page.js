import { concerts } from "../../../lib/data";
import DetailPage from "../../../components/DetailPage";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return concerts.map((c) => ({ id: c.id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const item = concerts.find((c) => c.id === id);
  if (!item) return notFound();
  return <DetailPage item={item} mode="music" />;
}
