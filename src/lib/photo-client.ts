export const MOODS = [
  "Calm",
  "Moody",
  "Joyful",
  "Curious",
  "Gritty",
  "Reflective",
  "Energetic",
  "Melancholy",
  "Playful",
  "Dreamy",
] as const;

function isHeicLike(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

async function heicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const out = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })) as Blob;
  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([out], `${baseName}.jpg`, { type: "image/jpeg" });
}

export async function optimizePhoto(original: File): Promise<File> {
  const file = isHeicLike(original) ? await heicToJpeg(original) : original;
  const objectUrl = URL.createObjectURL(file);
  const photo = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      photo.onload = () => resolve();
      photo.onerror = () => reject(new Error("Unable to read this photo."));
      photo.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const scale = Math.min(1, 1600 / Math.max(photo.naturalWidth, photo.naturalHeight));
  const width = Math.max(1, Math.round(photo.naturalWidth * scale));
  const height = Math.max(1, Math.round(photo.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare this photo.");
  context.drawImage(photo, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("Unable to compress this photo.")),
      "image/jpeg",
      0.8,
    );
  });
  const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
