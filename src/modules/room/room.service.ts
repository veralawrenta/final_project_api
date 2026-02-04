import { Prisma, PrismaClient, PropertyStatus } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { formattedDate } from "../../utils/date.utils";
import { CreateRoomDTO, GetAllRoomsDTO, UpdateRoomDTO } from "./dto/room.dto";

export class RoomService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  };

getAllAvailableRooms = async (
  propertyId: number,
  checkIn?: string,
  checkOut?: string
) => {

  const rooms = await this.prisma.room.findMany({
    where: {
      propertyId,
      deletedAt: null,
      property: {
        propertyStatus: PropertyStatus.PUBLISHED
      },
    },
    include: {
      roomImages: true,
      roomNonAvailability: true,
      seasonalRates: true,
      transactions: {
        where: {
          status: {
            in: ["WAITING_FOR_PAYMENT", "WAITING_FOR_CONFIRMATION", "CONFIRMED"],
          },
        },
      },
    },
  });

  if (!checkIn || !checkOut) {
    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      basePrice: room.basePrice,
      displayPrice: room.basePrice,
      totalGuests: room.totalGuests,
      roomImages: room.roomImages,
      isAvailable: true,
    }));
  }

  const checkInDate = formattedDate(checkIn);
  const checkOutDate = formattedDate(checkOut);
  return rooms.map((room) => {
    let isAvailable = true;
    let displayPrice = room.basePrice;

    for (const booking of room.transactions) {
      const bookingStart = new Date(booking.checkIn);
      const bookingEnd = new Date(booking.checkOut);
      
      if (checkInDate < bookingEnd && checkOutDate > bookingStart) {
        isAvailable = false;
        break;
      }
    }
    if (isAvailable) {
      for (const block of room.roomNonAvailability) {
        const blockStart = new Date(block.startDate);
        const blockEnd = new Date(block.endDate);
        
        if (checkInDate < blockEnd && checkOutDate > blockStart) {
          isAvailable = false;
          break;
        }
      }
    }
    for (const seasonal of room.seasonalRates) {
      const seasonStart = new Date(seasonal.startDate);
      const seasonEnd = new Date(seasonal.endDate);
      
      if (checkInDate < seasonEnd && checkOutDate > seasonStart) {
        displayPrice = seasonal.fixedPrice;
        break;
      }
    }

    return {
      id: room.id,
      name: room.name,
      basePrice: room.basePrice,
      displayPrice: displayPrice,
      totalGuests: room.totalGuests,
      isAvailable: isAvailable,
      roomImages: room.roomImages.map((img) => ({
        imageUrl: img.urlImages,
        isCover: img.isCover,
      })),
    };
  });
};
  

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
        roomImages: true,
        roomNonAvailability: true,
        seasonalRates: true,
        transactions: {
          select: {
            checkIn: true,
            checkOut: true,
          },
        },
      },
    });
  };

  getAllRoomsByTenant = async (
    tenantId: number,
    query: GetAllRoomsDTO
  ) => {
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
        roomImages: true,
        roomNonAvailability: true,
        seasonalRates: true,
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
        roomImages: true,
        roomNonAvailability: true,
        seasonalRates: true,
      },
    });
    return room;
  };

  createRoom = async (
    tenantId: number,
    propertyId: number,
    body: CreateRoomDTO
  ) => {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found ", 404);
    };

    const existingRoom = await this.prisma.room.findFirst({
      where: { name: body.name, propertyId: propertyId, deletedAt: null },
    });

    if (existingRoom) {
      throw new ApiError(
        "Room with the same name already exists in this property",
        400
      );
    }

    const room = await this.prisma.room.create({
      data: {
        name: body.name,
        basePrice: body.basePrice,
        totalGuests: body.totalGuests,
        description: body.description,
        totalUnits: body.totalUnits,
        propertyId: propertyId,
      },
    });
    return room;
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

    if (body.totalUnits !== undefined && body.totalUnits < activeBookingsCount) {
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
    if (body.totalUnits !== undefined) roomData.totalUnit = body.totalUnits;

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
