import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const prompts = [
  { title: "Reflections", constraint: "No people in the frame", twist: "Black & white", tags: "composition,light" },
  { title: "One Color", constraint: "Only one dominant color", twist: "Shoot from waist level", tags: "color,composition" },
  { title: "Leading Lines", constraint: "Find at least 2 lines", twist: "Wide angle if possible", tags: "composition" },
  { title: "Texture", constraint: "Fill the frame", twist: "Shoot in side light", tags: "abstract,light" },
  { title: "Motion", constraint: "Show movement", twist: "Try slow shutter", tags: "technique" },
  { title: "Shadow Play", constraint: "Shadows must be visible", twist: "No subject centered", tags: "light,story" },
  { title: "Lonely Object", constraint: "One subject only", twist: "Use negative space", tags: "story,composition" },
  { title: "Symmetry", constraint: "Perfectly centered", twist: "Square crop mindset", tags: "composition" }
];

async function main() {
  // MVP: no auth; use a stable demo user
  await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user", name: "Demo", timezone: "America/New_York" }
  });

  const existing = await prisma.prompt.count();
  if (existing === 0) {
    await prisma.prompt.createMany({ data: prompts });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
