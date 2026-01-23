import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { AuthService } from "./auth.service";
import {
  ChangePasswordDTO,
  ForgotPasswordDTO,
  LoginDTO,
  RegisterUserDTO,
  ResetPasswordDTO,
  SetPasswordDTO,
  VerifyEmailTokenDTO
} from "./dto/auth.dto";

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
    const data = plainToInstance(RegisterUserDTO, req.body);
    const result = await this.authService.registerUserEmail(data);
    res.status(201).send(result);
  };

  validateEmailToken = async (req: Request, res: Response) => {
    const data = plainToInstance(VerifyEmailTokenDTO, req.body);
    const result = await this.authService.validateEmailToken(data);
    res.status(200).send(result);
  };

  verifyAndSetPassword = async (req: Request, res: Response) => {
    const data = plainToInstance(SetPasswordDTO, req.body);
    const result = await this.authService.verifyAndSetPassword(data);
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
    const verificationToken = req.query.token as string;
    const data = plainToInstance(ResetPasswordDTO, req.body);
    const result = await this.authService.resetPassword(
      data,
      verificationToken
    );
    return res.status(201).send(result);
  };

  resendVerificationEmail = async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await this.authService.resendVerificationEmail(email);
    return res.status(200).send(result);
  };

  changeEmail = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id;
    const { newEmail, password } = req.body;
    const result = await this.authService.changeEmail(authUserId, newEmail);
    return res.status(200).send(result);
  };

  verifyChangeEmail = async (req: Request, res: Response) => {
    const token = req.query.token as string;
    if (!token) {
      throw new ApiError("Verification token is required", 400);
    }
    const result = await this.authService.verifyChangeEmail(token);
    return res.status(200).json(result);
  };

  changePassword = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const data = plainToInstance(ChangePasswordDTO, req.body);
    const result = await this.authService.changePassword(
      authUserId,
      data
    );
    return res.status(200).json(result);
  };
}
