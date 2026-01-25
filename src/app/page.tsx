async function onUpload(file: File) {
  try {
    console.log("UPLOAD: file", { name: file.name, type: file.type, size: file.size });

    // 1) Upload to Blob
    const blob = await upload(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/blob",
    });

    console.log("UPLOAD: blob url", blob.url);

    // 2) Save metadata in DB
    const res = await fetch("/api/photo/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagePath: blob.url, caption, mood }),
    });

    const text = await res.text();
    console.log("UPLOAD: /api/photo/upload status", res.status, text);

    if (!res.ok) {
      alert(`upload failed: ${res.status} ${text}`);
      return;
    }

    await load();
  } catch (e: any) {
    console.error("UPLOAD ERROR:", e);
    alert(`upload error: ${e?.message ?? String(e)}`);
  }
}