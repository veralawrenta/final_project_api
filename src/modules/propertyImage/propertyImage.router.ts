import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { PropertyImagesController } from "./propertyImage.controller";
import { CreatePropertyImageDTO } from "./dto/propertyImage.dto";
import { validateBody } from "../../middlewares/validation.middleware";

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
      "/:id/property-images",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "urlImages", maxCount: 1 }]),
      validateBody(CreatePropertyImageDTO),
      this.propertyImagesController.uploadPropertyImage
    );
    /*this.router.patch(
      "/:id/cover",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      validateBody(CreatePropertyImageDTO),
      this.propertyImagesController.updatePropertyImage
    );*/
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
