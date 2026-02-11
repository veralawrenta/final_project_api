import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error.js";

export const validateBody = (dtoClass: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(dtoClass, req.body);

    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      const message = errors
        .map((error) => Object.values(error.constraints || {}))
        .join(", ");

      throw new ApiError(message, 400);
    }
    next();
  };
};

export const validateQuery = (dtoClass: new (...args: unknown[]) => object) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(dtoClass, req.query, {
      enableImplicitConversion: true,
    });

    const errors = await validate(dtoInstance as object);

    if (errors.length > 0) {
      const message = errors
        .map((error) => Object.values(error.constraints || {}))
        .join(", ");

      throw new ApiError(message, 400);
    }
    (req as any).queryDto = dtoInstance;
    next();
  };
};
