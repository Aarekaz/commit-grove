import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// A single bright contribution cell on a dark ground — the atomic unit
// of what this app visualizes, readable at 16x16.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#030712",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 3,
            background: "#22c55e",
            display: "flex",
          }}
        />
      </div>
    ),
    size
  );
}
