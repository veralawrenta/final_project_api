import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";
import { Role } from "../../generated/prisma/client";
import { prisma } from "../lib/prisma";

export class RoleMiddleware {
  requireRoles = (...allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = res.locals.user.role;


      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new ApiError("Unauthorized", 401);
      };

      next();
    };
  };
  requirePropertyOwnership = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const tenantId = res.locals.user?.tenant?.id;
      const propertyId = Number(req.params.propertyId || req.body.propertyId);

      if (!tenantId || !propertyId) {
        throw new ApiError("Unauthorized", 401);
      }

      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!property) {
        throw new ApiError("Property not found or not owned by tenant", 403);
      }

      res.locals.property = property;
      next();
    } catch (error) {
      next(error);
    }
  };
}
