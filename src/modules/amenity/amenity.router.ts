import { Router } from "express";
import { AmenityController } from "./amenity.controller";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";

export class AmenityRouter {
  router: Router;
  amenityController: AmenityController;
  uploadMiddleware: UploaderMiddleware;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.amenityController = new AmenityController();
    this.uploadMiddleware = new UploaderMiddleware();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializedRoutes();
  }
  private initializedRoutes = () => {
    this.router.get("/property/:propertyId", this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.amenityController.getAmenitiesByTenant);
    this.router.patch("/:id", this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.amenityController.updateAmenity);
    this.router.delete("/:id", this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.amenityController.deleteAmenity)
  };
  getRouter = () => {
    return this.router;
  };
}
