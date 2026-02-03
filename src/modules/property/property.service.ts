import {
  Prisma,
  PrismaClient,
  PropertyStatus,
} from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import {
  formattedDate,
  getTodayDateOnly,
  toDateOnlyString,
} from "../../utils/date.utils";
import { RedisService } from "../redis/redis.service";
import crypto from "node:crypto";
import {
  CreatePropertyDTO,
  GetAllPropertiesDTO,
  GetPropertyAvailabilityQueryDTO,
  GetSearchAvailablePropertiesDTO,
  UpdatePropertyDTO,
} from "./dto/property.dto";
import { AmenityService } from "../amenity/amenity.service";

export class PropertyService {
  private prisma: PrismaClient;
  private amenityService: AmenityService;
  private redis: RedisService;

  constructor() {
    this.prisma = prisma;
    this.amenityService = new AmenityService();
    this.redis = new RedisService();
  }

  private SEARCH_CACHE_TTL_SECONDS = 60;
  private CALENDAR_CACHE_TTL_SECONDS = 300;

  private buildCacheKey = (prefix: string, params: Record<string, unknown>) => {
    const entries = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .sort(([a], [b]) => a.localeCompare(b));
    const raw = entries.map(([k, v]) => `${k}=${String(v)}`).join("&");
    const hash = crypto.createHash("sha1").update(raw).digest("hex");
    return `${prefix}:${hash}`;
  };

