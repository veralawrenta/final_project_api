import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreatePropertyImageDTO } from "../propertyImage/dto/propertyImage.dto";
import { PropertyImagesController } from "./propertyImage.controller";

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
      "/property/:propertyId",
      this.propertyImagesController.getAllPropertyImagesByProperty
    );
    this.router.post(
      "/property/:propertyId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "urlImages", maxCount: 1 }]),
      validateBody(CreatePropertyImageDTO),
      this.propertyImagesController.uploadPropertyImage
    );
    this.router.patch(
      "/:id/cover",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      validateBody(CreatePropertyImageDTO),
      this.propertyImagesController.updatePropertyImage
    );
  };

  getRouter = () => {
    return this.router;
  };
}
