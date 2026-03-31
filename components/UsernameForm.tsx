"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface UsernameFormProps {
  hints?: string[];
}

export function UsernameForm({ hints }: UsernameFormProps) {
  const [username, setUsername] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed) {
      router.push(`/${trimmed}`);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-3">
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
            width="18"
            height="18"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
          </svg>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="GitHub username"
            className="w-full rounded-xl border border-gray-800 bg-gray-900 py-3.5 pl-11 pr-4 text-base text-white placeholder-gray-600 outline-none transition-all focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!username.trim()}
          className="min-h-[44px] rounded-xl bg-green-500 py-3 text-base font-semibold text-gray-950 transition-all hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Grow my forest
        </button>
      </form>

      {hints && hints.length > 0 && (
        <p className="flex flex-wrap items-center justify-center gap-x-1 text-xs text-gray-600">
          <span>Try</span>
          {hints.map((hint, i) => (
            <span key={hint} className="flex items-center gap-x-1">
              <button
                type="button"
                onClick={() => router.push(`/${hint}`)}
                className="min-h-[44px] px-1 text-gray-400 underline decoration-gray-700 underline-offset-2 transition-colors hover:text-green-400"
              >
                {hint}
              </button>
              {i < hints.length - 1 && <span className="text-gray-700">·</span>}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
