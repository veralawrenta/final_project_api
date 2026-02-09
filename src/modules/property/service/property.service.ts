import {
  Prisma,
  PrismaClient,
  PropertyStatus,
} from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../../utils/api-error";
import {
  formattedDate,
  getTodayDateOnly,
  toDateOnlyString,
} from "../../../utils/date.utils";
import { RedisService } from "../../redis/redis.service";
import crypto from "node:crypto";
import {
  GetAllPropertiesDTO,
  GetPropertyAvailabilityQueryDTO,
  GetSearchAvailablePropertiesDTO,
  UpdatePropertyDTO,
} from "../dto/property.dto";
import { AmenityService } from "../../amenity/amenity.service";
import { resolveTenantByUserId } from "../../services/shared/resolve-tenant";

export class PropertyService {
  private prisma: PrismaClient;
  private amenityService: AmenityService;
  private redis: RedisService;

  constructor() {
    this.prisma = prisma;
    this.amenityService = new AmenityService();
    this.redis = new RedisService();
  }
  //redis cache
  private SEARCH_CACHE_TTL_SECONDS = 60;
  private CALENDAR_CACHE_TTL_SECONDS = 300;
  private async invalidatePropertyCaches(propertyId: number) {
    await this.redis.delByPrefix("property:search:");
    await this.redis.delByPrefix(`property:calendar30:${propertyId}:`);
  }

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