  getAllProperties = async (query: GetAllPropertiesDTO) => {
    const { page, take, sortBy, sortOrder, search, propertyType } = query;

    const whereClause: Prisma.PropertyWhereInput = {
      propertyStatus: PropertyStatus.PUBLISHED,
      deletedAt: null,
    };

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    if (propertyType) {
      whereClause.propertyType = propertyType;
    }

    let orderBy: any;
    if (sortBy === "price") {
      orderBy = { name: sortOrder };
    } else {
      orderBy = { [sortBy]: sortOrder }
    }

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        propertyImages: true,
        amenities: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        category: true,
        rooms: {
          where : { deletedAt: null },
          select: {
            id: true,
            basePrice: true,
            totalGuests: true,
            totalUnits: true,
          },
        },
      },
    });
    // calculating displayPrice for each property
    const propertiesWithPrice = properties.map((property) => {
      const displayPrice = property.rooms.length > 0 ? Math.min(...property.rooms.map((r)=> r.basePrice)) : 0
    return {
      ...property,
      displayPrice,
    };
    });

    let sortedProperties = propertiesWithPrice;
    if (sortBy === "price") {
      sortedProperties = propertiesWithPrice.sort((a , b) => { return sortOrder === "asc" ? a.displayPrice - b.displayPrice : b.displayPrice - a.displayPrice});
    };
    const count = await this.prisma.property.count({
      where: whereClause,
    });
    return {
      data: sortedProperties,
      meta: { page, take, total: count },
    };
  };

  getSearchAvailableProperties = async (
    query: GetSearchAvailablePropertiesDTO
  ) => {
    const cacheKey = this.buildCacheKey(
      "property:search",
      query as unknown as Record<string, unknown>
    );
    const cached = await this.redis.getValue(cacheKey);
    if (cached) return JSON.parse(cached);

    const {
      cityId,
      checkIn,
      checkOut,
      totalGuests,
      sortBy,
      sortOrder,
      propertyType,
      search,
      page,
      take,
    } = query;

    const checkInDate = formattedDate(checkIn);
    const checkOutDate = formattedDate(checkOut);

    if (checkOutDate <= checkInDate) {
      throw new ApiError("Check-out date must be after check-in date", 400);
    }

    const whereClause: Prisma.PropertyWhereInput = {
      cityId,
      propertyStatus: PropertyStatus.PUBLISHED,
      deletedAt: null,
    };

    if (propertyType) whereClause.propertyType = propertyType;
    if (search) whereClause.name = { contains: search, mode: "insensitive" };

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      include: {
        propertyImages: { where: { deletedAt: null }, take: 1 },
        city: true,
        category: true,
        tenant: true,
        amenities: { where: { deletedAt: null }, select: { id: true, name: true, code: true } },
        rooms: {
          where: {
            deletedAt: null,
            totalGuests: { gte: totalGuests },
            roomNonAvailability: {
              none: {
                startDate: { lt: checkOutDate },
                endDate: { gt: checkInDate },
              },
            },
            transactions: {
              none: {
                deletedAt: null,
                status: {
                  in: [
                    "WAITING_FOR_PAYMENT",
                    "WAITING_FOR_CONFIRMATION",
                    "CONFIRMED",
                  ],
                },
                checkIn: { lt: checkOutDate },
                checkOut: { gt: checkInDate },
              },
            },
          },
          select: {
            id: true,
            basePrice: true,
            seasonalRates: {
              where: { deletedAt: null },
              select: {
                startDate: true,
                endDate: true,
                fixedPrice: true,
              },
            },
          },
        },
      },
    });

    type RoomWithPrice = {
      room: (typeof properties)[0]["rooms"][0];
      price: number;
      useSeasonalRate: boolean;
    };

    type PropertyWithPrice = (typeof properties)[0] & {
      displayPrice: number;
      availableRooms: RoomWithPrice[];
    };

    const results: PropertyWithPrice[] = [];

    for (const property of properties) {
      const availableRooms: RoomWithPrice[] = [];

      for (const room of property.rooms) {
        const seasonalRate = room.seasonalRates.find(
          (r) => checkInDate < r.endDate && checkOutDate > r.startDate
        );
        const price = seasonalRate ? seasonalRate.fixedPrice : room.basePrice;
        const useSeasonalRate = !!seasonalRate;
        availableRooms.push({ room, price, useSeasonalRate });
      }
      if (availableRooms.length === 0) continue;

      const displayPrice = Math.min(...availableRooms.map((r) => r.price));
      results.push({
        ...property,
        displayPrice,
        availableRooms,
      });
    }
    const sorted = [...results].sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return sortOrder === "asc"
        ? a.displayPrice - b.displayPrice
        : b.displayPrice - a.displayPrice;
    });

    const total = results.length;
    const paginated = results.slice((page - 1) * take, page * take);

    const response = {
      data: paginated,
      meta: { page, take, total },
    };
    await this.redis.setValue(
      cacheKey,
      JSON.stringify(response),
      this.SEARCH_CACHE_TTL_SECONDS
    );
    return response;
  };

  getPropertyByIdWithAvailability = async (
    id: number,
    query: GetPropertyAvailabilityQueryDTO
  ) => {
    const checkInDate = formattedDate(query.checkIn);
    const checkOutDate = formattedDate(query.checkOut);

    if (checkOutDate <= checkInDate) {
      throw new ApiError("Check-out date must be after check-in date", 400);
    }

    const property = await this.prisma.property.findUnique({
      where: { id, propertyStatus: PropertyStatus.PUBLISHED, deletedAt: null },
      include: {
        propertyImages: { where: { deletedAt: null } },
        amenities: { where: { deletedAt: null }, select: { id: true, name: true, code: true } },
        city: true,
        category: true,
        tenant: true,
        rooms: {
          where: {
            deletedAt: null,
          },
          include: {
            roomImages: { where: { deletedAt: null } },
            seasonalRates: { where: { deletedAt: null } },
            roomNonAvailability: { where: { deletedAt: null } },
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
          },
        },
      },
    });

    if (!property) {
      throw new ApiError("Property not found", 404);
    }

    const roomsWithAvailability = property.rooms.map((room) => {
      const meetsGuestRequirement = room.totalGuests >= query.totalGuests;
      const hasNonAvailability = room.roomNonAvailability.some(
        (na) => na.startDate < checkOutDate && na.endDate > checkInDate
      );

      const hasOverlappingBooking = room.transactions.some(
        (t) => t.checkIn < checkOutDate && t.checkOut > checkInDate
      );

      const isAvailable =
        meetsGuestRequirement && !hasNonAvailability && !hasOverlappingBooking;
      const seasonalRate = room.seasonalRates.find(
        (r) => checkInDate < r.endDate && checkOutDate > r.startDate
      );
      const displayPrice = seasonalRate
        ? seasonalRate.fixedPrice
        : room.basePrice;

      return {
        id: room.id,
        name: room.name,
        totalGuests: room.totalGuests,
        basePrice: room.basePrice,
        roomImages: room.roomImages,
        isAvailable,
        displayPrice,
        useSeasonalRate: !!seasonalRate,
      };
    });

    return {
      ...property,
      rooms: roomsWithAvailability,
      searchContext: {
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        totalGuests: query.totalGuests,
      },
    };
  };

  getAllPropertiesByTenant = async (
    tenantId: number,
    query: GetAllPropertiesDTO
  ) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.PropertyWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        category: true,
        city: true,
        propertyImages: true,
        amenities: {select: { id: true, name: true, code: true }},
        rooms: {
          include: {
            seasonalRates: true,
            roomImages: true,
            roomNonAvailability: true,
          },
        },
      },
    });
    if (properties.length === 0) {
      throw new ApiError("No properties found for this tenant", 400);
    }

    const count = await this.prisma.property.count({
      where: whereClause,
    });

    return {
      data: properties,
      meta: { page, take, total: count },
    };
  };

  get30DayPropertyCalendar = async (
    propertyId: number,
    startDateStr?: string
  ) => {
    const startKey = startDateStr ?? toDateOnlyString(getTodayDateOnly());
    const cacheKey = `property:calendar30:${propertyId}:${startKey}`;
    const cached = await this.redis.getValue(cacheKey);
    if (cached) return JSON.parse(cached);

    const startDate = startDateStr
      ? formattedDate(startDateStr)
      : getTodayDateOnly();

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId, deletedAt: null },
      include: {
        rooms: {
          where: { deletedAt: null },
          include: {
            seasonalRates: { where: { deletedAt: null } },
            roomNonAvailability: { where: { deletedAt: null } },
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
          },
        },
      },
    });

    if (!property) throw new ApiError("Property not found", 404);

    const calendar = [];

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setUTCDate(startDate.getUTCDate() + i);
      const nextDay = new Date(currentDate);
      nextDay.setUTCDate(currentDate.getUTCDate() + 1);

      const availableRoomPrices = property.rooms
        .filter((room) => {
          const hasNonAvailability = room.roomNonAvailability.some(
            (na) => na.startDate < nextDay && na.endDate > currentDate
          );
          const hasBooking = room.transactions.some(
            (t) => t.checkIn < nextDay && t.checkOut > currentDate
          );

          return !hasNonAvailability && !hasBooking;
        })
        .map((room) => {
          const seasonalRate = room.seasonalRates.find(
            (rate) =>
              currentDate >= rate.startDate && currentDate <= rate.endDate
          );

          return {
            roomId: room.id,
            roomName: room.name,
            price: seasonalRate ? seasonalRate.fixedPrice : room.basePrice,
            isSeasonalRate: !!seasonalRate,
          };
        });

      const lowestPrice =
        availableRoomPrices.length > 0
          ? Math.min(...availableRoomPrices.map((r) => r.price))
          : null;

      calendar.push({
        date: toDateOnlyString(currentDate),
        lowestPrice,
        availableRoomsCount: availableRoomPrices.length,
        roomPrices: availableRoomPrices,
      });
    }

    const response = {
      propertyId: property.id,
      propertyName: property.name,
      calendar,
    };
    await this.redis.setValue(
      cacheKey,
      JSON.stringify(response),
      this.CALENDAR_CACHE_TTL_SECONDS
    );
    return response;
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
    return this.prisma.$transaction(async (tx) => {
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
          propertyStatus: "DRAFT",
        },
      });
      if (body.amenities && body.amenities.length > 0) {
        await this.amenityService.syncAmenities(
          tx,
          createdProperty.id,
          body.amenities
        );
      }
      return createdProperty;
    });
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
    }

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
      where: { id, propertyStatus: PropertyStatus.PUBLISHED, deletedAt: null },
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
    return this.prisma.$transaction(async (tx) => {
      const propertyData: any = {};

      if (body.name !== undefined) propertyData.name = body.name;
      if (body.description !== undefined)
        propertyData.description = body.description;
      if (body.address !== undefined) propertyData.address = body.address;
      if (body.propertyType !== undefined)
        propertyData.propertyType = body.propertyType;
      if (body.cityId !== undefined) propertyData.cityId = body.cityId;
      if (body.categoryId !== undefined)
        propertyData.categoryId = body.categoryId;
      if (body.latitude !== undefined) propertyData.latitude = body.latitude;
      if (body.longitude !== undefined) propertyData.longitude = body.longitude;

      const updatedProperty = await this.prisma.property.update({
        where: { id },
        data: propertyData,
      });

      if (body.amenities && body.amenities.length > 0) {
        await this.amenityService.syncAmenities(tx, id, body.amenities);
      }
      return updatedProperty;
    });
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
      this.prisma.amenity.updateMany({
        where: {
          propertyId: id,
          deletedAt: null,
        },
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
      this.prisma.roomNonAvailability.updateMany({
        where: { room: { propertyId: id } },
        data: { deletedAt: new Date() },
      }),
    ]);
    return deletedProperty;
  };
}
