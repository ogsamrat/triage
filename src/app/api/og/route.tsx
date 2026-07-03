import { ImageResponse } from "next/og";

export const runtime = "edge";

const PAPER = "#F6F2E9";
const INK = "#1A1812";
const INKSOFT = "#54503F";
const RULE = "#D7CFBC";
const SIGNAL = "#C02C10";
const AMBER = "#835711";
const CALM = "#5C6B4E";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const headline = (searchParams.get("headline") || "Draft the essay's spine").slice(0, 64);
  const tasks = (searchParams.get("tasks") || "5").slice(0, 4);
  const focus = (searchParams.get("focus") || "4 hr 30 min").slice(0, 24);
  const streak = (searchParams.get("streak") || "0").slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
        }}
      >
        <div style={{ height: 14, width: "100%", background: INK, display: "flex" }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            padding: "56px 72px",
            justifyContent: "space-between",
          }}
        >
          {/* Masthead row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `2px solid ${RULE}`,
              paddingBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 22,
                letterSpacing: 6,
                color: INKSOFT,
                textTransform: "uppercase",
              }}
            >
              Triage — Right Now
            </div>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, color: SIGNAL }}>
              {tasks} on the board
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              display: "flex",
              fontSize: 92,
              lineHeight: 1.02,
              letterSpacing: -2,
              fontWeight: 700,
              maxWidth: 980,
            }}
          >
            {headline}
          </div>

          {/* Stats + palette */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              borderTop: `2px solid ${INK}`,
              paddingTop: 22,
            }}
          >
            <div style={{ display: "flex", gap: 56 }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{focus}</div>
                <div style={{ display: "flex", fontSize: 18, letterSpacing: 3, color: INKSOFT, textTransform: "uppercase" }}>
                  of focus
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>{streak}-day</div>
                <div style={{ display: "flex", fontSize: 18, letterSpacing: 3, color: INKSOFT, textTransform: "uppercase" }}>
                  streak
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>first aid</div>
                <div style={{ display: "flex", fontSize: 18, letterSpacing: 3, color: INKSOFT, textTransform: "uppercase" }}>
                  for your to-do list
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 0 }}>
              <div style={{ width: 34, height: 34, background: INK, display: "flex" }} />
              <div style={{ width: 34, height: 34, background: SIGNAL, display: "flex" }} />
              <div style={{ width: 34, height: 34, background: AMBER, display: "flex" }} />
              <div style={{ width: 34, height: 34, background: CALM, display: "flex" }} />
            </div>
          </div>
        </div>

        <div style={{ height: 14, width: "100%", background: INK, display: "flex" }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
