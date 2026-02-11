import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware.js";
import { RoleMiddleware } from "../../middlewares/role.middleware.js";
import { validateBody } from "../../middlewares/validation.middleware.js";
import {
  CreateSeasonalRatesDTO,
  UpdateSeasonalRatesDTO,
} from "./dto/seasonalRates.dto.js";
import { SeasonalRateController } from "./seasonalRates.controller.js";

export class SeasonalRateRouter {
  router: Router;
  seasonalController: SeasonalRateController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.seasonalController = new SeasonalRateController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializedRoutes();
  }

  private initializedRoutes = () => {
    this.router.get(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.seasonalController.getAllSeasonalRatesByTenant
    );
    this.router.get(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.seasonalController.getSeasonalRateById
    );
    this.router.post(
      "/",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      validateBody(CreateSeasonalRatesDTO),
      this.seasonalController.createSeasonalRate
    );
    this.router.patch(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      validateBody(UpdateSeasonalRatesDTO),
      this.seasonalController.updateSeasonalRate
    );
    this.router.delete(
      "/:id",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.seasonalController.deleteSeasonalRate
    );
  };

  getRouter = () => this.router;
}
