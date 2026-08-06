import { exhibitions } from "../../../lib/data";
import DetailPage from "../../../components/DetailPage";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return exhibitions.map((e) => ({ id: e.id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const item = exhibitions.find((e) => e.id === id);
  if (!item) return notFound();
  return <DetailPage item={item} mode="art" />;
}