    if (sortBy === "price") {
      const properties = await this.prisma.property.findMany({
        where: whereClause,
        include: {
          propertyImages: true,
          category: true,
          city: true,
          tenant: true,
          rooms: {
            where: { deletedAt: null },
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
        const rooms = property.rooms || [];
        const displayPrice =
          rooms.length > 0
            ? Math.min(...rooms.map((r) => r.basePrice))
            : Infinity;
        return { ...property, displayPrice };
      });
      propertiesWithPrice.sort((a, b) =>
        sortOrder === "asc"
          ? a.displayPrice - b.displayPrice
          : b.displayPrice - a.displayPrice
      );
      const start = (page - 1) * take;
      const end = start + take;
      return {
        data: propertiesWithPrice.slice(start, end),
        meta: {
          page,
          take,
          total: propertiesWithPrice.length,
        },
      };
    }
    const properties = await this.prisma.property.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take,
      include: {
        propertyImages: true,
        category: true,
        city: {
          select: {
            id: true,
            name: true,
          },
        },
        rooms: {
          where: { deletedAt: null },
          select: {
            id: true,
            basePrice: true,
            totalGuests: true,
            totalUnits: true,
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

  getSearchAvailableProperties = async (
    query: GetSearchAvailablePropertiesDTO
  ) => {
    const cacheKey = this.buildCacheKey(
      "property:search",
      query as unknown as Record<string, unknown>
    );
    const cached = await this.redis.getValue(cacheKey); //this to check if this search had been implemented before
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
    //for filtering and search purposes
    if (propertyType) whereClause.propertyType = propertyType;
    if (search) whereClause.name = { contains: search, mode: "insensitive" };

    const properties = await this.prisma.property.findMany({
      where: whereClause,
      include: {
        propertyImages: { where: { deletedAt: null }, take: 1 },
        city: true,
        category: true,
        tenant: true,
        amenities: { where: { deletedAt: null } },
        rooms: {
          where: {
            deletedAt: null,
            totalGuests: { gte: totalGuests },
            roomNonAvailability: {
              none: {
                deletedAt: null,
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

    const propertyIds = properties.map((p) => p.id);
    const propertySeasonalRates = await this.prisma.seasonalRate.findMany({
      where: {
        propertyId: { in: propertyIds },
        roomId: null,
        deletedAt: null,
        startDate: { lt: checkOutDate },
        endDate: { gt: checkInDate },
      },
      select: {
        propertyId: true,
        startDate: true,
        endDate: true,
        fixedPrice: true,
      },
    });
    //map all seasonal prices by property
    const propertyRatesMap = new Map<number, typeof propertySeasonalRates>();
    for (const rate of propertySeasonalRates) {
      if (!propertyRatesMap.has(rate.propertyId!)) {
        propertyRatesMap.set(rate.propertyId!, []);
      }
      propertyRatesMap.get(rate.propertyId!)!.push(rate);
    }
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
      const propertyRates = propertyRatesMap.get(property.id) || [];

      for (const room of property.rooms) {
        const roomSeasonalRate = room.seasonalRates.find(
          (r) => checkInDate < r.endDate && checkOutDate > r.startDate
        );
        const propertySeasonalRate = propertyRates.find(
          (r) => checkInDate < r.endDate && checkOutDate > r.startDate
        );
        //if any fixedrate, should prevail
        const effectiveRate = roomSeasonalRate || propertySeasonalRate;
        const price = effectiveRate ? effectiveRate.fixedPrice : room.basePrice;
        const useSeasonalRate = !!effectiveRate;
        availableRooms.push({ room, price, useSeasonalRate });
      }
      // check available rooms first, If no rooms work, throw the property away
      if (availableRooms.length === 0) continue;
      //then check the property price and find the cheapest
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
    const paginated = sorted.slice((page - 1) * take, page * take);

    const response = {
      data: paginated,
      meta: { page, take, total },
    };

    await this.redis.setValue(
      //requesting to memorize this requirement
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
        amenities: { where: { deletedAt: null }, select: {amenity: { select: {id: true, code: true, name:true}}}},
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

    const propertySeasonalRates = await this.prisma.seasonalRate.findMany({
      where: {
        id,
        propertyId: id,
        roomId: null,
        deletedAt: null,
        startDate: { lt: checkOutDate },
        endDate: { gt: checkInDate },
      },
    });

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
      const roomSeasonalRate = room.seasonalRates.find(
        (r) => checkInDate < r.endDate && checkOutDate > r.startDate
      );
      const propertySeasonalRate = propertySeasonalRates.find(
        (r) => checkInDate < r.endDate && checkOutDate > r.startDate
      );
      const effectiveSeasonalRate = roomSeasonalRate || propertySeasonalRate;
      //check the available room prices
      const displayPrice = isAvailable
        ? effectiveSeasonalRate
          ? effectiveSeasonalRate.fixedPrice
          : room.basePrice
        : null;

      return {
        id: room.id,
        name: room.name,
        totalGuests: room.totalGuests,
        basePrice: room.basePrice,
        roomImages: room.roomImages,
        isAvailable,
        displayPrice,
        useSeasonalRate: !!effectiveSeasonalRate,
      };
    });

    return {
      ...property,
      rooms: roomsWithAvailability,
      amenities: property.amenities.map((pa) => pa.amenity),
      searchContext: {
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        totalGuests: query.totalGuests,
      },
    };
  };

  getAllPropertiesByTenant = async (
    authUserId: number,
    query: GetAllPropertiesDTO
  ) => {
    const { page, take, sortBy, sortOrder, search } = query;
    const tenant = await resolveTenantByUserId(authUserId);

    const whereClause: Prisma.PropertyWhereInput = {
      tenantId: tenant.id,
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
      select: {
        id: true,
        name: true,
        propertyType: true,
        category: { select: { id: true, name: true } },
        city: { select: { id: true, name: true } },
        propertyStatus: true,
        propertyImages: { where: { deletedAt: null }, select: { id: true, urlImages: true, isCover: true }, orderBy: {isCover:"desc"}},
        rooms: {
          where: { deletedAt: null },
          select: {
            basePrice: true,
            totalUnits: true,
            totalGuests: true,
            roomImages: { where: { deletedAt: null }, select: { id: true } },
          },
        },
      },
    });
    if (properties.length === 0) {
      throw new ApiError("No properties found for this tenant", 400);
    }
    const data = properties.map((property) => {
      const hasPropertyImages = property.propertyImages.length > 0;

      const publishableRooms = property.rooms.filter(
        (room) =>
          room.roomImages.length > 0 &&
          room.basePrice > 0 &&
          room.totalUnits > 0
      );

      const lowestPrice =
        publishableRooms.length > 0
          ? Math.min(...publishableRooms.map((r) => r.basePrice))
          : null;

      return {
        id: property.id,
        name: property.name,
        city: property.city.name,
        category: property.category?.name ?? null,
        propertyType: property.propertyType,
        lowestPrice,
        totalRooms: property.rooms.length,
        propertyImages: property.propertyImages,
        status: property.propertyStatus
          /*hasPropertyImages && publishableRooms.length > 0
            ? "PUBLISHED"
            : "DRAFT",*/
      };
    });
    const count = await this.prisma.property.count({
      where: whereClause,
    });

    return {
      data,
      meta: { page, take, total: count },
    };
  };

  getPropertyId = async (id: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id, propertyStatus: PropertyStatus.PUBLISHED, deletedAt: null },
      include: {
        propertyImages: { where: { deletedAt: null } },
        amenities: {where: {deletedAt: null}, select: {amenity: {select: {id: true, code:true, name: true}}}},
        category: { where: { deletedAt: null } },
        city: true,
        tenant: true,
        rooms: {
          where: { deletedAt: null },
          include: {
            roomImages: { where: { deletedAt: null } },
          },
        },
      },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
    return property;
  };

  getPropertyIdByTenant = async (id: number, authUserId: number) => {
    const tenant = await resolveTenantByUserId(authUserId);

    const property = await this.prisma.property.findFirst({
      where: {
        id,
        tenantId: tenant.id,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        propertyType: true,
        address: true,
        propertyStatus: true,
        latitude: true,
        longitude: true,
        city: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        propertyImages: {
          where: { deletedAt: null },
          select: { id: true, urlImages: true, isCover: true },
        },
        amenities: {
          where: { deletedAt: null },
          include: {
            amenity: { select: { id: true, code: true, name: true } },
          },
        },
        rooms: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            basePrice: true,
            totalUnits: true,
            totalGuests: true,
            roomImages: {
              where: { deletedAt: null },
              select: { id: true, urlImages: true },
            },
            roomNonAvailability: {
              where: { deletedAt: null },
              select: {
                id: true,
                reason: true,
                startDate: true,
                endDate: true,
              },
            },
            seasonalRates: {
              where: { deletedAt: null, endDate: { gte: new Date() } },
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                fixedPrice: true,
              },
            },
          },
        },
      },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
    //check the checklist first of the property images, rooms (if there is at least one created), room images
    const hasPropertyImages = property.propertyImages.length > 0;
    const hasPublishableRoom = property.rooms.some(
      (room) =>
        room.roomImages.length > 0 &&
        room.basePrice > 0 &&
        room.totalUnits > 0 &&
        room.totalGuests > 0
    );
    const status =
      hasPropertyImages && hasPublishableRoom ? "PUBLISHED" : "DRAFT";
    //if draft that means no maintenance and seasonal rate prevails
    const hasMaintenance =
      status === "PUBLISHED" &&
      property.rooms.some((room) => room.roomNonAvailability.length > 0);
    const hasSeasonalRate =
      status === "PUBLISHED" &&
      property.rooms.some((room) => room.seasonalRates.length > 0);

    return {
      id: property.id,
      name: property.name,
      description: property.description,
      propertyType: property.propertyType,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      cityId: property.city.id,
      city: property.city.name,
      categoryId: property.category?.id,
      category : property.category?.name,
      status,
      hasPropertyImages,
      hasPublishableRoom,
      hasMaintenance,
      hasSeasonalRate,
      amenities: property.amenities.map((pa) => pa.amenity.code),
      rooms: property.rooms,
      images: property.propertyImages,
    };
  };

  get30DayPropertyCalendar = async (id: number, startDates?: string) => {
    const startKey = startDates ?? toDateOnlyString(getTodayDateOnly());
    const cacheKey = `property:calendar30:${id}:${startKey}`;
    const cached = await this.redis.getValue(cacheKey);
    if (cached) return JSON.parse(cached);

    const startDate = startDates
      ? formattedDate(startDates)
      : getTodayDateOnly();

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 29);

    const property = await this.prisma.property.findUnique({
      where: { id, deletedAt: null },
      include: {
        rooms: {
          where: { deletedAt: null },
          include: {
            seasonalRates: {
              where: {
                deletedAt: null,
                NOT: {
                  OR: [
                    { endDate: { lt: startDate } },
                    { startDate: { gt: endDate } },
                  ],
                },
              },
            },
            roomNonAvailability: {
              where: {
                deletedAt: null,
                NOT: {
                  OR: [
                    { endDate: { lt: startDate } },
                    { startDate: { gt: endDate } },
                  ],
                },
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
                NOT: {
                  OR: [
                    { checkOut: { lte: startDate } },
                    { checkIn: { gte: endDate } },
                  ],
                },
              },
            },
          },
        },
      },
    });

    if (!property) throw new ApiError("Property not found", 404);

    const propertySeasonalRates = await this.prisma.seasonalRate.findMany({
      where: {
        id,
        roomId: null, // Property-level only
        deletedAt: null,
        NOT: {
          OR: [{ endDate: { lt: startDate } }, { startDate: { gt: endDate } }],
        },
      },
    });

    const calendar = [];

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getUTCDate() + i);
      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getUTCDate() + 1);

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
          const roomSeasonalRate = room.seasonalRates
            .filter(
              (rate) =>
                currentDate >= rate.startDate && currentDate <= rate.endDate
            )
            .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];
          const propertySeasonalRate = propertySeasonalRates
            .filter(
              (rate) =>
                currentDate >= rate.startDate && currentDate <= rate.endDate
            )
            .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())[0];

          const effectiveRate = roomSeasonalRate || propertySeasonalRate;

          return {
            roomId: room.id,
            roomName: room.name,
            price: effectiveRate ? effectiveRate.fixedPrice : room.basePrice,
            isSeasonalRate: !!effectiveRate,
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

  updateProperty = async (
    id: number,
    authUserId: number,
    body: Partial<UpdatePropertyDTO>
  ) => {
    const tenant = await resolveTenantByUserId(authUserId);
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
      include: {
        propertyImages: true,
        city: true,
        category: true,
        tenant: true,
        amenities: true,
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

    if (property.tenantId !== tenant.id) {
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

      const updatedProperty = await tx.property.update({
        where: { id },
        data: propertyData,
      });

      if (body.amenities !== undefined) {
        await this.amenityService.syncAmenities(
          tx,
          property.id,
          body.amenities
        );
      }
      await this.invalidatePropertyCaches(id);
      return updatedProperty;
    });
  };

  deletePropertyById = async (id: number, authUserId: number) => {
    try {
      const tenant = await resolveTenantByUserId(authUserId);
  
      const property = await this.prisma.property.findFirst({
        where: {
          id,
          tenantId: tenant.id,
          deletedAt: null,
        },
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
              roomNonAvailability: {
                where: { deletedAt: null },
              },
            },
          },
        },
      });
  
      if (!property) {
        throw new ApiError("Property not found", 404);
      }
  
      // Guards
      if (property.rooms.some((r) => r.transactions.length > 0)) {
        throw new ApiError(
          "Cannot delete property with active or upcoming bookings",
          400
        );
      }
  
      if (property.rooms.some((r) => r.roomNonAvailability.length > 0)) {
        throw new ApiError(
          "Cannot delete property with active or upcoming maintenance schedule",
          400
        );
      }
  
      const roomIds = property.rooms.map((r) => r.id);
      const now = new Date();
  
      await this.prisma.$transaction(async (tx) => {
        if (roomIds.length > 0) {
          await tx.roomImage.updateMany({
            where: { roomId: { in: roomIds } },
            data: { deletedAt: now },
          });
  
          await tx.roomNonAvailability.updateMany({
            where: { roomId: { in: roomIds } },
            data: { deletedAt: now },
          });
  
          await tx.seasonalRate.updateMany({
            where: {
              OR: [{ roomId: { in: roomIds } }, { propertyId: id }],
            },
            data: { deletedAt: now },
          });
        }
  
        await tx.room.updateMany({
          where: { propertyId: id },
          data: { deletedAt: now },
        });
  
        await tx.propertyAmenity.updateMany({
          where: { propertyId: id },
          data: { deletedAt: now },
        });
  
        await tx.propertyImage.updateMany({
          where: { propertyId: id },
          data: { deletedAt: now },
        });
  
        await tx.property.update({
          where: { id },
          data: { deletedAt: now },
        });
      });
  
      return { success: true };
    } catch (err) {
      console.error("DELETE PROPERTY ERROR >>>", err);
  
      if (err instanceof ApiError) {
        throw err;
      }
  
      throw new ApiError(
        "Internal server error while deleting property",
        500
      );
    }
  };
}
