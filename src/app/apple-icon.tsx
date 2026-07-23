import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0B1F33",
          borderRadius: 40,
          border: "6px solid #0F6B6A",
          color: "#FFFFFF",
          fontSize: 56,
          fontWeight: 700,
          fontFamily: "Georgia, Times New Roman, serif",
          letterSpacing: "2px",
        }}
      >
        AAP
      </div>
    ),
    { ...size },
  );
}
