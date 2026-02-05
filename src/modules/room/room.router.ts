import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateRoomDTO, UpdateRoomDTO } from "./dto/room.dto";
import { RoomController } from "./room.controller";

export class RoomRouter {
  router: Router;
  roomController: RoomController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.roomController = new RoomController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roomController.getAllRoomsByTenant
    );
    this.router.get(
      "/property/:propertyId",
      this.roomController.getAllRoomsByProperty
    );
    this.router.get("/:id", this.roomController.getRoomById);
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
  };
  getRouter = () => this.router;
}
