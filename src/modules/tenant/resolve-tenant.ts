import { PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";

export class TenantService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }
  resolveTenantByUserId = async (authUserId: number) => {
    const tenant = await this.prisma.tenant.findUnique({
      where: {
        userId: authUserId,
        deletedAt: null,
      },
    });
    if (!tenant || tenant.deletedAt !== null) {
      throw new ApiError("Tenant not found", 404);
    }
    return tenant;
  };
}
