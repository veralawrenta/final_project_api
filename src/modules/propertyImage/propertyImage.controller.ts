import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { CreatePropertyImageDTO } from "./dto/propertyImage.dto";
import { PropertyImagesService } from "./propertyImage.service";

export class PropertyImagesController {
  private propertyImagesService: PropertyImagesService;

  constructor() {
    this.propertyImagesService = new PropertyImagesService();
  }

  getAllPropertyImagesByProperty = async (req: Request, res: Response) => {
    const propertyId = Number(req.params.propertyId);
    const result = await this.propertyImagesService.getAllPropertyImagesByProperty(propertyId);
    return res.status(200).send(result);
  };

  uploadPropertyImage = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const propertyId = Number(req.params.propertyId);

    const files = req.files as { [filedname: string]: Express.Multer.File[] };
    const urlImages = files.urlImages?.[0];
    if (!urlImages) {
      throw new ApiError("Image is required", 400);
    }
    const data = plainToInstance(CreatePropertyImageDTO, req.body);
    const result = await this.propertyImagesService.uploadPropertyImage(
      propertyId,
      authUserId,
      urlImages,
      data
    );
    return res.status(201).send(result);
  };

  deleteRoomImage = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    };
    const result = await this.propertyImagesService.deletePropertyImage(id,authUserId);
    return res.status(200).send(result);
  };
}
