import { concerts } from "../../../../lib/data";
import AssetsWorkspace from "../../../../components/AssetsWorkspace";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return concerts.map((c) => ({ id: c.id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const item = concerts.find((c) => c.id === id);
  if (!item) return notFound();
  return <AssetsWorkspace item={item} mode="music" />;
}
