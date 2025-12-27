import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  LoginDTO,
  RegisterTenantDTO,
  RegisterUserDTO,
  SetPasswordDTO,
  VerifyEmailTokenDTO
} from "./dto/auth.dto";
import { ApiError } from "../../utils/api-error";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  registerUserEmail = async (req: Request, res: Response) => {
    const data: RegisterUserDTO = req.body;
    if (!data.firstName || !data.lastName || !data.email) {
      throw new Error("Missing required fields: firstName, lastName, email");
    }
    try {
      const result = await this.authService.registerUserEmail(req.body);
      res.status(201).send(result);
    } catch (error: any) {
      res.status(401).send({
        error: error.message,
      });
    }
  };

  registerTenantEmail = async (req: Request, res: Response) => {
      const data: RegisterTenantDTO = req.body;
      const result = await this.authService.registerTenantEmail(data);
      res.status(201).send(result);
  };

  verifyEmailToken = async (req: Request, res: Response) => {
    const data: VerifyEmailTokenDTO = req.body;
    const result = await this.authService.verifyEmailToken(data);
    res.status(200).send(result);
  }

  verifyAndSetPassword = async (req: Request, res: Response) => {
    const data = req.body as SetPasswordDTO;
    const result = await this.authService.verifyAndSetPassword(data);
    res.status(201).send(result);
  };

  loginEmail = async (req: Request, res: Response) => {
    const data : LoginDTO = req.body;
    const result = await this.authService.loginEmail(data);
    return res.status(200).send(result);
  };

  forgotPassword = async (req: Request, res: Response) => {
    const result = await this.authService.forgotPassword(req.body);
    return res.status(200).send(result);
  };

  resetPassword = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const result = await this.authService.resetPassword(req.body, authUserId);
    return res.status(201).send(result);
  };

  resendVerificationEmail = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await this.authService.resendVerificationEmail(email);
    return res.status(200).send(result);
  };

  changeEmail = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id
    const { newEmail, password } = req.body;
    const result = await this.authService.changeEmail(authUserId, newEmail);
    return res.status(200).send(result);
  };

  verifyChangeEmail = async (req: Request, res: Response) => {
    
  }
}
