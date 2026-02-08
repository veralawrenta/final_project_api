import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { validateBody } from "../../middlewares/validation.middleware";
import { CreateRoomImageDTO, UpdateRoomImageDTO } from "./dto/roomImage.dto";
import { RoomImagesController } from "./roomImage.controller";

export class RoomImageRouter {
  router: Router;
  roomImagesController: RoomImagesController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.roomImagesController = new RoomImagesController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/rooms/:roomId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roomImagesController.getAllRoomImagesByRoom
    );
    this.router.post(
      "/rooms/:roomId",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requireRoomOwnership,
      this.uploaderMiddleware
        .upload()
        .fields([{ name: "urlImage", maxCount: 1 }]),
      validateBody(CreateRoomImageDTO),
      this.roomImagesController.uploadRoomImage
    );

    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.roleMiddleware.requireRoomOwnership,
      this.roomImagesController.deleteRoomImage
    );
  };

  getRouter = () => this.router;
}
