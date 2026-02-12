import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware.js";
import { validateBody } from "../../middlewares/validation.middleware.js";
import { AuthController } from "./auth.controller.js";
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

export class AuthRouter {
  private router: Router;
  private authController: AuthController;
  private jwt: JWTMiddleware;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.jwt = new JWTMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.post(
      "/register/user",
      validateBody(RegisterUserDTO),
      this.authController.registerUserEmail
    );
    this.router.post(
      "/register/tenant",
      validateBody(RegisterTenantDTO),
      this.authController.registerTenantEmail
    );
    this.router.post(
      "/validate",
      this.jwt.verifyToken(process.env.JWT_VERIFY_SECRET!),
      this.authController.validateEmailToken
    );
    this.router.post(
      "/login",
      validateBody(LoginDTO),
      this.authController.loginEmail
    );
    this.router.post(
      "/resend-verification",
      validateBody(ResendVerificationDTO),
      this.authController.resendVerificationEmail
    );
    this.router.patch(
      "/set-password",
      this.jwt.verifyToken(process.env.JWT_VERIFY_SECRET!),
      validateBody(SetPasswordDTO),
      this.authController.verifyAndSetPassword
    );
    this.router.post(
      "/forgot-password",
      validateBody(ForgotPasswordDTO),
      this.authController.forgotPassword
    );
    this.router.patch(
      "/reset-password",
      this.jwt.verifyToken(process.env.JWT_RESET_SECRET!),
      validateBody(ResetPasswordDTO),
      this.authController.resetPassword
    );
    this.router.post("/change-email", this.jwt.verifyToken(process.env.JWT_ACCESS_SECRET!), this.authController.changeEmail);
    this.router.patch(
      "/verify-change-email",
      this.jwt.verifyToken(process.env.JWT_CHANGE_EMAIL_SECRET!),
      this.authController.verifyChangeEmail
    );
    this.router.post(
      "/resend-change-email",
      this.jwt.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.authController.resendChangeEmailVerification
    );
    this.router.patch(
      "/change-password",
      this.jwt.verifyToken(process.env.JWT_ACCESS_SECRET!),
      validateBody(ChangePasswordDTO),
      this.authController.changePassword
    );
  };

  getRouter = () => {
    return this.router;
  };
}
