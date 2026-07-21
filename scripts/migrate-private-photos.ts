import { del, get, put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const privateToken = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
const oidcToken = process.env.VERCEL_OIDC_TOKEN;
const privateStoreId = process.env.PRIVATE_BLOB_STORE_ID;
const publicToken = process.env.BLOB_READ_WRITE_TOKEN;

const privateAuth =
  oidcToken && privateStoreId
    ? { oidcToken, storeId: privateStoreId }
    : { token: privateToken };

if (!privateToken && (!oidcToken || !privateStoreId)) {
  throw new Error(
    "PRIVATE_BLOB_READ_WRITE_TOKEN or VERCEL_OIDC_TOKEN with PRIVATE_BLOB_STORE_ID is required",
  );
}
if (!publicToken) throw new Error("BLOB_READ_WRITE_TOKEN is required");

function extensionFor(url: URL, contentType: string) {
  const pathnameExtension = url.pathname.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  if (pathnameExtension && ["jpg", "jpeg", "png", "webp"].includes(pathnameExtension)) {
    return pathnameExtension;
  }

  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

async function main() {
  const photos = await prisma.dailyPhoto.findMany({
    where: { imagePath: { startsWith: "https://" } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${photos.length} legacy public photo(s).`);

  for (const [index, photo] of photos.entries()) {
    const legacyUrl = new URL(photo.imagePath);
    if (!legacyUrl.hostname.endsWith(".public.blob.vercel-storage.com")) {
      throw new Error(`Photo ${photo.id} points to an unexpected host`);
    }

    const response = await fetch(legacyUrl, { cache: "no-store" });
    if (!response.ok || !response.body) {
      throw new Error(`Could not download photo ${photo.id}: HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const extension = extensionFor(legacyUrl, contentType);
    const privatePath = `users/${photo.userId}/${photo.dateKey}/legacy-${photo.id}.${extension}`;

    const uploaded = await put(privatePath, response.body, {
      access: "private",
      ...privateAuth,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
      multipart: true,
    });

    const verification = await get(uploaded.pathname, {
      access: "private",
      ...privateAuth,
    });
    if (verification?.statusCode !== 200 || !verification.stream) {
      throw new Error(`Private copy verification failed for photo ${photo.id}`);
    }
    await verification.stream.cancel();

    const updated = await prisma.dailyPhoto.updateMany({
      where: { id: photo.id, imagePath: photo.imagePath },
      data: { imagePath: uploaded.pathname },
    });
    if (updated.count !== 1) {
      throw new Error(`Database record changed while migrating photo ${photo.id}`);
    }

    await del(photo.imagePath, { token: publicToken });
    console.log(`Migrated ${index + 1}/${photos.length}: ${photo.id}`);
  }

  const remaining = await prisma.dailyPhoto.count({
    where: { imagePath: { startsWith: "https://" } },
  });
  if (remaining !== 0) throw new Error(`${remaining} legacy public photo(s) remain`);

  console.log("Migration complete. All photo records now use private storage paths.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
