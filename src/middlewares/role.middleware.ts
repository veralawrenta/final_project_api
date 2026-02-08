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
      const authUserId = res.locals.user?.id;
      const propertyId = Number(req.params.id || req.params.propertyId || req.body.propertyId);
  
      if (!authUserId || !propertyId) {
        throw new ApiError("Unauthorized", 401);
      }
  
      const tenant = await prisma.tenant.findFirst({
        where: { userId: authUserId, deletedAt: null },
      });
  
      if (!tenant) {
        throw new ApiError("Tenant not found", 404);
      }
  
      const property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          tenantId: tenant.id,
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
  requireRoomOwnership = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const authUserId = res.locals.user?.id;
      const roomId = Number(req.params.id || req.params.roomId || req.body.roomId);
  
      if (!authUserId || !roomId || isNaN(roomId)) {
        throw new ApiError("Unauthorized", 401);
      }
  
      const tenant = await prisma.tenant.findFirst({
        where: { userId: authUserId, deletedAt: null },
      });
  
      if (!tenant) {
        throw new ApiError("Tenant not found", 404);
      }
  
      const room = await prisma.room.findFirst({
        where: { id: roomId, deletedAt: null },
        include: { property: true },
      });
  
      if (!room) {
        throw new ApiError("Room not found", 404);
      }
  
      if (room.property.tenantId !== tenant.id) {
        throw new ApiError("Forbidden: You don't own this room", 403);
      }
  
      next();
    } catch (error) {
      next(error);
    }
  };
};