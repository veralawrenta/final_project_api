import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { getTodayDateOnly, formattedDate } from "../../utils/date.utils";
import { RedisService } from "../redis/redis.service";
import { PaginationQueryParams } from "../pagination/dto/pagination.dto";
import {
  CreateRoomNonAvailabilityDTO,
  GetRoomNonAvailabilitiesByTenant,
  UpdateRoomNonAvailabilityDTO,
} from "./dto/roomNonAvailability";

export class RoomNonAvailabilityService {
  private prisma: PrismaClient;
  private redis: RedisService;

  constructor() {
    this.prisma = prisma;
    this.redis = new RedisService();
  }

  private invalidatePropertySearchCache = async (propertyId: number) => {
    // Search results depend on maintenance availability
    await this.redis.delByPrefix("property:search:");
    // Calendar cache is per property
    await this.redis.delByPrefix(`property:calendar30:${propertyId}:`);
  };

  createRoomNonAvailability = async (
    tenantId: number,
    roomId: number,
    body: CreateRoomNonAvailabilityDTO
  ) => {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, property: { tenantId }, deletedAt: null },
      include: { property: true },
    });
    if (!room) {
      throw new ApiError("Room not found", 400);
    }
    const startDate = formattedDate(body.startDate);
    const endDate = formattedDate(body.endDate);
    const today = getTodayDateOnly();

    if (startDate < today || endDate < today) {
      throw new ApiError("Start date and end date cannot be in the past", 400);
    }
    if (startDate == null || endDate == null) {
      throw new ApiError("Invalid date format", 400);
    }
    if (startDate >= endDate) {
      throw new ApiError("End date must be after start Date", 400);
    }

    if (body.roomInventory <= 0) {
      throw new ApiError("Room inventory must be greater than zero", 400);
    }
    if (body.roomInventory > room.totalUnits) {
      throw new ApiError("Maintenance block exceeds the total units", 400);
    }

    const overlapNonAvailability =
      await this.prisma.roomNonAvailability.findFirst({
        where: {
          roomId,
          startDate: { lte: endDate },
          endDate: { gte: startDate },
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
        startDate,
        endDate,
        reason: body.reason,
        roomInventory: body.roomInventory,
      },
    });
    await this.invalidatePropertySearchCache(room.property.id);
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
    }
    const startDate = body.startDate
      ? formattedDate(body.startDate)
      : maintenanceBlock.startDate;
    const endDate = body.endDate
      ? formattedDate(body.endDate)
      : maintenanceBlock.endDate;

    const roomInventory =
      body.roomInventory ??
      maintenanceBlock.roomInventory ??
      maintenanceBlock.room.totalUnits;

    if (startDate >= endDate) {
      throw new ApiError("End date must be after start Date", 400);
    }

    if (roomInventory <= 0) {
      throw new ApiError("Room inventory must be greater than zero", 400);
    }
    if (roomInventory > maintenanceBlock.room.totalUnits) {
      throw new ApiError("Maintenance block exceeds the total units", 400);
    }

    const overlapMaintenance = await this.prisma.roomNonAvailability.findFirst({
      where: {
        roomId: maintenanceBlock.roomId,
        id: { not: id },
        deletedAt: null,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        reason: body.reason || maintenanceBlock.reason,
      },
    });
    if (overlapMaintenance) {
      throw new ApiError(
        "Maintenance already schedule for this date range",
        400
      );
    }
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
    await this.invalidatePropertySearchCache(maintenanceBlock.room.property.id);
    return updatedRoomNonAvailability;
  };

  deleteroomNonAvailability = async (id: number, tenantId: number) => {
    const maintenance = await this.prisma.roomNonAvailability.findFirst({
      where: { id, deletedAt: null },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });
    if (!maintenance) {
      throw new ApiError("Room non-availability not found", 404);
    }
    if (maintenance.room.property.tenantId !== tenantId) {
      throw new ApiError("Forbidden", 403);
    }

    const deletedMaintenance = await this.prisma.roomNonAvailability.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    await this.invalidatePropertySearchCache(maintenance.room.property.id);
    return deletedMaintenance;
  };

  getAllRoomNonAvailabilitiesByTenant = async (
    tenantId: number,
    query: GetRoomNonAvailabilitiesByTenant
  ) => {
    const { page, take, sortBy, sortOrder, search } = query;
    const whereClause: Prisma.RoomNonAvailabilityWhereInput = {
      deletedAt: null,
      room: {
        property: {
          tenantId,
          deletedAt: null,
        },
      },
    };

    if (search) {
      whereClause.reason = { contains: search, mode: "insensitive" };
    }

    const maintenances = await this.prisma.roomNonAvailability.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        room: {
          include: {
            property: true,
            roomImages: true,
            seasonalRates: true,
          },
        },
      },
    });

    const count = await this.prisma.roomNonAvailability.count({
      where: whereClause,
    });

    return {
      data: maintenances,
      meta: { page, take, total: count },
    };
  };

  getAllRoomNonAvailabilitiesByRoom = async (
    tenantId: number,
    roomId: number
  ) => {
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
