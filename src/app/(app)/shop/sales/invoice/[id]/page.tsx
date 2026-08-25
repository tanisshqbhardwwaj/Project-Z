import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function LegacyShopInvoicePage({ params }: Props) {
  const { id } = await params;
  redirect(`/shop/invoices/${id}`);
}
