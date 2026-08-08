import { Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";
import NewExpenseForm from "./new-expense-form";

export default function NewExpensePage() {
  return (
    <Suspense fallback={<PageLoader label="Loading form..." />}>
      <NewExpenseForm />
    </Suspense>
  );
}
