"use client";

import Link from "next/link";
import type { FetchErrorReason } from "@/lib/github";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

const COPY: Record<FetchErrorReason, { title: string; body: string }> = {
  rate_limited: {
    title: "GitHub rate limit reached",
    body: "GitHub is throttling requests from this app. Try again in a few minutes.",
  },
  unauthorized: {
    title: "Couldn't reach GitHub",
    body: "Authentication with GitHub failed. This is on our side, not yours.",
  },
  network: {
    title: "Network hiccup",
    body: "We couldn't reach GitHub. Check your connection and try again.",
  },
  server: {
    title: "GitHub is having trouble",
    body: "GitHub returned an error. Give it a moment and retry.",
  },
  misconfigured: {
    title: "App misconfigured",
    body: "This CommitGrove install is missing its GitHub token. (Admin: set GITHUB_TOKEN.)",
  },
  not_found: {
    // Not reachable in practice — not_found is handled by notFound() → not-found.tsx.
    // Included for exhaustiveness.
    title: "User not found",
    body: "That GitHub username doesn't exist or has no public contributions.",
  },
};

const FALLBACK = {
  title: "Something went wrong",
  body: "An unexpected error occurred. Try again, or head back home.",
};

function isFetchErrorReason(value: string): value is FetchErrorReason {
  return value in COPY;
}

export default function UserPageError({ error, reset }: Props) {
  const copy = isFetchErrorReason(error.message) ? COPY[error.message] : FALLBACK;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-6">
      <div className="flex max-w-lg flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-white">{copy.title}</h1>
          <p className="text-gray-400">{copy.body}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] rounded-xl bg-green-500 px-5 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-green-400"
          >
            Try again
          </button>
          <Link
            href="/"
            className="min-h-[44px] rounded-xl border border-gray-800 px-5 py-3 text-sm font-semibold text-gray-300 transition-colors hover:border-gray-700 hover:text-white"
          >
            ← Home
          </Link>
        </div>
      </div>
    </main>
  );
}
