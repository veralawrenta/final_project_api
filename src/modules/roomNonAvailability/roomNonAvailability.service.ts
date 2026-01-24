import { PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import {
  CreateRoomNonAvailabilityDTO,
  UpdateRoomNonAvailabilityDTO,
} from "./dto/roomNonAvailability";

export class RoomNonAvailabilityService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  createRoomNonAvailability = async (
    tenantId: number,
    roomId: number,
    body: CreateRoomNonAvailabilityDTO
  ) => {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, property: { tenantId }, deletedAt: null },
    });
    if (!room) {
      throw new ApiError("Room not found", 400);
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (startDate >= endDate) {
      throw new ApiError("End date must be after start Date", 400);
    }
    if (body.roomInventory > room.totalUnit) {
      throw new ApiError("Maintenance block exceeds the total units", 400);
    }

    const overlapNonAvailability =
      await this.prisma.roomNonAvailability.findFirst({
        where: {
          roomId: roomId,
          startDate: { lte: body.startDate },
          endDate: { gte: body.endDate },
          deletedAt: null,
        },
      });
    if (overlapNonAvailability) {
      throw new ApiError(
        "Maintenance already scheduled for the given dates",
        400
      );
    }
    const roomNonAvailability = await this.prisma.roomNonAvailability.create({
      data: {
        roomId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason,
        roomInventory: body.roomInventory,
      },
    });
    return roomNonAvailability;
  };

  updateRoomNonAvailability = async (
    id: number,
    tenantId: number,
    body: Partial<UpdateRoomNonAvailabilityDTO>
  ) => {
    const maintenanceBlock = await this.prisma.roomNonAvailability.findFirst({
      where: { id, deletedAt: null },
      include: { room: { include: { property: true } } },
    });
    if (!maintenanceBlock) {
      throw new ApiError("Room non-availability not found", 404);
    }
    if (maintenanceBlock.room.property.tenantId !== tenantId) {
      throw new ApiError("Forbidden", 403);
    };
    const startDate = body.startDate
      ? new Date(body.startDate)
      : maintenanceBlock.startDate;
    const endDate = body.endDate
      ? new Date(body.endDate)
      : maintenanceBlock.endDate;
    const roomInventory = body.roomInventory ?? maintenanceBlock.roomInventory;

    if (startDate >= endDate) {
      throw new ApiError("End date must be after start Date", 400);
    };
    if (roomInventory > maintenanceBlock.room.totalUnit) {
      throw new ApiError("Maintenance block exceeds the total units", 400);
    };

    const overlapMaintenance = await this.prisma.roomNonAvailability.findFirst({
      where: {
        roomId: maintenanceBlock.roomId,
        id: { not: id },
        deletedAt: null,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
    if (overlapMaintenance) {
      throw new ApiError(
        "Maintenance already schedule for this date range",
        400
      );
    };
    const updatedRoomNonAvailability =
      await this.prisma.roomNonAvailability.update({
        where: { id },
        data: {
          startDate,
          endDate,
          reason: body.reason,
          roomInventory,
        },
      });
    return updatedRoomNonAvailability;
  };

  deleteroomNonAvailability = async (id: number, tenantId: number) => {
    const maintenance = await this.prisma.roomNonAvailability.findFirst({
      where : { id, deletedAt: null },
      include: {
        room: {
          include: {
            property : true,
          },
        },
      },
    });
    if (!maintenance) { throw new ApiError ("Room non-availability not found", 404)};
    if (maintenance.room.property.tenantId !== tenantId) { throw new ApiError ("Forbidden", 403)};
    
    const deletedMaintenance = await this.prisma.roomNonAvailability.update({
      where : { id },
      data : {
        deletedAt : new Date (),
      },
    });
    return deletedMaintenance;
  };

  getAllRoomNonAvailabilitiesByTenant = async (tenantId: number) => {
    const maintenances = await this.prisma.roomNonAvailability.findMany({
      where: {
        deletedAt: null,
        room: {
          property: {
            tenantId: tenantId,
            deletedAt: null,
          },
        },
      },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });
    return maintenances;
  };

  getAllRoomNonAvailabilitiesByRoom = async (tenantId: number, roomId: number) => {
    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        deletedAt: null,
        property: {
          tenantId,
          deletedAt: null,
        },
      },
    });
  
    if (!room) {
      throw new ApiError("Room not found or you are not the owner", 404);
    }
  
    const maintenances = await this.prisma.roomNonAvailability.findMany({
      where: {
        roomId,
        deletedAt: null,
      },
      orderBy: {
        startDate: "asc",
      },
    });
  
    return maintenances;
  };
  
}
