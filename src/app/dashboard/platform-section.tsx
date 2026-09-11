"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Platform } from "@/modules/integrations";

interface ConnectedAccount {
  id: string;
  externalAccountName: string | null;
  status: string;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

export function PlatformSection({
  platform,
  configured,
  accounts,
}: {
  platform: Platform;
  configured: boolean;
  accounts: ConnectedAccount[];
}) {
  const router = useRouter();
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  async function handleDisconnect(accountId: string) {
    setDisconnectingId(accountId);
    await fetch(`/api/integrations/accounts/${accountId}`, { method: "DELETE" });
    router.refresh();
    setDisconnectingId(null);
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-zinc-800 px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-zinc-100">{PLATFORM_LABELS[platform]}</span>
        {accounts.length === 0 ? (
          <span className="text-sm text-zinc-500">
            {configured ? "Not connected" : "Not configured yet"}
          </span>
        ) : (
          <ul className="flex flex-col gap-1">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center gap-2 text-sm text-zinc-400">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    account.status === "connected" ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                {account.externalAccountName ?? account.id}
                <button
                  type="button"
                  onClick={() => handleDisconnect(account.id)}
                  disabled={disconnectingId === account.id}
                  className="text-xs text-zinc-500 underline decoration-dotted hover:text-red-400 disabled:opacity-60"
                >
                  {disconnectingId === account.id ? "disconnecting…" : "disconnect"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {configured ? (
        <a
          href={`/api/integrations/${platform}/start`}
          className="shrink-0 rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-900"
        >
          {accounts.length > 0 ? "Connect another" : "Connect"}
        </a>
      ) : (
        <span className="shrink-0 rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-600">
          Connect
        </span>
      )}
    </div>
  );
}
