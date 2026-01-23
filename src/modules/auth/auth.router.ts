import { Router } from "express";
import { JWT_RESET_SECRET, JWT_VERIFY_SECRET } from "../../config/env";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { AuthController } from "./auth.controller";
import { ChangePasswordDTO, ForgotPasswordDTO, LoginDTO, RegisterTenantDTO, RegisterUserDTO, ResetPasswordDTO } from "./dto/auth.dto";

export class AuthRouter {
  private router: Router;
  private authController: AuthController;
  private jwt : JWTMiddleware;

  constructor() {
    this.router = Router();
    this.authController = new AuthController();
    this.jwt = new JWTMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.post("/register/user", validateBody(RegisterUserDTO), this.authController.registerUserEmail);
    this.router.post(
      "/register/tenant",
      validateBody(RegisterTenantDTO),
      this.authController.registerTenantEmail
    );
    this.router.get("/validate/:token", this.authController.validateEmailToken);
    this.router.post("/login", validateBody(LoginDTO), this.authController.loginEmail);
    this.router.post("/resend-verification", this.authController.resendVerificationEmail);
    
    this.router.patch("/set-password", this.authController.verifyAndSetPassword);
    this.router.post("/forgot-password", validateBody(ForgotPasswordDTO), this.authController.forgotPassword);
    this.router.patch(
      "/reset-password", validateBody(ResetPasswordDTO),
      this.jwt.verifyToken(JWT_RESET_SECRET!),
      this.authController.resetPassword
    );
    
    this.router.post("/change-email", this.authController.changeEmail);
    this.router.patch("/verify-change-email/:token",  this.jwt.verifyToken(JWT_VERIFY_SECRET!), this.authController.verifyChangeEmail);
    this.router.patch(
      "/change-password", validateBody(ChangePasswordDTO), this.authController.changePassword)
  };

  getRouter = () => {
    return this.router;
  };
}
