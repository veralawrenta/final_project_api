import { Router } from "express";
import { UserController } from "./user.controller";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { JWT_ACCESS_SECRET } from "../../config/env";
import { validateBody } from "../../middlewares/validation.middleware";
import { UpdateDataTenantDTO, UpdateDataUserDTO } from "./dto/user-dto";

export class UserRouter {
  router: Router;
  userController: UserController;
  uploadMiddleware: UploaderMiddleware;
  jwtMiddleware: JWTMiddleware;

  constructor() {
    this.router = Router();
    this.userController = new UserController();
    this.uploadMiddleware = new UploaderMiddleware();
    this.jwtMiddleware = new JWTMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get("/", this.userController.getAllUsers);
    this.router.get("/:id", this.userController.getUserById);
    this.router.post(
      "/me/avatar",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.uploadMiddleware.upload().fields([{ name: "avatar", maxCount: 1 }]),
      this.userController.uploadAvatar
    );
    this.router.patch(
      "/data-user",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      validateBody(UpdateDataUserDTO),
      this.userController.updateDataUser
    );
    this.router.patch(
      "/data-tenant",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      validateBody(UpdateDataTenantDTO),
      this.userController.updateDataTenant
    );
    this.router.delete("/:id", this.userController.deleteUser);
    this.router.get(
      "/me",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.userController.getMeProfile
    );
  };
  getRouter = () => {
    return this.router;
  };
}
