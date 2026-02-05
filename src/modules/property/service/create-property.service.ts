import {
  PrismaClient,
  PropertyStatus,
} from "../../../../generated/prisma/client";
import { CloudinaryService } from "../../../cloudinary/cloudinary.service";
import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../../utils/api-error";
import { AmenityService } from "../../amenity/amenity.service";
import { PropertyImagesService } from "../../propertyImage/propertyImage.service";
import { RedisService } from "../../redis/redis.service";
import { CreatePropertyDTO } from "../dto/property.dto";

export class CreatePropertyService {
  private prisma: PrismaClient;
  private amenityService: AmenityService;
  private redis: RedisService;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = prisma;
    this.amenityService = new AmenityService();
    this.redis = new RedisService();
    this.cloudinaryService = new CloudinaryService();
  }

  private SEARCH_CACHE_TTL_SECONDS = 60;
  private CALENDAR_CACHE_TTL_SECONDS = 300;

  private async invalidatePropertyCaches(propertyId: number) {
    await this.redis.delByPrefix("property:search:");
    await this.redis.delByPrefix(`property:calendar30:${propertyId}:`);
  }

  createProperty = async (
    authUserId: number,
    body: CreatePropertyDTO,
    urlImages: Express.Multer.File[]
  ) => {
    return await this.prisma.$transaction(async (tx) => {
      const tenant = await this.prisma.tenant.findFirst({
        where: { userId: authUserId, deletedAt: null },
      });

      if (!tenant) {
        throw new ApiError(
          "Tenant not found. Please register as a tenant first",
          404
        );
      }

      const existingProperty = await prisma.property.findFirst({
        where: {
          tenantId: tenant.id,
          name: body.name,
          address: body.address,
          cityId: body.cityId,
          deletedAt: null,
        },
      });

      if (existingProperty) {
        throw new ApiError(
          "Property with the same name and this address already exist in this city",
          409
        );
      }
      const city = await tx.city.findUnique({
        where: { id: body.cityId, deletedAt: null },
      });
      if (!city) {
        throw new ApiError("City not found", 404);
      }

      if (body.categoryId) {
        const category = await tx.category.findFirst({
          where: {
            id: body.categoryId,
            tenantId: tenant.id,
            deletedAt: null,
          },
        });
        if (!category) {
          throw new ApiError(
            "Category not found or does not belong to this tenant",
            404
          );
        }
      }
      const createdProperty = await this.prisma.property.create({
        data: {
          name: body.name,
          description: body.description,
          categoryId: body.categoryId,
          cityId: body.cityId,
          propertyType: body.propertyType,
          address: body.address,
          latitude: body.latitude,
          longitude: body.longitude,
          tenantId: tenant.id,
          propertyStatus: PropertyStatus.DRAFT,
        },
      });
      if (body.amenities && body.amenities.length > 0) {
        await this.amenityService.syncAmenities(
          tx,
          createdProperty.id,
          body.amenities
        );
      }
      for (let i = 0; i < urlImages.length; i++) {
        const { secure_url } = await this.cloudinaryService.upload(
          urlImages[i]
        );
        await tx.propertyImage.create({
          data: {
            propertyId: createdProperty.id,
            urlImages: secure_url,
            isCover: i === 0,
          },
        });
      }
      return await tx.property.findUnique({
        where: { id: createdProperty.id },
        include: {
          propertyImages: true,
          amenities: true,
        },
      });
    });
  };
  //this is for draft one if they cannot finish the property image and create property data
  validatePropertyStepOne = async (id: number, tenantId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        propertyImages: {
          where: { deletedAt: null },
        },
      },
    });
  
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
  
    const hasPropertyImages = property.propertyImages.length > 0;
  
    return {
      isStep1Complete: hasPropertyImages,
      checklist: {
        propertyImages: hasPropertyImages,
      },
    };
  };


  validatePropertyPublish = async (id: number, tenantId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        propertyImages: {
          where: { deletedAt: null },
        },
        rooms: {
          where: { deletedAt: null },
          include: {
            roomImages: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!property) {
      throw new ApiError("Property not found", 400);
    };

    const hasPropertyImages = property.propertyImages.length > 0;

    const hasRoom = property.rooms.length > 0;
    const validRoom = property.rooms.some((room) => {
      return (
        room.roomImages.length > 0 &&
        room.basePrice > 0 &&
        room.totalUnits > 0 &&
        room.totalGuests > 0
      );
    });

    const canPublish =  hasPropertyImages && validRoom && hasRoom;

    return {
      currentStatus: property.propertyStatus,
      canPublish,
      checklist: {
        propertyImages: hasPropertyImages,
        roomCreated: hasRoom,
        validRoom,
      },
    };
  };

  publishProperty = async (id: number, tenantId: number) => {
    const publishability = await this.validatePropertyPublish(id, tenantId);
    if (publishability.currentStatus === PropertyStatus.PUBLISHED) {
      throw new ApiError("Property already published", 400);
    }

    if (!publishability.canPublish) {
      const missing = [];
      if (!publishability.checklist.propertyImages) {
        missing.push("property images");
      }
      if (!publishability.checklist.roomCreated) {
        missing.push("at least one room");
      }
      if (!publishability.checklist.validRoom) {
        missing.push(
          "valid room configuration (images, price > 0, units > 0, guests > 0)"
        );
      }

      throw new ApiError(
        `Cannot publish property. Missing: ${missing.join(", ")}`,
        400
      );
    }
    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: { propertyStatus: "PUBLISHED" },
    });
    await this.invalidatePropertyCaches(id);
    return updatedProperty;
  };

  unpublishProperty = async (id: number, tenantId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!property) throw new ApiError("Property not found", 404);

    const updated = await this.prisma.property.update({
      where: { id },
      data: { propertyStatus: PropertyStatus.DRAFT },
    });
    await this.invalidatePropertyCaches(id);
    return updated;
  };
}
