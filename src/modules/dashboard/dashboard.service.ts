import { PrismaClient } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";

export class DashboardService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  getTenantDashboardDataOverview = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      select: {
        firstName: true,
        lastName: true,
        avatar: true,
        tenant: {
          select: {
            id: true,
            tenantName: true,
          },
        },
      },
    });
    if (!user || !user.tenant) {
      throw new ApiError("User or tenant not found", 404);
    }

    const tenantId = user.tenant.id;

    const [totalProperties, totalRooms, totalRoomNonAvailability] =
      await Promise.all([
        this.prisma.property.count({
          where: { tenantId, deletedAt: null },
        }),
        this.prisma.room.count({
          where: {
            property: { tenantId, deletedAt: null },
            deletedAt: null,
          },
        }),
        this.prisma.roomNonAvailability.count({
          where: {
            room: {
              property: { tenantId, deletedAt: null },
              deletedAt: null,
            },
            deletedAt: null,
          },
        }),
      ]);
    return {
      profile: {
        name: `${user.tenant.tenantName}`.trim(),
        avatar: user.avatar,
      },
      stats: {
        totalProperties,
        totalRooms,
        totalRoomNonAvailability,
        averageRating: null,
      },
    };
  };
}
