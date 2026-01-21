import { NextResponse } from "next/server";

const micro = [
  "look for shadows near windows.",
  "shoot from knee level.",
  "find repeating patterns.",
  "get closer than you think.",
  "use negative space (leave lots of empty area).",
  "shoot through something (glass, leaves, doorway).",
  "find one texture and fill the frame.",
  "try a reflection: mirror, puddle, phone screen.",
];

export async function GET() {
  const tip = micro[Math.floor(Math.random() * micro.length)];
  return NextResponse.json({ tip });
}
