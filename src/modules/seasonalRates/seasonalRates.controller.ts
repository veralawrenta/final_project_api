import { Request, Response } from "express";

import { plainToInstance } from "class-transformer";
import { CreateSeasonalRatesDTO, GetSeasonalRatesDTO, UpdateSeasonalRatesDTO } from "./dto/seasonalRates.dto";
import { SeasonalRatesService } from "./seasonalRates.service";

export class SeasonalRateController {
  private seasonalRateService: SeasonalRatesService;

  constructor() {
    this.seasonalRateService = new SeasonalRatesService();
  }

  createSeasonalRate = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const data = plainToInstance(CreateSeasonalRatesDTO, req.body);
    const result = await this.seasonalRateService.createSeasonalRate(tenantId, data);
    return res.status(201).send(result);
  };

  getAllSeasonalRatesByTenant = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const query = plainToInstance(GetSeasonalRatesDTO, req.query);
    const result = await this.seasonalRateService.getAllSeasonalRatesByTenant(
      tenantId,
      query,
    );
    return res.status(200).send(result);
  };

  updateSeasonalRate = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const id = Number(req.params.id);
    const data = plainToInstance(UpdateSeasonalRatesDTO, req.body);
    const result = await this.seasonalRateService.updateSeasonalRate(
      id,
      tenantId,
      data
    );
    return res.status(200).send(result);
  };

  deleteSeasonalRate = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const id = Number(req.params.id);
    const result = await this.seasonalRateService.deleteSeasonalRate(
      id,
      tenantId,
    );
    return res.status(200).send(result);
  };
}
