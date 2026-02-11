import { Router } from "express";
import { JWTMiddleware } from "../../middlewares/jwt.middleware.js";
import { RoleMiddleware } from "../../middlewares/role.middleware.js";
import { UploaderMiddleware } from "../../middlewares/uploader.middleware.js";
import { DashboardController } from "./dashboard.controller.js";

export class DashboardRouter {
  router: Router;
  dashboardController: DashboardController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;
  uploaderMiddleware: UploaderMiddleware;

  constructor() {
    this.router = Router();
    this.dashboardController = new DashboardController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.uploaderMiddleware = new UploaderMiddleware();
    this.initializedRoutes();
  }
  private initializedRoutes = () => {
    this.router.get(
      "/me/statistics",
      this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!),
      this.roleMiddleware.requireRoles("TENANT"),
      this.dashboardController.getTenantDashboardOverview
    );
  };

  getRouter = () => {
    return this.router;
  };
}
