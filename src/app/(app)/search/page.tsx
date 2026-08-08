"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Card, CardContent } from "@/components/ui/card";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{
    projects: Array<{ id: string; name: string }>;
    vendors: Array<{ id: string; name: string }>;
    expenses: Array<{ id: string; amountPaise: string; description: string | null }>;
  } | null>(null);

  async function search() {
    const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.data);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Search</h1>
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." className="text-lg" />
        <button onClick={search} className="rounded-lg bg-primary px-6 text-primary-foreground">Search</button>
      </div>
      {results && (
        <div className="space-y-4">
          {results.projects?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="mb-2 font-semibold">Projects</h2>
                {results.projects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block py-1 hover:underline">{p.name}</Link>
                ))}
              </CardContent>
            </Card>
          )}
          {results.vendors?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="mb-2 font-semibold">Vendors</h2>
                {results.vendors.map((v) => (
                  <Link key={v.id} href={`/vendors/${v.id}`} className="block py-1 hover:underline">{v.name}</Link>
                ))}
              </CardContent>
            </Card>
          )}
          {results.expenses?.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="mb-2 font-semibold">Expenses</h2>
                {results.expenses.map((e) => (
                  <p key={e.id} className="py-1">{e.description ?? "Expense"} — <MoneyDisplay paise={e.amountPaise} /></p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
