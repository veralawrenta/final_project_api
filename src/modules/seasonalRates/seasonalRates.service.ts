import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import {
  getTodayDateOnly,
  formattedDate,
} from "../../utils/date.utils";
import { RedisService } from "../redis/redis.service";
import {
  CreateSeasonalRatesDTO,
  GetSeasonalRatesDTO,
  UpdateSeasonalRatesDTO,
} from "./dto/seasonalRates.dto";

export class SeasonalRatesService {
  private prisma: PrismaClient;
  private redis: RedisService;

  constructor() {
    this.prisma = prisma;
    this.redis = new RedisService();
  }

  private invalidatePropertySearchCache = async (propertyId: number) => {
    // Search results depend on seasonal pricing and availability
    await this.redis.delByPrefix("property:search:");
    // Calendar cache is per property
    await this.redis.delByPrefix(`property:calendar30:${propertyId}:`);
  };

  createSeasonalRate = async (
    tenantId: number,
    roomId: number,
    body: CreateSeasonalRatesDTO
  ) => {
    const startDate = formattedDate(body.startDate);
    const endDate = formattedDate(body.endDate);

    if (startDate > endDate) {
      throw new ApiError("Invalid date range", 400);
    }

    if (body.fixedPrice <= 0) {
      throw new ApiError("Fixed price must be greater than 0", 400);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const room = await this.prisma.room.findFirst({
        where: { id: roomId, property: { tenantId }, deletedAt: null },
        include: { property: true },
      });
      if (!room) {
        throw new ApiError("Room not found", 404);
      }

      const overlapRate = await this.prisma.seasonalRate.findFirst({
        where: {
          roomId,
          deletedAt: null,
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });
      if (overlapRate) {
        throw new ApiError("Seasonal rate overlaps existing rate", 400);
      }

      const seasonalRate = await tx.seasonalRate.create({
        data: {
          roomId,
          name: body.name,
          startDate,
          endDate,
          fixedPrice: body.fixedPrice,
        },
      });
      return { seasonalRate, propertyId: room.property.id };
    });
    await this.invalidatePropertySearchCache(created.propertyId);
    return created.seasonalRate;
  };

  getAllSeasonalRatesByTenant = async (
    tenantId: number,
    query: GetSeasonalRatesDTO
  ) => {
    const { page, take, sortBy, sortOrder } = query;
    const whereClause: Prisma.SeasonalRateWhereInput = {
      room: {
        deletedAt: null,
        property: {
          tenantId,
          deletedAt: null,
        },
      },
    };
    const seasonalRates = await this.prisma.seasonalRate.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        room: {
          include: {
            property: true,
            roomImages: true,
            roomNonAvailability: true,
          },
        },
      },
    });
    const count = await this.prisma.seasonalRate.count({
      where: whereClause,
    });

    return {
      data: seasonalRates,
      meta: { page, take, total: count },
    };
  };

  updateSeasonalRate = async (
    id: number,
    tenantId: number,
    body: UpdateSeasonalRatesDTO
  ) => {
    const updated = await this.prisma.$transaction(async (tx) => {
      const seasonalRate = await this.prisma.seasonalRate.findUnique({
        where: { id },
        include: {
          room: {
            include: {
              property: true,
            },
          },
        },
      });
      if (!seasonalRate) {
        throw new ApiError("Seasonal rate not found", 404);
      }
      if (seasonalRate.room.property.tenantId !== tenantId) {
        throw new ApiError("Unauthorized to update this seasonal rate", 403);
      }

      const today = getTodayDateOnly();

      if (seasonalRate.startDate < today) {
        throw new ApiError(
          "Cannot edit a seasonal rate that has already started",
          400
        );
      }
      const startDate = body.startDate
        ? formattedDate(body.startDate)
        : seasonalRate.startDate;
      const endDate = body.endDate
        ? formattedDate(body.endDate)
        : seasonalRate.endDate;
      if (startDate > endDate) {
        throw new ApiError("Invalid date range", 400);
      }

      if (body.fixedPrice !== undefined && body.fixedPrice <= 0) {
        throw new ApiError("Fixed price must be greater than 0", 400);
      }
      const overlapRate = await this.prisma.seasonalRate.findFirst({
        where: {
          id: { not: id },
          roomId: seasonalRate.roomId,
          deletedAt: null,
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });
      if (overlapRate)
        throw new ApiError("Seasonal rate overlaps existing rate", 400);

      const updatedSeasonalRate = await this.prisma.seasonalRate.update({
        where: { id },
        data: {
          name: body.name ?? seasonalRate.name,
          startDate: startDate,
          endDate: endDate,
          fixedPrice: body.fixedPrice ?? seasonalRate.fixedPrice,
        },
      });
      return { updatedSeasonalRate, propertyId: seasonalRate.room.property.id };
    });
    await this.invalidatePropertySearchCache(updated.propertyId);
    return updated.updatedSeasonalRate;
  };

  deleteSeasonalRate = async (id: number, tenantId: number) => {
    const seasonalRate = await this.prisma.seasonalRate.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            property: true,
            roomNonAvailability: true,
            roomImages: true,
          },
        },
      },
    });
    if (!seasonalRate) {
      throw new ApiError("Seasonal rate not found", 404);
    }
    if (seasonalRate.room.property.tenantId !== tenantId) {
      throw new ApiError("Unauthorized to delete this seasonal rate", 403);
    }

    const today = getTodayDateOnly();

    if (seasonalRate.startDate <= today && seasonalRate.endDate >= today) {
      throw new ApiError(
        "Cannot delete an active seasonal rate. Please end it by updating the end date.",
        400
      );
    }

    await this.prisma.seasonalRate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.invalidatePropertySearchCache(seasonalRate.room.property.id);
    return { message: "Seasonal rate deleted successfully" };
  };
}
