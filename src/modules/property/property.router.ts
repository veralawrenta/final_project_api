import { Router } from "express";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { JWT_ACCESS_SECRET } from "../../config/env";
import { PropertyController } from "./property.controller";
import { RoleMiddleware } from "../../middlewares/role.middleware";

export class PropertyRouter {
  router: Router;
  propertyController: PropertyController;
  uploadMiddleware: UploaderMiddleware;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.propertyController = new PropertyController();
    this.uploadMiddleware = new UploaderMiddleware();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get("/public", this.propertyController.getAllProperties);
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.propertyController.getAllPropertiesByTenant
    );
    this.router.get("/:id", this.propertyController.getPropertyById);
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.propertyController.createProperty
    );
    this.router.get(
      "/:id/publishability",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.propertyController.checkPublishability
    );
    this.router.patch(
      "/:id/publish",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.propertyController.publishProperty
    );
    this.router.patch(
      "/:id/unpublish",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.propertyController.unpublishProperty
    );
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      this.propertyController.updateProperty
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      this.propertyController.deleteProperty
    );
  };
  getRouter = () => {
    return this.router;
  };
}
