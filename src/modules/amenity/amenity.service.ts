import { PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { CreateAmenitiesDTO, CreateAmenityDTO, UpdateAmenityDTO } from "./dto/amenity.dto";

export class AmenityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  getAmenitiesByTenant = async (tenantId: number, propertyId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: tenantId, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
    const amenities = await this.prisma.amenity.findMany({
      where: { propertyId, deletedAt: null },
    });
    return amenities;
  };

  createAmenity = async (
    tenantId: number,
    propertyId: number,
    body: CreateAmenityDTO
  ) => {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: tenantId, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
    const existingAmenity = await this.prisma.amenity.findFirst({
      where: { propertyId, name: body.name, deletedAt: null },
    });
    if (existingAmenity) {
      throw new ApiError("Amenity in property already exist", 400);
    }

    const createdAmenity = await this.prisma.amenity.create({
      data: {
        name: body.name,
        propertyId,
      },
    });
    return createdAmenity;
  };

  createAmenities = async (
    tenantId: number,
    propertyId: number,
    body: CreateAmenitiesDTO
  ) => {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: tenantId, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
    const existingAmenities = await this.prisma.amenity.findMany({
      where: { propertyId,  name: { in: body.names }, deletedAt: null },
    });
    if (existingAmenities.length >0 ) {
      throw new ApiError("Amenity in property already exist", 400);
    }

    const createdAmenities = await this.prisma.amenity.createMany({
      data: body.names.map((name) => ({
        name,
        propertyId,
      })),
    });
    return createdAmenities;
  };

  updateAmenity = async (
    id: number,
    tenantId: number,
    body: UpdateAmenityDTO
  ) => {
    const amenity = await this.prisma.amenity.findFirst({
      where: { id, deletedAt: null },
      include: {
        property: true,
      },
    });
    if (!amenity) throw new ApiError("Amenity not found", 404);

    if (amenity.property.tenantId !== tenantId) {
      throw new ApiError("Forbidden", 403);
    }
    const updatedAmenity = await this.prisma.amenity.update({
      where: { id },
      data: {
        name: body.name,
      },
    });
    return updatedAmenity;
  };
  deleteAmenity = async (id: number, tenantId: number) => {
    const amenity = await this.prisma.amenity.findFirst({
        where: { id, deletedAt: null },
        include: {
          property: true,
        },
      });
      if (!amenity) throw new ApiError("Amenity not found", 404);
  
      if (amenity.property.tenantId !== tenantId) {
        throw new ApiError("Forbidden", 403);
      };
      const deletedAmenity = await this.prisma.amenity.update({
        where: { id },
        data: {
            deletedAt: new Date(),
        },
      });
      return deletedAmenity;
  };
}
