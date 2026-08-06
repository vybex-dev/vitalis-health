"use client";

import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { HealthInsight } from "@/types";
import { formatRelative } from "@/lib/utils";

export function InsightCard({
  latest,
  onGenerate,
}: {
  latest?: HealthInsight;
  onGenerate: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    setBusy(true);
    try {
      await onGenerate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-coral" /> Weekly insight
        </CardTitle>
        <Link href="/insights" className="text-xs font-medium text-coral hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardBody className="pt-0">
        {latest ? (
          <>
            <p className="text-sm leading-relaxed text-ink-2">{latest.summary}</p>
            <p className="mt-2 text-xs text-ink-soft">Generated {formatRelative(latest.generatedAt)}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              Log a few vitals or journal entries, then generate your first AI summary of the week.
            </p>
            <Button size="sm" className="mt-4" onClick={handleGenerate} loading={busy}>
              Generate insight <ArrowRight className="size-3.5" />
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}
