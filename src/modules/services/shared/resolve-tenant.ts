import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../../utils/api-error";


export const resolveTenantByUserId = async (authUserId: number) => {
  if (!authUserId) {
    throw new ApiError("Unauthorized", 401);
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      userId: authUserId,
      deletedAt: null,
    },
  });
  if (!tenant) {
    throw new ApiError("Tenant not found", 404);
  };
  return tenant;
};
