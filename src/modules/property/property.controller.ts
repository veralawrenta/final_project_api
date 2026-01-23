import { Request, Response } from "express";
import { PropertyService } from "./property.service";
import { plainToInstance } from "class-transformer";
import { CreatePropertyDTO, UpdatePropertyDTO } from "./dto/property.dto";

export class PropertyController {
  private propertyService: PropertyService;

  constructor() {
    this.propertyService = new PropertyService();
  }

  getAllProperties = async (req: Request, res: Response) => {
    const result = await this.propertyService.getAllProperties();
    return res.status(200).send(result);
  };

  getAllPropertiesByTenant = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const result = await this.propertyService.getAllPropertiesByTenant(tenantId);
    return res.status(200).send(result);
  };

  getPropertyById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.propertyService.getPropertyById(id);
    return res.status(200).send(result);
  };

  createProperty = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const data = plainToInstance(CreatePropertyDTO, req.body);
    const result = await this.propertyService.createProperty(tenantId, data);
    return res.status(200).send(result);
  };

  updateProperty = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId= Number(res.locals.user.tenant.id)
    const data = plainToInstance(UpdatePropertyDTO, req.body);
    const result = await this.propertyService.updatePropertyById(id, tenantId, data);
    return res.status(200).send(result);
  };

  deleteProperty = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId= Number(res.locals.user.tenant.id)
    const result = await this.propertyService.deletePropertyById(id, tenantId);
    return res.status(200).send(result);
  };
}
