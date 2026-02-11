import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service.js";

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getTenantDashboardOverview = async (req: Request, res: Response) => {
    const userId = Number(res.locals.user.id);
    const result = await this.dashboardService.getTenantDashboardDataOverview(
      userId
    );
    return res.status(200).send(result);
  };
}
