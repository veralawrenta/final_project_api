import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error.js";
import {
  CreatePropertyDTO,
  GetAllPropertiesDTO,
  GetPropertyAvailabilityQueryDTO,
  GetSearchAvailablePropertiesDTO,
  PublishPropertyDTO,
  UpdatePropertyDTO,
} from "./dto/property.dto.js";
import { PropertyService } from "./service/property.service.js";
import { CreatePropertyService } from "./service/create-property.service.js";

export class PropertyController {
  private propertyService: PropertyService;
  private createPropertyService: CreatePropertyService;

  constructor() {
    this.propertyService = new PropertyService();
    this.createPropertyService = new CreatePropertyService();
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
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const query = plainToInstance(GetAllPropertiesDTO, req.query);
    const result = await this.propertyService.getAllPropertiesByTenant(
      authUserId,
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

  getPropertyId = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.propertyService.getPropertyId(id);
    return res.status(200).send(result);
  };

  getPropertyIdByTenant = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const result = await this.propertyService.getPropertyIdByTenant(
      id,
      authUserId
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
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const data = plainToInstance(CreatePropertyDTO, req.body);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const urlImages = files.urlImages;

    if (!urlImages || urlImages.length === 0)
      throw new ApiError("urlImage is required", 400);

    const result = await this.createPropertyService.createProperty(
      authUserId,
      data,
      urlImages
    );
    return res.status(201).send(result);
  };

  validatePropertyStepOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    const result = await this.createPropertyService.validatePropertyStepOne(
      id,
      authUserId
    );
    return res.status(200).send(result);
  };

  publishProperty = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const id = Number(req.params.id);
    plainToInstance(PublishPropertyDTO, req.body);
    const result = await this.createPropertyService.publishProperty(
      id,
      authUserId
    );
    return res.status(200).send(result);
  };

  unpublishProperty = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const result = await this.createPropertyService.unpublishProperty(
      id,
      authUserId
    );
    return res.status(200).send(result);
  };

  updateProperty = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    const data = plainToInstance(UpdatePropertyDTO, req.body);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const result = await this.propertyService.updateProperty(
      id,
      authUserId,
      data
    );
    return res.status(200).send(result);
  };

  deleteProperty = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      throw new ApiError("Invalid property id", 400);
    }
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const result = await this.propertyService.deletePropertyById(
      id,
      authUserId
    );
    return res.status(200).send(result);
  };
}
