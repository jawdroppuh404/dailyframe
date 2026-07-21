"use client";

import { useState } from "react";

type SharePrompt = {
  title: string;
  constraint?: string | null;
  twist?: string | null;
};

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Unable to create card."))), "image/png");
  });
}

export async function createPromptCard(prompt: SharePrompt, eyebrow = "today’s prompt") {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create card.");

  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#2a2a2a";
  context.lineWidth = 3;
  context.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  const left = 100;
  const maxWidth = canvas.width - 200;
  context.fillStyle = "#9a9a9a";
  context.font = '32px "Courier New", monospace';
  context.fillText(eyebrow, left, 150);

  context.fillStyle = "#ffffff";
  context.font = '76px "Courier New", monospace';
  let y = 265;
  for (const line of wrapText(context, prompt.title, maxWidth)) {
    context.fillText(line, left, y);
    y += 92;
  }

  const details = [
    prompt.constraint ? ["constraint", prompt.constraint] : null,
    prompt.twist ? ["optional twist", prompt.twist] : null,
  ].filter(Boolean) as string[][];
  for (const [label, value] of details) {
    y += 45;
    context.fillStyle = "#9a9a9a";
    context.font = '28px "Courier New", monospace';
    context.fillText(label, left, y);
    y += 58;
    context.fillStyle = "#ffffff";
    context.font = '38px "Courier New", monospace';
    for (const line of wrapText(context, value, maxWidth)) {
      context.fillText(line, left, y);
      y += 50;
    }
  }

  context.fillStyle = "#ffffff";
  context.font = '28px "Courier New", monospace';
  context.fillText("create today @ jawdroppuh.lol/dailyframe", left, 1235);
  return canvasBlob(canvas);
}

export function SharePromptButton({ prompt, label = "share prompt card", eyebrow = "today’s prompt" }: { prompt: SharePrompt; label?: string; eyebrow?: string }) {
  const [status, setStatus] = useState("");

  async function share() {
    setStatus("making card…");
    try {
      const blob = await createPromptCard(prompt, eyebrow);
      const file = new File([blob], "daily-frame-prompt.png", { type: "image/png" });
      const shareData = { files: [file], title: "Today’s Daily Frame prompt" };

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        setStatus("shared ✓");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("card downloaded ✓");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("");
      } else {
        setStatus(error instanceof Error ? error.message : "Unable to share card.");
      }
    }
  }

  return (
    <div className="share-prompt">
      <button className="secondary" type="button" onClick={() => void share()}>
        {label}
      </button>
      {status && <span className="small">{status}</span>}
    </div>
  );
}
