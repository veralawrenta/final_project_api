import { Router } from "express";
import { RoomNonAvailabilityController } from "./roomNonAvailability.controller.js";
import { JWTMiddleware } from "../../middlewares/jwt.middleware.js";
import { RoleMiddleware } from "../../middlewares/role.middleware.js";
import { validateBody } from "../../middlewares/validation.middleware.js";
import {
  CreateRoomNonAvailabilityDTO,
  GetRoomNonAvailabilitiesByTenant,
  UpdateRoomNonAvailabilityDTO,
} from "./dto/roomNonAvailability.js";

export class RoomNonAvailabilityRouter {
  router: Router;
  roomNonAvailabilityController: RoomNonAvailabilityController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.roomNonAvailabilityController = new RoomNonAvailabilityController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializedRoutes();
  }
  private initializedRoutes = () => {
    this.router.post(
      "/room/:roomId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roomNonAvailabilityController.createRoomNonAvailability
    );
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      validateBody(UpdateRoomNonAvailabilityDTO),
      this.roomNonAvailabilityController.updateRoomNonAvailability
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roomNonAvailabilityController.deleteroomNonAvailability
    );
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roomNonAvailabilityController.getAllRoomNonAvailabilitiesByTenant
    );
    this.router.get(
      "/room/:roomId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roomNonAvailabilityController.getAllRoomNonAvailabilitiesByRoom
    );
  };

  getRouter = () => {
    return this.router;
  };
}
