import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ApiError } from "../utils/api-error";

export class JWTMiddleware {
  verifyToken = (secretKey: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const token =
          req.headers.authorization?.split(" ")[1] ||
          (req.query.token as string);

        if (!token) {
          throw new ApiError("No token provided, authorization denied", 401);
        }

        jwt.verify(token, secretKey, (err, payload) => {
          if (err) {
            throw new ApiError("invalid token / token expired", 401);
          }

          res.locals.user = payload as JwtPayload;
          next();
        });
      } catch (error) {
        next(error);
      }
    };
  };
}
