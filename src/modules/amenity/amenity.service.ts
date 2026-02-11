import { Prisma, PrismaClient } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";

export class AmenityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  getMasterAmenities = async () => {
    return this.prisma.amenity.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  };

  getAmenitiesByPropertyPublic = async (propertyId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
    return this.prisma.amenity.findMany({
      where: {
        properties: {
          some: {
            propertyId,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
  };

  syncAmenities = async (
    tx: Prisma.TransactionClient,
    propertyId: number,
    amenityCodes: string[]
  ) => {
    const masterAmenities = await tx.amenity.findMany({
      where: {
        code: { in: amenityCodes },
        deletedAt: null,
      },
    });

    if (masterAmenities.length !== amenityCodes.length) {
      throw new ApiError("Invalid amenity code", 400);
    }

    const existingAmenities = await tx.propertyAmenity.findMany({
      where: { propertyId, deletedAt: null },
    });

    const existingAmenityIds = existingAmenities.map((a) => a.amenityId);
    const masterAmenityIds = masterAmenities.map((a) => a.id);

    const toAdd = masterAmenityIds.filter(
      (id) => !existingAmenityIds.includes(id)
    );

    const toRemove = existingAmenities.filter(
      (pa) => !masterAmenityIds.includes(pa.amenityId)
    );

    if (toAdd.length) {
      await tx.propertyAmenity.createMany({
        data: toAdd.map((amenityId) => ({
          propertyId,
          amenityId,
        })),
      });
    }

    if (toRemove.length) {
      await tx.propertyAmenity.updateMany({
        where: {
          id: { in: toRemove.map((a) => a.id) },
        },
        data: { deletedAt: new Date() },
      });
    }
  };
}
