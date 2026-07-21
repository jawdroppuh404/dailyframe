import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type PromptSeed = {
  id: string;
  title: string;
  constraint: string;
  twist: string;
  tags: string;
  active: boolean;
};

const classics = [
  ["Reflections", "No people in the frame", "Black & white", "composition,light"],
  ["One Color", "Only one dominant color", "Shoot from waist level", "color,composition"],
  ["Leading Lines", "Find at least two lines", "Use a wide angle if possible", "composition"],
  ["Texture", "Fill the frame", "Shoot in side light", "abstract,light"],
  ["Motion", "Show movement", "Try a slow shutter", "technique"],
  ["Shadow Play", "Shadows must be visible", "Keep the subject off-center", "light,story"],
  ["Lonely Object", "Include only one subject", "Use generous negative space", "story,composition"],
  ["Symmetry", "Center the composition precisely", "Compose with a square crop in mind", "composition"],
  ["Un Sharp", "Make softness or blur intentional", "Keep one small detail sharp", "abstract,technique"],
  ["Framing", "Frame the subject with something in the scene", "Use two nested frames", "composition"],
  ["Pattern Break", "Find a repeating pattern with one interruption", "Crop out the pattern's edges", "pattern,composition"],
  ["Minimalism", "Use three visual elements or fewer", "Let empty space dominate", "composition,abstract"],
  ["Layers", "Include a foreground, middle ground, and background", "Keep only one layer sharp", "depth,composition"],
  ["Low Angle", "Photograph from below knee height", "Exclude the horizon", "perspective"],
  ["High Angle", "Photograph from above the subject", "Flatten the scene into shapes", "perspective,abstract"],
] as const;

const subjects = [
  ["Doorways", "Use a doorway as the main subject or frame", "architecture"],
  ["Windows", "Let a window define the composition", "architecture,light"],
  ["Hands", "Tell the story through hands without showing a face", "people,story"],
  ["Footsteps", "Show evidence of a journey or passage", "story,place"],
  ["Morning Light", "Work only with early natural light", "light,time"],
  ["Evening Glow", "Use the final warm light of the day", "light,time"],
  ["After Dark", "Let darkness occupy at least half the frame", "night,light"],
  ["Rain", "Show rain, wetness, or its aftermath", "weather,story"],
  ["Wind", "Make moving air visible through its effect", "weather,motion"],
  ["Clouds", "Give the sky a clear role in the composition", "weather,landscape"],
  ["Water", "Use water as subject, texture, or mirror", "nature,light"],
  ["Trees", "Make one tree or group of trees the visual anchor", "nature"],
  ["Leaves", "Explore shape, color, or decay through leaves", "nature,detail"],
  ["Flowers", "Avoid a conventional centered flower portrait", "nature,color"],
  ["Stone", "Reveal the character of stone or concrete", "texture,place"],
  ["Metal", "Use shine, rust, or hard edges", "texture,light"],
  ["Glass", "Use transparency, glare, or distortion", "light,abstract"],
  ["Fabric", "Make folds and fibers important", "texture,detail"],
  ["Food", "Photograph the traces or ritual of a meal", "still-life,story"],
  ["Tools", "Show an object shaped by work", "still-life,story"],
  ["Books", "Use books to suggest a person or place", "still-life,story"],
  ["Chairs", "Treat an empty chair as a character", "story,still-life"],
  ["Stairs", "Use steps to create rhythm or direction", "architecture,composition"],
  ["Fences", "Explore boundaries, repetition, or separation", "place,pattern"],
  ["Signs", "Find words in the environment that change the image's meaning", "street,story"],
  ["Numbers", "Build the photograph around a visible number", "street,detail"],
  ["Circles", "Find at least two circular forms", "shape,composition"],
  ["Triangles", "Organize the frame around triangular shapes", "shape,composition"],
  ["Stripes", "Use repeated bands, slats, or shadows", "pattern,composition"],
  ["Corners", "Make an intersection of surfaces the focal point", "architecture,abstract"],
  ["Edges", "Place important visual information at the frame's edge", "composition"],
  ["Negative Space", "Let empty space outweigh the subject", "composition,minimal"],
  ["Crowds", "Show density without isolating a single face", "people,street"],
  ["Solitude", "Suggest aloneness without relying on an empty chair", "story,mood"],
  ["Connection", "Show a relationship between two separate things", "story,composition"],
  ["Waiting", "Photograph a scene that feels paused", "story,time"],
  ["Work", "Show effort without making a formal portrait", "people,story"],
  ["Play", "Capture evidence of play or improvisation", "story,motion"],
  ["Quiet", "Create a frame with little visual noise", "mood,minimal"],
  ["Chaos", "Organize a visually busy scene", "composition,street"],
  ["Old and New", "Place two different eras in one frame", "story,place"],
  ["Scale", "Make the size relationship between subjects surprising", "composition,perspective"],
  ["Repetition", "Repeat one visual element at least three times", "pattern,composition"],
  ["Balance", "Balance unequal subjects across the frame", "composition"],
  ["Hidden", "Partially conceal the main subject", "story,composition"],
  ["Found Still Life", "Photograph objects exactly where you find them", "still-life,street"],
  ["Local Landmark", "Show a familiar place without using its obvious view", "place,story"],
  ["Transportation", "Suggest travel without centering a whole vehicle", "street,story"],
  ["Threshold", "Photograph a transition between two spaces", "place,composition"],
  ["Self-Portrait Without a Face", "Show your presence without showing your face", "self,story"],
] as const;

