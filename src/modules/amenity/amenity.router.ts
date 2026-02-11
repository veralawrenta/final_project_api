import { Router } from "express";
import { AmenityController } from "./amenity.controller.js";

export class AmenityRouter {
  router: Router;
  amenityController: AmenityController;

  constructor() {
    this.router = Router();
    this.amenityController = new AmenityController();
    this.initializedRoutes();
  }
  private initializedRoutes = () => {
    this.router.get("/master", this.amenityController.getMasterAmenities);
    this.router.get(
      "/public/property/:propertyId",
      this.amenityController.getAmenitiesByPropertyPublic
    );
  };
  getRouter = () => {
    return this.router;
  };
}
