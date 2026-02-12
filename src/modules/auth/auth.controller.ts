import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import {
  ChangePasswordDTO,
  ForgotPasswordDTO,
  LoginDTO,
  RegisterTenantDTO,
  RegisterUserDTO,
  ResendVerificationDTO,
  ResetPasswordDTO,
  SetPasswordDTO,
} from "./dto/auth.dto.js";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  registerUserEmail = async (req: Request, res: Response) => {
    const data = plainToInstance(RegisterUserDTO, req.body);
    const result = await this.authService.registerUserEmail(data);
    res.status(201).send(result);
  };

  registerTenantEmail = async (req: Request, res: Response) => {
    const data = plainToInstance(RegisterTenantDTO, req.body);
    const result = await this.authService.registerTenantEmail(data);
    res.status(201).send(result);
  };

  validateEmailToken = async (req: Request, res: Response) => {
    const userId = res.locals.user.id;
    const verificationToken = req.headers.authorization!.split(" ")[1];
    const result = await this.authService.validateEmailToken(
      userId,
      verificationToken
    );
    res.status(200).send(result);
  };

  verifyAndSetPassword = async (req: Request, res: Response) => {
    const userId = res.locals.user.id;
    const verificationToken = req.headers.authorization!.split(" ")[1];
    const data = plainToInstance(SetPasswordDTO, req.body);
    const result = await this.authService.verifyAndSetPassword(
      userId,
      verificationToken,
      data
    );
    res.status(201).send(result);
  };

  loginEmail = async (req: Request, res: Response) => {
    const data = plainToInstance(LoginDTO, req.body);
    const result = await this.authService.loginEmail(data);
    return res.status(200).send(result);
  };

  forgotPassword = async (req: Request, res: Response) => {
    const data = plainToInstance(ForgotPasswordDTO, req.body);
    const result = await this.authService.forgotPassword(data);
    return res.status(200).send(result);
  };

  resetPassword = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id;
    const verificationToken = req.headers.authorization!.split(" ")[1];
    const data = plainToInstance(ResetPasswordDTO, req.body);
    const result = await this.authService.resetPassword(
      authUserId,
      verificationToken,
      data
    );
    return res.status(200).send(result);
  };

  resendVerificationEmail = async (req: Request, res: Response) => {
    const data = plainToInstance(ResendVerificationDTO, req.body);
    const result = await this.authService.resendVerificationEmail(data);
    return res.status(200).send(result);
  };

  changeEmail = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id;
    const { newEmail } = req.body;
    const result = await this.authService.changeEmail(authUserId, newEmail);
    return res.status(200).send(result);
  };

  verifyChangeEmail = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id;
    const token = req.headers.authorization!.split(" ")[1];
    const result = await this.authService.verifyChangeEmail(authUserId, token);
    return res.status(200).send(result);
  };

  resendChangeEmailVerification = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const result = await this.authService.resendChangeEmailVerification(authUserId);
    return res.status(200).send(result);
  };

  changePassword = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const data = plainToInstance(ChangePasswordDTO, req.body);
    const result = await this.authService.changePassword(authUserId, data);
    return res.status(200).json(result);
  };
}
