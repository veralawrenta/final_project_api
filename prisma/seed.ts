import "dotenv/config";
import { prisma } from "../src/lib/prisma"; // 👈 your adapter-based client
import { amenitiesSeed } from "./seeds/amenities";
import { citiesSeed } from "./seeds/cities";

async function main() {
  console.log("🌱 Seeding database...");

  // ---- Cities ----
  await prisma.city.createMany({
    data: citiesSeed,
    skipDuplicates: true,
  });

  console.log("✅ Cities seeded");

  // ---- Amenities ----
  for (const amenity of amenitiesSeed) {
    const existing = await prisma.amenity.findFirst({
      where: {
        name: amenity.name,
        propertyId: null,
      },
    });

    if (!existing) {
      await prisma.amenity.create({
        data: {
          name: amenity.name,
          code: amenity.code,
        },
      });
    } else if (existing.code !== amenity.code) {
      await prisma.amenity.update({
        where: { id: existing.id },
        data: { code: amenity.code },
      });
    }
  }

  console.log("✅ Amenities seeded");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