const approaches = [
  ["Eye Level", "Shoot from a natural standing viewpoint", "Move one step closer than feels comfortable", "perspective"],
  ["Ground Level", "Keep the camera within a foot of the ground", "Include something very near the lens", "perspective"],
  ["Through Something", "Photograph through a foreground opening or material", "Let the foreground go soft", "depth"],
  ["Hard Light", "Use direct light with clearly defined shadows", "Underexpose slightly for richer shape", "light"],
  ["Soft Light", "Use diffused light with gentle transitions", "Limit the palette to muted colors", "light,color"],
  ["Close Study", "Work close enough that context becomes ambiguous", "Focus on an overlooked imperfection", "detail,abstract"],
  ["Wide Context", "Show how the subject belongs to its surroundings", "Place the subject in the outer third", "place,composition"],
] as const;

const generated = subjects.flatMap(([subject, subjectConstraint, subjectTags], subjectIndex) =>
  approaches.map(([approach, approachConstraint, twist, approachTags], approachIndex) => ({
    id: `daily-frame-${String(
      classics.length + subjectIndex * approaches.length + approachIndex + 1
    ).padStart(3, "0")}`,
    title: `${subject} — ${approach}`,
    constraint: `${subjectConstraint}. ${approachConstraint}.`,
    twist,
    tags: `${subjectTags},${approachTags}`,
    active: true,
  }))
);

export const promptLibrary: PromptSeed[] = [
  ...classics.map(([title, constraint, twist, tags], index) => ({
    id: `daily-frame-${String(index + 1).padStart(3, "0")}`,
    title,
    constraint,
    twist,
    tags,
    active: true,
  })),
  ...generated,
];

if (promptLibrary.length !== 365) {
  throw new Error(`Expected 365 prompts, received ${promptLibrary.length}.`);
}

async function main() {
  const existingPrompts = await prisma.prompt.findMany({
    select: { id: true, title: true },
  });
  const byId = new Map(existingPrompts.map((prompt) => [prompt.id, prompt]));
  const byTitle = new Map(existingPrompts.map((prompt) => [prompt.title, prompt]));

  let created = 0;
  let updated = 0;

  for (const prompt of promptLibrary) {
    const existing = byId.get(prompt.id) ?? byTitle.get(prompt.title);
    const data = {
      title: prompt.title,
      constraint: prompt.constraint,
      twist: prompt.twist,
      tags: prompt.tags,
      active: prompt.active,
    };

    if (existing) {
      await prisma.prompt.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.prompt.create({ data: prompt });
      created += 1;
    }
  }

  console.log(`Prompt library ready: ${created} created, ${updated} updated.`);
}

if (require.main === module) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (error) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
