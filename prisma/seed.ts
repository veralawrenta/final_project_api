import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { amenitiesSeed } from "./seeds/amenities";
import { citiesSeed } from "./seeds/cities";

async function main() {
  console.log("🌱 Seeding database...");

  await prisma.city.createMany({
    data: citiesSeed,
    skipDuplicates: true,
  });

  await prisma.city.updateMany({
    where: {
      name: { in: citiesSeed.map((c) => c.name) },
      deletedAt: { not: null },
    },
    data: { deletedAt: null },
  });

  console.log("✅ Cities seeded");

  await prisma.amenity.createMany({
    data: amenitiesSeed,
    skipDuplicates: true,
  });

  await prisma.$transaction(
    amenitiesSeed.map((amenity) =>
      prisma.amenity.updateMany({
        where: { name: amenity.name },
        data: {
          code: amenity.code,
          deletedAt: null,
        },
      })
    )
  );

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
