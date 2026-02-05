import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import {
  CreatePropertyDTO,
  GetAllPropertiesDTO,
  GetPropertyAvailabilityQueryDTO,
  GetSearchAvailablePropertiesDTO,
  PublishPropertyDTO,
  UpdatePropertyDTO,
} from "./dto/property.dto";
import { PropertyService } from "./property.service";

export class PropertyController {
  private propertyService: PropertyService;

  constructor() {
    this.propertyService = new PropertyService();
  }

  getAllProperties = async (req: Request, res: Response) => {
    const query = plainToInstance(GetAllPropertiesDTO, req.query);
    const result = await this.propertyService.getAllProperties(query);
    return res.status(200).send(result);
  };
  getSearchAvailableProperties = async (req: Request, res: Response) => {
    const query = plainToInstance(GetSearchAvailablePropertiesDTO, req.query);
    const result = await this.propertyService.getSearchAvailableProperties(
      query
    );
    return res.status(200).send(result);
  };

  getAllPropertiesByTenant = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const query = plainToInstance(GetAllPropertiesDTO, req.query);
    const result = await this.propertyService.getAllPropertiesByTenant(
      tenantId,
      query
    );
    return res.status(200).send(result);
  };

  getPropertyByIdWithAvailability = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const query = plainToInstance(GetPropertyAvailabilityQueryDTO, req.query);
    const result = await this.propertyService.getPropertyByIdWithAvailability(
      id,
      query
    );

    return res.status(200).send(result);
  };

  get30DayPropertyCalendar = async (req: Request, res: Response) => {
    const propertyId = Number(req.params.id);
    const startDate = req.query.startDate as string;
    const result = await this.propertyService.get30DayPropertyCalendar(
      propertyId,
      startDate
    );
    return res.status(200).send(result);
  };

  createProperty = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const data = plainToInstance(CreatePropertyDTO, req.body);
    const result = await this.propertyService.createProperty(authUserId, data);
    return res.status(201).send(result);
  };

  publishProperty = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const id = Number(req.params.id);
    plainToInstance(PublishPropertyDTO, req.body);
    const result = await this.propertyService.publishProperty(id, tenantId);
    return res.status(200).send(result);
  };

  unpublishProperty = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const id = Number(req.params.id);
    const result = await this.propertyService.unpublishProperty(id, tenantId);
    return res.status(200).send(result);
  };

  updateProperty = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId = Number(res.locals.user.tenant.id);
    const data = plainToInstance(UpdatePropertyDTO, req.body);
    const result = await this.propertyService.updateProperty(
      id,
      tenantId,
      data
    );
    return res.status(200).send(result);
  };

  deleteProperty = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId = Number(res.locals.user.tenant.id);
    const result = await this.propertyService.deletePropertyById(id, tenantId);
    return res.status(200).send(result);
  };
}
