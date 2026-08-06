import { exhibitions } from "../../../../lib/data";
import DocentManager from "../../../../components/DocentManager";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return exhibitions.map((e) => ({ id: e.id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const item = exhibitions.find((e) => e.id === id);
  if (!item) return notFound();
  return <DocentManager item={item} />;
}
