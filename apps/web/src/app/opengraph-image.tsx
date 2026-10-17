import { ImageResponse } from "next/og";

export const alt = "Firebreak — Stop the spread. Roll back bad deploys with proof.";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#0B0A0F",
          backgroundImage:
            "linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          color: "#FAFAFA",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #FF5500 0%, #8A2BE2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              boxShadow: "0 0 30px rgba(255, 85, 0, 0.4)",
            }}
          >
            🔥
          </div>
          <span
            style={{
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#FAFAFA",
            }}
          >
            firebreak
          </span>
          <span
            style={{
              fontSize: "14px",
              fontFamily: "monospace",
              color: "#A78BFA",
              border: "1px solid rgba(167, 139, 250, 0.3)",
              padding: "4px 12px",
              borderRadius: "9999px",
              marginLeft: "12px",
            }}
          >
            [ VERCEL + GITHUB + MCP ]
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1
            style={{
              fontSize: "64px",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              color: "#FFFFFF",
              margin: 0,
            }}
          >
            Stop the spread.
            <br />
            <span style={{ color: "#9CA3AF" }}>Roll back with proof.</span>
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#9CA3AF",
              lineHeight: 1.4,
              maxWidth: "800px",
              margin: 0,
            }}
          >
            Autonomous diagnosis and verified rollback platform. Ranks suspect commits deterministically and verifies live recovery with health probes.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "24px",
            fontSize: "16px",
            fontFamily: "monospace",
            color: "#6B7280",
          }}
        >
          <span>firebreak.dev</span>
          <span>9 NITROSTACK MCP TOOLS</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
