"use client";

import { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";

interface PrivyAuthProps {
  onResolvedUserId: (userId: string) => void;
}

export function PrivyAuth({ onResolvedUserId }: PrivyAuthProps) {
  const { ready, authenticated, login, logout, user } = usePrivy();

  useEffect(() => {
    if (!authenticated || !user?.id) {
      return;
    }
    onResolvedUserId(user.id);
  }, [authenticated, onResolvedUserId, user]);

  return (
    <div className="rounded-2xl border border-lumma-ink/20 bg-white/70 p-4 backdrop-blur">
      <p className="font-semibold text-lumma-ink">Privy Wallet Access</p>
      <p className="mt-1 text-sm text-lumma-ink/70">
        Embedded wallet is configured. Login state syncs your Lumma user automatically.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!ready && <span className="text-sm text-lumma-ink/70">Loading auth...</span>}
        {ready && !authenticated && (
          <button
            onClick={login}
            className="rounded-xl bg-lumma-ink px-3 py-2 text-sm font-medium text-lumma-sand transition hover:opacity-90"
          >
            Connect with Privy
          </button>
        )}
        {ready && authenticated && (
          <>
            <span className="rounded-lg border border-lumma-ink/20 bg-lumma-sand px-2 py-1 text-xs text-lumma-ink">
              {user?.id}
            </span>
            <button
              onClick={logout}
              className="rounded-xl border border-lumma-ink/30 px-3 py-2 text-sm font-medium text-lumma-ink transition hover:bg-lumma-ink hover:text-lumma-sand"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

