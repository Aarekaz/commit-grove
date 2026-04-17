import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Larger version of the same mark for iOS home-screen installs. More
// padding + a taller inner cell so it reads as a "chip" rather than
// a dot when rendered at the usual 57-60pt home-screen size.
export default function AppleIcon() {
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
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            borderRadius: 20,
            background: "#22c55e",
            display: "flex",
          }}
        />
      </div>
    ),
    size
  );
}
