import {
  Prisma,
  PrismaClient,
  PropertyStatus,
} from "../../../generated/prisma/client";
import { CloudinaryService } from "../../cloudinary/cloudinary.service";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { CreateRoomDTO, GetAllRoomsDTO, UpdateRoomDTO } from "./dto/room.dto";

export class RoomService {
  private prisma: PrismaClient;
  cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = prisma;
    this.cloudinaryService = new CloudinaryService();
  }

  getAllRoomsByProperty = async (tenantId: number, propertyId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId, deletedAt: null },
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

  getAllRoomsByTenant = async (tenantId: number, query: GetAllRoomsDTO) => {
    const { page, take, sortBy, sortOrder } = query;

    const whereClause: Prisma.RoomWhereInput = {
      deletedAt: null,
      property: {
        tenantId,
        deletedAt: null,
      },
    };

    const rooms = await this.prisma.room.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
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
      where: { id, deletedAt: null },
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
      },
    });
    return room;
  };

  createRoom = async (
    tenantId: number,
    propertyId: number,
    body: CreateRoomDTO,
    urlImages : Express.Multer.File[],
  ) => {
    return await this.prisma.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: { id: propertyId, tenantId, deletedAt: null },
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
      };

      if (!urlImages || urlImages.length === 0) { throw new ApiError ("At least one room image is required", 400)};

      const existingRoom = await tx.room.findFirst({
        where: { name: body.name, propertyId: propertyId, deletedAt: null },
      });
      if (existingRoom) {
        throw new ApiError(
          "Room with the same name already exists in this property",
          400
        );
      }
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
        const { secure_url } = await this.cloudinaryService.upload(urlImages[i]);
        await tx.roomImage.create({
          data: {
            roomId: room.id,
            urlImages: secure_url,
            isCover: i === 0,
          },
        });
      };
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
    tenantId: number,
    body: Partial<UpdateRoomDTO>
  ) => {
    const room = await this.prisma.room.findFirst({
      where: { id, deletedAt: null },
      include: { property: true },
    });
    if (!room) {
      throw new ApiError("Room not found", 404);
    }
    if (room.property.tenantId !== tenantId) {
      throw new ApiError("Forbidden", 403);
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

  deleteRoom = async (id: number, tenantId: number) => {
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
    if (room.property.tenantId !== tenantId) {
      throw new ApiError("Forbidden", 403);
    }

    if (room.property.propertyStatus === PropertyStatus.PUBLISHED) {
      const roomsCount = await this.prisma.room.count({
        where: { propertyId: room.propertyId, deletedAt: null },
      });
      if (roomsCount <= 1) {
        throw new ApiError(
          "Published property must have at least one room",
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
        where: { roomId: id },
        data: { deletedAt: new Date() },
      }),
      /*this.prisma.seasonalRate.updateMany({
        where: { roomId: id },
        data: { deletedAt: new Date() },
      }),*/
      this.prisma.roomNonAvailability.updateMany({
        where: { roomId: id },
        data: { deletedAt: new Date() },
      }),
    ]);
    return { message: "Room deleted successfully" };
  };
}
