import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchContributions } from "@/lib/github";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "A CommitGrove contribution forest";

type Props = {
  params: Promise<{ username: string }>;
};

// GitHub-style contribution shades, indexed by the day's 0–4 intensity level.
const LEVEL_COLORS = [
  "rgba(255,255,255,0.05)",
  "#0e4429",
  "#006d32",
  "#26a641",
  "#39d353",
];

export default async function UserOGImage({ params }: Props) {
  const { username } = await params;

  const regular = readFileSync(
    join(process.cwd(), "app/_fonts/Inter-Regular.woff")
  );
  const semibold = readFileSync(
    join(process.cwd(), "app/_fonts/Inter-SemiBold.woff")
  );

  // Best-effort data. A share card is fetched out-of-band by crawlers, so this
  // endpoint must never throw — a missing preview is worse than a generic one.
  // Any failure (no token, rate limit, unknown user) falls back to name-only.
  const result = await fetchContributions(username, 1);
  const year = result.ok ? result.data.years[0] : undefined;
  const total = year?.total ?? 0;
  const weeks = year?.weeks ?? [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#030712",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          position: "relative",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 900,
            height: 900,
            marginLeft: -450,
            marginTop: -450,
            background:
              "radial-gradient(circle, rgba(34,197,94,0.18), transparent 65%)",
            display: "flex",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 88,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          <div
            style={{
              display: "flex",
              background: "linear-gradient(90deg, #4ade80, #6ee7b7)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {username}
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: 30,
            color: "#9ca3af",
            display: "flex",
          }}
        >
          {year
            ? `${total.toLocaleString()} contributions in ${year.year}`
            : "Watch your code grow into a living world"}
        </div>

        {weeks.length > 0 && (
          <div style={{ display: "flex", gap: 3, marginTop: 52 }}>
            {weeks.map((week, wi) => (
              <div
                key={wi}
                style={{ display: "flex", flexDirection: "column", gap: 3 }}
              >
                {week.map((day, di) => (
                  <div
                    key={di}
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      background: LEVEL_COLORS[day.level],
                      display: "flex",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 44,
            fontSize: 24,
            color: "#6b7280",
            fontWeight: 600,
            letterSpacing: 1.5,
            display: "flex",
          }}
        >
          CommitGrove
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: semibold, weight: 600, style: "normal" },
      ],
    }
  );
}
