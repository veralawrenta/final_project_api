import { NextFunction, Request, Response } from "express";
import { OAuthService } from "./oAuth.service.js";
import { ApiError } from "../../utils/api-error.js";


export class OAuthController {
  private oAuthService: OAuthService;

  constructor() {
    this.oAuthService = new OAuthService();
  }

  googleLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { googleToken } = req.body;

      if (!googleToken) {
        throw new ApiError("Google token required", 400);
      }

      const result = await this.oAuthService.googleLogin(googleToken);
      res.status(200).send(result);
    } catch (err) {
      next(err);
    }
  };
}
