import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware.js";
import { RoleMiddleware } from "../../middlewares/role.middleware.js";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware.js";
import { validateBody } from "../../middlewares/validation.middleware.js";
import { CreateRoomDTO, UpdateRoomDTO } from "./dto/room.dto.js";
import { RoomController } from "./room.controller.js";

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
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roomController.getAllRoomsByProperty
    );
    this.router.get("/:id", this.roomController.getRoomById);
    this.router.post(
      "/property/:propertyId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requirePropertyOwnership,
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "urlImages", maxCount: 3 }]),
      validateBody(CreateRoomDTO),
      this.roomController.createRoom
    );
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requireRoomOwnership,
      validateBody(UpdateRoomDTO),
      this.roomController.updateRoom
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requireRoomOwnership,
      this.roomController.deleteRoom
    );
  };
  getRouter = () => this.router;
}
