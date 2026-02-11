import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware.js";
import { RoleMiddleware } from "../../middlewares/role.middleware.js";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware.js";
import { PropertyImagesController } from "./propertyImage.controller.js";
import { CreatePropertyImageDTO } from "./dto/propertyImage.dto.js";
import { validateBody } from "../../middlewares/validation.middleware.js";

export class PropertyImagesRouter {
  router: Router;
  propertyImagesController: PropertyImagesController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.propertyImagesController = new PropertyImagesController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }
  private initializedRoutes = () => {
    this.router.get(
      "/properties/:propertyId",
      this.propertyImagesController.getAllPropertyImagesByProperty
    );
    this.router.post(
      "/properties/:propertyId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "urlImages", maxCount: 1 }]),
      validateBody(CreatePropertyImageDTO),
      this.propertyImagesController.uploadPropertyImage
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.propertyImagesController.deleteRoomImage
    );
  };

  getRouter = () => {
    return this.router;
  };
}
