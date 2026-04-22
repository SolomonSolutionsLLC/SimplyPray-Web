"use client";

import { useState } from "react";

interface Church {
  id: string;
  name: string;
  slug: string;
  max_seats: number | null;
}

interface MemberCounts {
  active: number;
  inactive: number;
  deactivated: number;
  total: number;
}

interface SharedStats {
  lists: number;
  activeRequests: number;
  answeredThisMonth: number;
}

interface StatsPanelProps {
  church: Church;
  counts: MemberCounts;
  sharedStats: SharedStats;
}

export function StatsPanel({ church, counts, sharedStats }: StatsPanelProps) {
  const [copied, setCopied] = useState(false);
  const joinUrl = `app.simplypray.io/join/${church.slug}`;

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(`https://${joinUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = `https://${joinUrl}`;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl text-ink tracking-tight">{church.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">Dashboard overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active members" value={counts.active} suffix={church.max_seats ? ` / ${church.max_seats}` : ""} />
        <StatCard label="Shared lists" value={sharedStats.lists} />
        <StatCard label="Shared requests" value={sharedStats.activeRequests} />
        <StatCard label="Answered (month)" value={sharedStats.answeredThisMonth} />
      </div>

      <div className="rounded-card border border-sanctuary-hairline bg-white p-6 space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
          Invite Link
        </p>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded-[10px] bg-sanctuary-warm px-4 py-2.5 text-sm text-ink font-mono">
            {joinUrl}
          </code>
          <button onClick={copyInviteLink} className="btn-primary">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-card border border-sanctuary-hairline bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-2 font-serif text-3xl text-ink">
        {value}
        {suffix && <span className="text-base font-normal text-ink-soft">{suffix}</span>}
      </p>
    </div>
  );
}
