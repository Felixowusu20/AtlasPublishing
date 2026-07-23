import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
          border: "1.5px solid #0F6B6A",
          color: "#FFFFFF",
          fontSize: 11,
          fontWeight: 700,
          fontFamily: "Georgia, Times New Roman, serif",
          letterSpacing: "0.5px",
        }}
      >
        AAP
      </div>
    ),
    { ...size },
  );
}
