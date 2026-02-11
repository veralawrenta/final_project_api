import { Request, Response } from "express";
import { AmenityService } from "./amenity.service.js";

export class AmenityController {
  private amenityService: AmenityService;

  constructor() {
    this.amenityService = new AmenityService();
  }

  getMasterAmenities = async (req: Request, res: Response) => {
  const amenities = await this.amenityService.getMasterAmenities();
  return res.status(200).send(amenities);
  };

  getAmenitiesByPropertyPublic = async (req: Request, res: Response) => {
    const propertyId = Number(req.params.propertyId);
    const result = await this.amenityService.getAmenitiesByPropertyPublic(
      propertyId
    );
    return res.status(200).send(result);
  };

}
