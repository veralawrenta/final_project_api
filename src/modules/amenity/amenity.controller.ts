import { Request, Response } from "express";
import { AmenityService } from "./amenity.service";
import { plainToInstance } from "class-transformer";
import { CreateAmenityDTO, UpdateAmenityDTO } from "./dto/amenity.dto";

export class AmenityController {
  private amenityService: AmenityService;

  constructor() {
    this.amenityService = new AmenityService();
  };

  getAmenitiesByTenant = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const propertyId = Number(req.params.propertyId);
    const result = await this.amenityService.getAmenitiesByTenant(tenantId, propertyId);
    return res.status(200).send(result);
  }

  createAmenity = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const propertyId = Number(req.params.propertyId);
    const data = plainToInstance(CreateAmenityDTO, req.body);
    const result = await this.amenityService.createAmenity(tenantId, propertyId, data)
    return res.status(200).send(result);
}

  updateAmenity = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId = Number(res.locals.user.tenant.id);
    const data = plainToInstance(UpdateAmenityDTO, req.body);
    const result = await this.amenityService.updateAmenity(id, tenantId, data);
    return res.status(200).send(result);
  }

  deleteAmenity = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId = Number(res.locals.user.tenant.id);
    await this.amenityService.deleteAmenity(id, tenantId);
    return res.status(200).send();
  }
}
