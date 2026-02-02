import { Router } from "express";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { JWT_ACCESS_SECRET } from "../../config/env";
import { PropertyController } from "./property.controller";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { PropertyImagesController } from "../propertyImage/propertyImage.controller";
import {
  validateBody,
  validateQuery,
} from "../../middlewares/validation.middleware";
import { CreatePropertyImageDTO } from "../propertyImage/dto/propertyImage.dto";
import {
  GetPropertyAvailabilityQueryDTO,
  GetSearchAvailablePropertiesDTO,
} from "./dto/property.dto";
import { RoomController } from "../room/room.controller";
import { CreateRoomDTO } from "../room/dto/room.dto";
import { AmenityController } from "../amenity/amenity.controller";

export class PropertyRouter {
  router: Router;
  propertyController: PropertyController;
  propertyImagesController: PropertyImagesController;
  roomController: RoomController;
  amenityController: AmenityController;
  uploaderMiddleware: UploaderMiddleware;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.propertyController = new PropertyController();
    this.propertyImagesController = new PropertyImagesController();
    this.roomController = new RoomController();
    this.amenityController = new AmenityController();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
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
    this.router.get(
      "/:id/availability-preview",
      this.propertyController.get30DayPropertyCalendar
    );
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
    this.router.post(
      "/:id/rooms",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      validateBody(CreateRoomDTO),
      this.roomController.createRoom
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
    this.router.post(
      "/:id/amenities",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      this.amenityController.createAmenity
    );
  };
  getRouter = () => {
    return this.router;
  };
}
