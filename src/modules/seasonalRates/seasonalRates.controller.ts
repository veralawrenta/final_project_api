import { Request, Response } from "express";

import { plainToInstance } from "class-transformer";
import { CreateSeasonalRatesDTO, GetSeasonalRatesDTO, UpdateSeasonalRatesDTO } from "./dto/seasonalRates.dto";
import { SeasonalRatesService } from "./seasonalRates.service";
import { ApiError } from "../../utils/api-error";

export class SeasonalRateController {
  private seasonalRateService: SeasonalRatesService;

  constructor() {
    this.seasonalRateService = new SeasonalRatesService();
  }

  createSeasonalRate = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    };
    const data = plainToInstance(CreateSeasonalRatesDTO, req.body);
    const result = await this.seasonalRateService.createSeasonalRate(authUserId, data);
    return res.status(201).send(result);
  };

  getAllSeasonalRatesByTenant = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    };
    const query = plainToInstance(GetSeasonalRatesDTO, req.query);
    const result = await this.seasonalRateService.getAllSeasonalRatesByTenant(
      authUserId,
      query,
    );
    return res.status(200).send(result);
  };

  getSeasonalRateById = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    };
    const id = Number(req.params.id);
    const result = await this.seasonalRateService.getSeasonalRateById(id, authUserId);
    return res.status(200).send(result);
  };

  updateSeasonalRate = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const id = Number(req.params.id);
    const data = plainToInstance(UpdateSeasonalRatesDTO, req.body);
    const result = await this.seasonalRateService.updateSeasonalRate(
      id,
      authUserId,
      data
    );
    return res.status(200).send(result);
  };

  deleteSeasonalRate = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const id = Number(req.params.id);
    const result = await this.seasonalRateService.deleteSeasonalRate(
      id,
      authUserId,
    );
    return res.status(200).send(result);
  };
}
