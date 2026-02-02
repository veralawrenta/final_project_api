import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateRoomImageDTO } from "../roomImage/dto/roomImage.dto";
import { RoomImagesController } from "../roomImage/roomImage.controller";
import { CreateRoomNonAvailabilityDTO } from "../roomNonAvailability/dto/roomNonAvailability";
import { RoomNonAvailabilityController } from "../roomNonAvailability/roomNonAvailability.controller";
import { CreateSeasonalRatesDTO } from "../seasonalRates/dto/seasonalRates.dto";
import { SeasonalRateController } from "../seasonalRates/seasonalRates.controller";
import { UpdateRoomDTO } from "./dto/room.dto";
import { RoomController } from "./room.controller";

export class RoomRouter {
  router: Router;
  roomController: RoomController;
  roomImagesController: RoomImagesController;
  seasonalController: SeasonalRateController;
  roomNonAvailabilityController: RoomNonAvailabilityController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.roomController = new RoomController();
    this.roomImagesController = new RoomImagesController();
    this.seasonalController = new SeasonalRateController();
    this.roomNonAvailabilityController = new RoomNonAvailabilityController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/property/:propertyId",
      this.roomController.getAllRoomsByProperty
    );
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roomController.getAllRoomsByTenant
    );
    this.router.get("/:id", this.roomController.getRoomById);
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      validateBody(UpdateRoomDTO),
      this.roomController.updateRoom
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roomController.deleteRoom
    );
    this.router.post(
      "/room/:roomId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "urlImage", maxCount: 1 }]),
      validateBody(CreateRoomImageDTO),
      this.roomImagesController.uploadRoomImage
    );
    this.router.post(
      "/:roomId/seasonal-peak-rates",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      validateBody(CreateSeasonalRatesDTO),
      this.seasonalController.createSeasonalRate
    );
    this.router.post(
      "/:roomId/room-non-availability",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      validateBody(CreateRoomNonAvailabilityDTO),
      this.roomNonAvailabilityController.createRoomNonAvailability
    );
  };
  getRouter = () => this.router;
}
