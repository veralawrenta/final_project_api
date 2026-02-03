import { PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";

export class AmenityService {
  private prisma: PrismaClient;
  
  constructor() {
    this.prisma = prisma;
  }

  getMasterAmenities = async () => {
    return this.prisma.amenity.findMany({
      where: {
        propertyId: null,
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
        propertyId,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });
  };

  syncAmenities = async (
    tx: any,
    propertyId: number,
    amenityCodes: string[]
  ) => {
    const currentAmenities = await tx.amenity.findMany({
      where: { propertyId, deletedAt: null },
    });

    const currentAmenityCodes = currentAmenities.map((a: any) => a.code);

    const toAdd = amenityCodes.filter(
      (code) => !currentAmenityCodes.includes(code)
    );
    const toRemove = currentAmenities.filter(
      (amenity: any) => !amenityCodes.includes(amenity.code)
    );

    if (toAdd.length > 0) {
      const masterAmenities = await tx.amenity.findMany({
        where: {
          code: { in: toAdd },
          propertyId: null,
          deletedAt: null,
        },
      });

      if (masterAmenities.length !== toAdd.length) {
        throw new ApiError("Invalid amenity code", 400);
      }

      await tx.amenity.createMany({
        data: masterAmenities.map((a: any) => ({
          code: a.code,
          name: a.name,
          propertyId,
        })),
      });
    }

    if (toRemove.length > 0) {
      await tx.amenity.updateMany({
        where: {
          id: { in: toRemove.map((a: any) => a.id) },
          propertyId,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }
  };
}