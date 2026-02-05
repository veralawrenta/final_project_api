import { Router } from "express";
import { JWT_ACCESS_SECRET } from "../../config/env";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import {
  validateBody,
  validateQuery,
} from "../../middlewares/validation.middleware";
import { PropertyImagesController } from "../propertyImage/propertyImage.controller";
import {
  CreatePropertyDTO,
  GetPropertyAvailabilityQueryDTO,
  GetSearchAvailablePropertiesDTO,
  UpdatePropertyDTO,
} from "./dto/property.dto";
import { PropertyController } from "./property.controller";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";

export class PropertyRouter {
  router: Router;
  propertyController: PropertyController;
  propertyImagesController: PropertyImagesController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.propertyController = new PropertyController();
    this.propertyImagesController = new PropertyImagesController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/search",
      validateQuery(GetSearchAvailablePropertiesDTO),
      this.propertyController.getSearchAvailableProperties
    );
    this.router.get("/public", this.propertyController.getAllProperties);
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.propertyController.getAllPropertiesByTenant
    );
    this.router.get(
      "/:id/availability",
      validateQuery(GetPropertyAvailabilityQueryDTO),
      this.propertyController.getPropertyByIdWithAvailability
    );
    this.router.get("/public/:id", this.propertyController.getPropertyId);
    this.router.get("/:id", this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.propertyController.getPropertyIdByTenant)
    this.router.get(
      "/:id/calendar-prices",
      this.propertyController.get30DayPropertyCalendar
    );
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.uploaderMiddleware
      .upload()
      .fields([{name: "urlImages", maxCount: 10}]),
      validateBody(CreatePropertyDTO),
      this.propertyController.createProperty
    );
    this.router.get(
      "/:id/validation/step-one",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.propertyController.validatePropertyStepOne
    );
    this.router.patch(
      "/:id/publish",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      this.propertyController.publishProperty
    );
    this.router.patch(
      "/:id/unpublish",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      this.propertyController.unpublishProperty
    );
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      validateBody(UpdatePropertyDTO),
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
