import { Router } from "express";
import { CityController } from "./city.controller.js";

export class CityRouter {
  router: Router;
  cityController: CityController;

  constructor() {
    this.router = Router();
    this.cityController = new CityController();
    this.initializedRoutes();
  }
  private initializedRoutes = () => {
    this.router.get("/", this.cityController.getAllCities);
  };

  getRouter = () => {
    return this.router;
  };
}
