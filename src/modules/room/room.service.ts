import {
  Prisma,
  PrismaClient,
  PropertyStatus,
} from "../../../generated/prisma/client.js";
import { CloudinaryService } from "../../cloudinary/cloudinary.service.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { TenantService } from "../tenant/resolve-tenant.js";
import { CreateRoomDTO, GetAllRoomsDTO, UpdateRoomDTO } from "./dto/room.dto.js";

export class RoomService {
  private prisma: PrismaClient;
  tenantService : TenantService;
  cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = prisma;
    this.tenantService = new TenantService();
    this.cloudinaryService = new CloudinaryService();
  }

  getAllRoomsByProperty = async (authUserId: number, propertyId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: tenant.id, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
    const rooms = await this.prisma.room.findMany({
      where: { propertyId: propertyId, deletedAt: null },
      include: {
        property: true,
        roomImages: {
          where: { deletedAt: null },
        },
        roomNonAvailability: {
          where: { deletedAt: null },
        },
        seasonalRates: {
          where: { deletedAt: null },
        },
        transactions: {
          select: {
            checkIn: true,
            checkOut: true,
            status: true,
          },
        },
      },
    });
    return rooms;
  };

  getAllRoomsByTenant = async (authUserId: number, query: GetAllRoomsDTO) => {
    const { page, take, sortBy, sortOrder, search, propertyType } = query;
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);

    const whereClause: Prisma.RoomWhereInput = {
      deletedAt: null,
      property: {
        tenantId: tenant.id,
        deletedAt: null,
        ...(propertyType && { propertyType: propertyType }),
      },
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        {
          property: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const rooms = await this.prisma.room.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        property: {
          select: {
            name: true,
            category: true,
            city: true,
            propertyType: true,
            propertyStatus: true,
            propertyImages: { where: { deletedAt: null } },
          },
        },
        roomImages: {
          where: { deletedAt: null },
          select: { id: true, urlImages: true, isCover: true },
        },
        roomNonAvailability: {
          where: { deletedAt: null },
        },
        seasonalRates: {
          where: { deletedAt: null },
        },
      },
    });
    const count = await this.prisma.room.count({
      where: whereClause,
    });
    return {
      data: rooms,
      meta: { page, take, total: count },
    };
  };

  getRoomId = async (id: number) => {
    const room = await this.prisma.room.findUnique({
      where: { id, deletedAt: null, property: { deletedAt: null } },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            propertyStatus: true,
            propertyType: true,
            city: {
              select: {
                name: true,
              },
            },
            category: {
              select: { name: true },
            },
            propertyImages: {
              where: { deletedAt: null },
            },
          },
        },
        roomImages: {
          where: { deletedAt: null },
          select: {
            urlImages: true,
            isCover: true,
          }
        },
        roomNonAvailability: {
          where: { deletedAt: null },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            reason: true,
          },
        },
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
        seasonalRates: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            fixedPrice: true,
          },
        },
      },
    });
    return room;
  };

  createRoom = async (
    authUserId: number,
    propertyId: number,
    body: CreateRoomDTO,
    urlImages: Express.Multer.File[]
  ) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId: tenant.id, deletedAt: null },
      include: {
        propertyImages: true,
      },
    });
    if (!property) {
      throw new ApiError("Property not found ", 404);
    }

    if (property.propertyImages.length === 0) {
      throw new ApiError(
        "Cannot create room. Please upload at least one property image first (Step 1)",
        400
      );
    }

    if (!urlImages || urlImages.length === 0) {
      throw new ApiError("At least one room image is required", 400);
    }
    if (urlImages.length > 3) {
      throw new ApiError("A room can have a maximum of 3 images", 400);
    }

    const existingRoom = await this.prisma.room.findFirst({
      where: { name: body.name, propertyId: propertyId, deletedAt: null },
    });
    if (existingRoom) {
      throw new ApiError(
        "Room with the same name already exists in this property",
        400
      );
    }
    const uploadedImageUrls: string[] = [];
    try {
      for (const file of urlImages) {
        const { secure_url } = await this.cloudinaryService.upload(file);
        uploadedImageUrls.push(secure_url);
      }
    } catch (error) {
      throw new ApiError("Failed to upload images to cloud storage", 500);
    }
    return await this.prisma.$transaction(async (tx) => {
      const room = await tx.room.create({
        data: {
          name: body.name,
          basePrice: body.basePrice,
          totalGuests: body.totalGuests,
          description: body.description,
          totalUnits: body.totalUnits,
          propertyId: propertyId,
        },
      });
      for (let i = 0; i < urlImages.length; i++) {
        await tx.roomImage.create({
          data: {
            roomId: room.id,
            urlImages: uploadedImageUrls[i],
            isCover: i === 0,
          },
        });
      }
      return await tx.room.findUnique({
        where: { id: room.id },
        include: {
          roomImages: true,
        },
      });
    });
  };

  updateRoom = async (
    id: number,
    authUserId: number,
    body: Partial<UpdateRoomDTO>
  ) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { property: true },
    });
    if (!room) {
      throw new ApiError("Room not found", 404);
    }
    if (room.property.tenantId !== tenant.id) {
      throw new ApiError("Unauthorized", 403);
    }
    const activeBookingsCount = await this.prisma.transaction.count({
      where: {
        roomId: id,
        deletedAt: null,
        status: {
          in: ["WAITING_FOR_PAYMENT", "WAITING_FOR_CONFIRMATION", "CONFIRMED"],
        },
      },
    });

    if (
      body.totalUnits !== undefined &&
      body.totalUnits < activeBookingsCount
    ) {
      throw new ApiError(
        "Total units cannot be less than existing active bookings",
        400
      );
    }

    const roomData: any = {};
    if (body.name !== undefined) roomData.name = body.name;
    if (body.basePrice !== undefined) roomData.basePrice = body.basePrice;
    if (body.totalGuests !== undefined) roomData.totalGuests = body.totalGuests;
    if (body.description !== undefined) roomData.description = body.description;
    if (body.totalUnits !== undefined) roomData.totalUnits = body.totalUnits;

    const updatedRoom = await this.prisma.room.update({
      where: { id },
      data: roomData,
    });
    return updatedRoom;
  };

  deleteRoom = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: {
        property: true,
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
        roomImages: true,
      },
    });
    if (!room) {
      throw new ApiError("room not found", 404);
    }
    if (room.property.tenantId !== tenant.id) {
      throw new ApiError("Forbidden", 403);
    }

    if (room.property.propertyStatus === PropertyStatus.PUBLISHED) {
      const roomsCount = await this.prisma.room.count({
        where: { propertyId: room.propertyId, deletedAt: null },
      });
      if (roomsCount <= 1) {
        throw new ApiError(
          "Cannot delete. Published property must have at least one room",
          400
        );
      }
    }

    if (room.transactions.length > 0) {
      throw new ApiError("Cannot delete room with active bookings", 400);
    }

    await this.prisma.$transaction([
      this.prisma.room.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.roomImage.updateMany({
        where: { roomId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
      this.prisma.seasonalRate.updateMany({
        where: { roomId: id, propertyId: null, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
      this.prisma.roomNonAvailability.updateMany({
        where: { roomId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    ]);
    return { message: "Room deleted successfully" };
  };
}
