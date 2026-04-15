"use client";

import { use } from "react";
import QuotationForm from "@/components/compras/QuotationForm";

export default function QuoteEditPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);

  return <QuotationForm mode="EDIT" requestId={requestId} />;
}
