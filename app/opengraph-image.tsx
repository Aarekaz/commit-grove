import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "CommitGrove — watch your code grow into a living world";

export default async function LandingOGImage() {
  const regular = readFileSync(
    join(process.cwd(), "app/_fonts/Inter-Regular.woff")
  );
  const semibold = readFileSync(
    join(process.cwd(), "app/_fonts/Inter-SemiBold.woff")
  );

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
            padding: "10px 24px",
            borderRadius: 999,
            border: "1px solid rgba(34,197,94,0.25)",
            background: "rgba(34,197,94,0.08)",
            color: "#4ade80",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 1,
            marginBottom: 44,
            display: "flex",
          }}
        >
          Your commits, visualized
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 96,
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: -3,
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex" }}>Watch your code grow</div>
          <div
            style={{
              display: "flex",
              background: "linear-gradient(90deg, #4ade80, #6ee7b7)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            into a living world
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 28,
            color: "#9ca3af",
            maxWidth: 860,
            textAlign: "center",
            display: "flex",
          }}
        >
          Transform GitHub contributions into forests, cities, and terrain.
        </div>

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
