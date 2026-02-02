import { Prisma, PrismaClient, PropertyStatus } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import {
  CreatePropertyDTO,
  GetAllPropertiesDTO,
  UpdatePropertyDTO,
} from "./dto/property.dto";

export class PropertyService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  getAllProperties = async (query: GetAllPropertiesDTO) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.PropertyWhereInput = {};

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }
    const properties = await this.prisma.property.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        propertyImages: true,
        amenities: true,
        category: true,
        rooms: {
          include: {
            seasonalRates: true,
            roomImages: true,
            roomNonAvailability: true,
          },
        },
      },
    });
    const count = await this.prisma.property.count({
      where: whereClause,
    });
    return {
      data: properties,
      meta: { page, take, total: count },
    };
  };

  getAllPropertiesByTenant = async (tenantId: number, query : GetAllPropertiesDTO) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.PropertyWhereInput = {tenantId, deletedAt: null};

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    };

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        category: true,
        city: true,
        propertyImages: true,
        amenities: true,
        rooms: {
          include: {
            seasonalRates: true,
            roomImages: true,
            roomNonAvailability: true
          },
        },
      },
    });
    if (properties.length === 0) {
      throw new ApiError("No properties found for this tenant", 400);
    };

    const count = await this.prisma.property.count({
      where: whereClause,
    });

    return {
      data: properties,
      meta: { page, take, total: count },
    };
  };

  getPropertyById = async (id: number) => {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        category: true,
        city: true,
        propertyImages: true,
        rooms: true,
        amenities: true,
      },
    });
    if (!property) {
      throw new ApiError("Property ID not found", 400);
    }
    return property;
  };

  createProperty = async (tenantId: number, body: CreatePropertyDTO) => {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new ApiError("Unauthorized", 400);
    }
    const existingProperty = await this.prisma.property.findFirst({
      where: {
        name: body.name,
        address: body.address,
        tenantId,
        deletedAt: null,
      },
    });
    if (existingProperty) {
      throw new ApiError(
        "Property with same name and address already exists",
        400
      );
    }
    const createdProperty = await this.prisma.property.create({
      data: {
        name: body.name,
        description: body.description,
        address: body.address,
        cityId: body.cityId,
        categoryId: body.categoryId,
        propertyType: body.propertyType,
        latitude: body.latitude,
        longitude: body.longitude,
        tenantId,
        propertyStatus: "DRAFT"
      },
    });
    return createdProperty;
  };

  checkPropertyPublishability = async (id: number, tenantId: number) => {
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
  
    const canPublish = validRoom && hasPropertyImages && hasRoom;
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
    const publishability = await this.checkPropertyPublishability(id, tenantId);
    
    if (!publishability.canPublish) {
      const missing = [];
      if (!publishability.checklist.propertyImages) {
        missing.push("property images");
      }
      if (!publishability.checklist.roomCreated) {
        missing.push("at least one room");
      }
      if (!publishability.checklist.validRoom) {
        missing.push("valid room configuration (images, price, units, guests)");
      }
      
      throw new ApiError(
        `Cannot publish property. Missing: ${missing.join(", ")}`,
        400
      );
    };
  
    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: { propertyStatus: "PUBLISHED" },
    });
  
    return updatedProperty;
  };

  unpublishProperty = async (id: number, tenantId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    
    if (!property) {
      throw new ApiError("Property not found", 400);
    }
  
    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: { propertyStatus: "DRAFT" },
    });
  
    return updatedProperty;
  };
  

  updatePublishedPropertyById = async (
    id: number,
    tenantId: number,
    body: Partial<UpdatePropertyDTO>
  ) => {
    const property = await this.prisma.property.findFirst({
      where: { id, propertyStatus: "PUBLISHED" ,deletedAt: null },
      include: {
        propertyImages: true,
        tenant: true,
        rooms: {
          where: {
            deletedAt: null,
          },
          include: {
            transactions: {
              where: {
                status: {
                  in: [
                    "WAITING_FOR_PAYMENT",
                    "WAITING_FOR_CONFIRMATION",
                    "CONFIRMED",
                  ],
                },
              },
            },
            roomNonAvailability: true,
            seasonalRates: true,
          },
        },
      },
    });
    if (!property) {
      throw new ApiError("Property not found", 400);
    }

    if (property.tenantId !== tenantId) {
      throw new ApiError("Tenant is unauthorized", 403);
    }

    const hasActiveTransactions = property.rooms.find(
      (room) => room.transactions.length > 0
    );
    if (hasActiveTransactions) {
      if (
        body.cityId !== undefined ||
        body.address !== undefined ||
        body.latitude !== undefined ||
        body.longitude !== undefined
      ) {
        throw new ApiError(
          "Cannot change location or property type while active bookings exist",
          400
        );
      }
    }

    const propertyData: any = {};

    if (body.name !== undefined) propertyData.name = body.name;
    if (body.description !== undefined)
      propertyData.description = body.description;
    if (body.address !== undefined) propertyData.address = body.description;
    if (body.cityId !== undefined) propertyData.cityId = body.cityId;
    if (body.categoryId !== undefined)
      propertyData.categoryId = body.categoryId;
    if (body.propertyType !== undefined)
      propertyData.propertyData = body.propertyType;
    if (body.latitude !== undefined) propertyData.latitude = body.latitude;
    if (body.longitude !== undefined) propertyData.longitude = body.longitude;

    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: propertyData,
    });
    return updatedProperty;
  };

  deletePropertyById = async (id: number, tenantId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        rooms: {
          where: { deletedAt: null },
          include: {
            transactions: {
              where: {
                deletedAt: null,
                status: {
                  in: [
                    "WAITING_FOR_PAYMENT",
                    "WAITING_FOR_CONFIRMATION",
                    "CONFIRMED",
                  ],
                },
              },
            },
            seasonalRates: true,
            roomImages: true,
            roomNonAvailability: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
    if (!property) {
      throw new ApiError("Property not found", 400);
    }
    if (property.tenantId !== tenantId) {
      throw new ApiError("Forbidden", 403);
    }

    const roomWithActiveBooking = property.rooms.find(
      (room) => room.transactions.length > 0
    );
    if (roomWithActiveBooking) {
      throw new ApiError(
        "Cannot delete property with active or upcoming bookings",
        400
      );
    }

    const roomWithActiveMaintenance = property.rooms.find(
      (room) => room.roomNonAvailability.length > 0
    );
    if (roomWithActiveMaintenance) {
      throw new ApiError(
        "Cannot delete property with active or upcoming maintenance schedule",
        400
      );
    }
    const deletedProperty = await this.prisma.$transaction([
      this.prisma.property.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      }),
      this.prisma.propertyImage.updateMany({
        where: { propertyId: id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.room.updateMany({
        where: { propertyId: id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.roomImage.updateMany({
        where: { room: { propertyId: id } },
        data: { deletedAt: new Date() },
      }),
      /*this.prisma.seasonalRate.updateMany({
        where: { propertyId: id },
        data: { deletedAt: new Date() },
      }),*/
      this.prisma.roomNonAvailability.updateMany({
        where: { room: { propertyId: id } },
        data: { deletedAt: new Date() },
      }),
    ]);
    return deletedProperty;
  };
}
