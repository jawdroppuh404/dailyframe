"use client";

import { useState } from "react";
import { canvasBlob } from "@/components/share-prompt-button";

type FramePrompt = { title: string; constraint?: string | null; twist?: string | null };

function wrap(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function drawFittedLines(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, maxLines: number, startSize: number, lineGap: number) {
  let size = startSize;
  let lines: string[] = [];
  while (size >= 20) {
    context.font = `${size}px "Courier New", monospace`;
    lines = wrap(context, text, maxWidth);
    if (lines.length <= maxLines) break;
    size -= 4;
  }
  lines.slice(0, maxLines).forEach((line, index) => context.fillText(line, x, y + index * (size + lineGap)));
  return y + Math.min(lines.length, maxLines) * (size + lineGap);
}

async function loadImage(source: string) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to prepare this photo."));
    image.src = source;
  });
  return image;
}

async function createPhotoCard(prompt: FramePrompt, imageUrl: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create card.");
  context.fillStyle = "#000";
  context.fillRect(0, 0, 1080, 1350);
  context.strokeStyle = "#2a2a2a";
  context.lineWidth = 3;
  context.strokeRect(48, 48, 984, 1254);

  const left = 90;
  const width = 900;
  context.fillStyle = "#aaa";
  context.font = '25px "Courier New", monospace';
  context.fillText("today’s frame", left, 105);
  context.fillStyle = "#fff";
  let y = drawFittedLines(context, prompt.title, left, 165, width, 2, 54, 10);

  for (const [label, value] of [["constraint", prompt.constraint], ["optional twist", prompt.twist]] as const) {
    if (!value) continue;
    context.fillStyle = "#999";
    context.font = '20px "Courier New", monospace';
    context.fillText(label, left, y + 5);
    context.fillStyle = "#fff";
    y = drawFittedLines(context, value, left, y + 36, width, 2, 27, 7) + 5;
  }

  const photoTop = Math.max(410, Math.min(500, y + 20));
  const photoHeight = 1125 - photoTop;
  const photo = await loadImage(imageUrl);
  const scale = Math.min(width / photo.naturalWidth, photoHeight / photo.naturalHeight);
  const drawWidth = photo.naturalWidth * scale;
  const drawHeight = photo.naturalHeight * scale;
  const drawX = left + (width - drawWidth) / 2;
  const drawY = photoTop + (photoHeight - drawHeight) / 2;
  context.strokeStyle = "#333";
  context.strokeRect(left, photoTop, width, photoHeight);
  context.drawImage(photo, drawX, drawY, drawWidth, drawHeight);

  context.fillStyle = "#fff";
  context.font = '28px "Courier New", monospace';
  context.fillText("create today @ jawdroppuh.lol/dailyframe", left, 1245);
  return canvasBlob(canvas);
}

export function SharePhotoButton({ prompt, imageUrl }: { prompt: FramePrompt; imageUrl: string }) {
  const [status, setStatus] = useState("");

  async function share() {
    setStatus("making card…");
    try {
      const blob = await createPhotoCard(prompt, imageUrl);
      const file = new File([blob], "daily-frame-photo.png", { type: "image/png" });
      const data = { files: [file], title: "My Daily Frame" };
      if (navigator.share && navigator.canShare?.(data)) {
        await navigator.share(data);
        setStatus("shared ✓");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
        setStatus("card downloaded ✓");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") setStatus("");
      else setStatus(error instanceof Error ? error.message : "Unable to share card.");
    }
  }

  return <div className="share-prompt"><button className="secondary" type="button" onClick={() => void share()}>share photo card</button>{status && <span className="small">{status}</span>}</div>;
}
