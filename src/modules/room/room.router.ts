import { Router } from "express";
import { RoomController } from "./room.controller";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateRoomDTO, UpdateRoomDTO } from "./dto/room.dto";

export class RoomRouter {
  router: Router;
  roomController: RoomController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.roomController = new RoomController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
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
    this.router.post(
      "/property/:propertyId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
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
};