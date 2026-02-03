import { Request, Response } from "express";
import { CityService } from "./city.service";

export class CityController {
  private cityService: CityService;

  constructor() {
    this.cityService = new CityService();
  }

  getAllCities = async (req: Request, res: Response) => {
    try {
      const { search } = req.query;
      const cities = await this.cityService.getAllCities(search as string);
      return res.status(200).json(cities);
    } catch (error) {
      console.error('Error fetching cities:', error);
      return res.status(500).json({ error: 'Failed to fetch cities' });
    }
  };
}
