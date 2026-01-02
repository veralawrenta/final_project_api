import { NextFunction, Request, Response } from "express";
import { OAuthService } from "./oAuth.service";
import { ApiError } from "../../utils/api-error";
import { Role } from "../../../generated/prisma/enums";

export class OAuthController {
  private oAuthService: OAuthService;

  constructor() {
    this.oAuthService = new OAuthService();
  }

  googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { googleToken, role } = req.body;

      if (!googleToken) {
        throw new ApiError("Google token required", 400);
      }

     if (!role.user && role !==role.Role) {
        throw new ApiError("Role is required", 400);
      }
      const result = await this.oAuthService.googleLogin(googleToken, role);
      res.status(200).send(result);
    } catch (err) {
      next(err);
    }
  };
}
