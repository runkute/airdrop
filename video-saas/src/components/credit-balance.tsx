"use client";

import { useState, useEffect } from "react";
import { Zap, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CreditBalanceProps {
  userId: string;
  initialBalance: number;
  /** Increment to trigger a balance re-fetch (e.g. after a render completes). */
  refreshKey?: number;
}

export function CreditBalance({
  userId,
  initialBalance,
  refreshKey = 0,
}: CreditBalanceProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      setIsRefreshing(true);
      try {
        const res = await fetch(`/api/users/${userId}/credits`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setBalance(data.balance ?? 0);
        }
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    }
    void refresh();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  async function handleBuyCredits() {
    setIsBuying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: "starter" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create checkout");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("[checkout]", err);
      setIsBuying(false);
    }
  }

  const balanceColor =
    balance >= 100
      ? "text-green-600"
      : balance >= 20
      ? "text-yellow-600"
      : balance >= 10
      ? "text-orange-500"
      : "text-red-600";

  return (
    <div className="flex items-center gap-2">
      {/* Balance chip */}
      <div
        className={cn(
          "flex items-center gap-1.5 text-sm font-semibold tabular-nums",
          balanceColor
        )}
        title={`${balance} credits remaining`}
      >
        {isRefreshing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className="h-3.5 w-3.5 fill-current" />
        )}
        <span>{balance.toLocaleString()}</span>
        <span className="font-normal text-muted-foreground text-xs hidden sm:inline">
          credits
        </span>
      </div>

      {/* Buy-credits CTA */}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 px-2.5"
        onClick={handleBuyCredits}
        disabled={isBuying}
        title="Buy Starter plan — 259 credits for $14"
      >
        {isBuying ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Plus className="h-3 w-3" />
        )}
        <span className="hidden sm:inline">{isBuying ? "Redirecting…" : "Buy Credits"}</span>
        <span className="sm:hidden">Buy</span>
      </Button>
    </div>
  );
}
