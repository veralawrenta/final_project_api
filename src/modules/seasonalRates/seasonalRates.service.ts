import {
  Prisma,
  PrismaClient,
  PropertyStatus,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { getTodayDateOnly, formattedDate } from "../../utils/date.utils";
import { RedisService } from "../redis/redis.service";
import { TenantService } from "../tenant/resolve-tenant";
import {
  CreateSeasonalRatesDTO,
  GetSeasonalRatesDTO,
  UpdateSeasonalRatesDTO,
} from "./dto/seasonalRates.dto";

export class SeasonalRatesService {
  private prisma: PrismaClient;
  tenantService : TenantService;
  private redis: RedisService;

  constructor() {
    this.prisma = prisma;
    this.tenantService = new TenantService();
    this.redis = new RedisService();
  }

  private invalidatePropertySearchCache = async (propertyId: number) => {
    // Search results depend on seasonal pricing and availability
    await this.redis.delByPrefix("property:search:");
    // Calendar cache is per property
    await this.redis.delByPrefix(`property:calendar30:${propertyId}:`);
  };

  createSeasonalRate = async (
    authUserId: number,
    body: CreateSeasonalRatesDTO
  ) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);

    const startDate = formattedDate(body.startDate);
    const endDate = formattedDate(body.endDate);

    if (startDate > endDate) {
      throw new ApiError("Invalid date range", 400);
    }

    if (body.fixedPrice <= 0) {
      throw new ApiError("Fixed price must be greater than 0", 400);
    }
    if (body.roomId && body.propertyId) {
      throw new ApiError(
        "Cannot apply seasonal rate to both room and property",
        400
      );
    }

    if (!body.roomId && !body.propertyId) {
      throw new ApiError("Must specify either roomId or propertyId", 400);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      let propertyId: number;
      let overlapWhere: Prisma.SeasonalRateWhereInput;

      if (body.roomId) {
        const room = await tx.room.findFirst({
          where: {
            id: body.roomId,
            property: { tenantId: tenant.id },
            deletedAt: null,
          },
          include: { property: true },
        });
        if (!room) {
          throw new ApiError("Room not found", 404);
        }
        if (room.property.propertyStatus !== PropertyStatus.PUBLISHED) {
          throw new ApiError(
            "You cannot apply seasonal rate for unpublished property",
            400
          );
        }

        propertyId = room.property.id;
        overlapWhere = { roomId: body.roomId };
      } else {
        const property = await tx.property.findFirst({
          where: { id: body.propertyId, tenantId: tenant.id, deletedAt: null },
        });
        if (!property) {
          throw new ApiError("Property not found", 404);
        }
        if (property.propertyStatus !== PropertyStatus.PUBLISHED) {
          throw new ApiError(
            "You cannot apply seasonal rate for unpublished property",
            400
          );
        }

        propertyId = property.id;
        overlapWhere = { propertyId: body.propertyId };
      }
      const overlapRate = await tx.seasonalRate.findFirst({
        where: {
          ...overlapWhere,
          deletedAt: null,
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });

      if (overlapRate) {
        throw new ApiError("Seasonal rate overlaps with existing rate", 400);
      }

      const seasonalRate = await tx.seasonalRate.create({
        data: {
          name: body.name,
          startDate,
          endDate,
          fixedPrice: body.fixedPrice,
          roomId: body.roomId ?? null,
          propertyId: body.propertyId ?? null,
        },
      });

      return { seasonalRate, propertyId };
    });

    await this.invalidatePropertySearchCache(created.propertyId);
    return created.seasonalRate;
  };

  getAllSeasonalRatesByTenant = async (
    authUserId: number,
    query: GetSeasonalRatesDTO
  ) => {
    const { page, take, sortBy, sortOrder, search } = query;
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);

    const whereClause: Prisma.SeasonalRateWhereInput = {
      deletedAt: null,
      OR: [
        {
          room: {
            deletedAt: null,
            property: {
              tenantId: tenant.id,
              deletedAt: null,
            },
          },
        },
        {
          property: {
            tenantId: tenant.id,
            deletedAt: null,
          },
        },
      ],
    };

    if (search) {
      whereClause.OR = [
        {
          name: { contains: search, mode: "insensitive" },
        },
        {
          property: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    let orderBy: Prisma.SeasonalRateOrderByWithRelationInput;

    if (sortBy === "propertyName") {
      orderBy = { property: { name: sortOrder } };
    } else if (sortBy === "roomName") {
      orderBy = { room: { name: sortOrder } };
    } else if (
      sortBy === "name" ||
      sortBy === "fixedPrice" ||
      sortBy === "createdAt"
    ) {
      orderBy = { [sortBy]: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    const seasonalRates = await this.prisma.seasonalRate.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        room: {
          include: {
            property: true,
          },
        },
        property: true,
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

  getSeasonalRateById = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);

    const seasonalRate = await this.prisma.seasonalRate.findFirst({
      where: { id, deletedAt: null },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            totalUnits: true,
            totalGuests: true,
            property: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            category: true,
            tenantId: true,
          },
        },
      },
    });
    if (!seasonalRate) {
      throw new ApiError("Seasonal rate not found", 404);
    }

    const ownerTenantId =
      seasonalRate.room?.property?.tenantId || seasonalRate.property?.tenantId;
    if (ownerTenantId !== tenant.id) {
      throw new ApiError("Unauthorized to view this seasonal rate ID", 403);
    }

    return seasonalRate;
  };

  updateSeasonalRate = async (
    id: number,
    authUserId: number,
    body: UpdateSeasonalRatesDTO
  ) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const seasonalRate = await this.prisma.seasonalRate.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            property: true,
          },
        },
        property: true,
      },
    });

    if (!seasonalRate) {
      throw new ApiError("Seasonal rate not found", 404);
    }
    const ownerTenantId =
      seasonalRate.room?.property.tenantId || seasonalRate.property?.tenantId;
    if (ownerTenantId !== tenant.id) {
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

    const overlapWhere = seasonalRate.roomId
      ? { roomId: seasonalRate.roomId }
      : { propertyId: seasonalRate.propertyId };

    const overlapRate = await this.prisma.seasonalRate.findFirst({
      where: {
        id: { not: id },
        ...overlapWhere,
        deletedAt: null,
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    });

    if (overlapRate) {
      throw new ApiError("Seasonal rate overlaps with existing rate", 400);
    }

    const updatedSeasonalRate = await this.prisma.seasonalRate.update({
      where: { id },
      data: {
        name: body.name ?? seasonalRate.name,
        startDate: startDate,
        endDate: endDate,
        fixedPrice: body.fixedPrice ?? seasonalRate.fixedPrice,
      },
    });

    const propertyId =
      seasonalRate.room?.property.id || seasonalRate.property!.id;

    await this.invalidatePropertySearchCache(propertyId);
    return updatedSeasonalRate;
  };

  deleteSeasonalRate = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);

    const seasonalRate = await this.prisma.seasonalRate.findUnique({
      where: { id },
      include: {
        room: {
          include: {
            property: true,
          },
        },
        property: true,
      },
    });

    if (!seasonalRate) {
      throw new ApiError("Seasonal rate not found", 404);
    }

    // Check ownership
    const ownerTenantId =
      seasonalRate.room?.property.tenantId || seasonalRate.property?.tenantId;
    if (ownerTenantId !== tenant.id) {
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

    const propertyId =
      seasonalRate.room?.property.id || seasonalRate.property!.id;
    await this.invalidatePropertySearchCache(propertyId);

    return { message: "Seasonal rate deleted successfully" };
  };
}
