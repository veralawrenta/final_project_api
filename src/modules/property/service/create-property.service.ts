import {
  PrismaClient,
  PropertyStatus,
  Tenant,
} from "../../../../generated/prisma/client.js";
import { CloudinaryService } from "../../../cloudinary/cloudinary.service.js";
import { prisma } from "../../../lib/prisma.js";
import { ApiError } from "../../../utils/api-error.js";
import { AmenityService } from "../../amenity/amenity.service.js";
import { RedisService } from "../../redis/redis.service.js";
import { TenantService } from "../../tenant/resolve-tenant.js";
import { CreatePropertyDTO } from "../dto/property.dto.js";

export class CreatePropertyService {
  private prisma: PrismaClient;
  private amenityService: AmenityService;
  private tenantService : TenantService;
  private redis: RedisService;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = prisma;
    this.amenityService = new AmenityService();
    this.tenantService = new TenantService();
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
    if (!urlImages || urlImages.length === 0) {
      throw new ApiError("At least one property image is required", 400);
    }
    if (urlImages.length > 10) {
      throw new ApiError("One property can have a maximum of 10 images", 400);
    }
    let uploadedImageUrls: string[] = []; //upload all images to cloudinary first
    try {
      uploadedImageUrls = await Promise.all(
        urlImages.map(async (file) => {
          const { secure_url } = await this.cloudinaryService.upload(file);
          return secure_url;
        })
      );
    } catch (error) {
      throw new ApiError("Failed to upload images to Cloudinary", 500);
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
        const existingProperty = await tx.property.findFirst({
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
        const createdProperty = await tx.property.create({
          data: {
            name: body.name,
            description: body.description,
            categoryId: body.categoryId || null,
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
        for (let i = 0; i < uploadedImageUrls.length; i++) {
          await tx.propertyImage.create({
            data: {
              propertyId: createdProperty.id,
              urlImages: uploadedImageUrls[i],
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
    } catch (error) {
      throw error;
    }
  };
  validatePropertyStepOne = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);

    const property = await this.prisma.property.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
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

  validatePropertyPublish = async (id: number, tenant: Tenant) => {
    const property = await this.prisma.property.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
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
    }

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

    const canPublish = hasPropertyImages && validRoom && hasRoom;

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

  publishProperty = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);

    const publishability = await this.validatePropertyPublish(id, tenant);

    if (publishability.currentStatus === PropertyStatus.PUBLISHED) {
      throw new ApiError("Property already published", 400);
    }

    if (!publishability.canPublish) {
      const missing: string[] = [];

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
      data: { propertyStatus: PropertyStatus.PUBLISHED },
    });

    await this.invalidatePropertyCaches(id);
    return updatedProperty;
  };

  unpublishProperty = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const property = await this.prisma.property.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
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
