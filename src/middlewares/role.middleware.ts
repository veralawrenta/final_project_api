import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { Role } from "../../generated/prisma/enums";
import { ApiError } from "../utils/api-error";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: Role;
      };
    }
  }
}

export const verifyTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;

  if (!user || user.role !== "TENANT") {
    res
      .status(403)
      .json({ message: "Unauthorized: Access is allowed for Tenants only" });
    return;
  }
  next();
};

export const verifyUser = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const user = req.user;
  
    if (!user || user.role !== "USER") {
      res
        .status(403)
        .json({ message: "Unauthorized: Access is allowed for Users only" });
      return;
    }
    next();
  };