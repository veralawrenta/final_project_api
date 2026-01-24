import { Request, Response } from "express";
import { CityService } from "./city.service";

export class CityController {
  private cityService: CityService;

  constructor() {
    this.cityService = new CityService();
  }

  getAllCities = async (req: Request, res: Response) => {
    const cities = await this.cityService.getAllCities();
    return cities;
  };
}
