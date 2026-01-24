import { PrismaClient } from "../../../generated/prisma/client";
import { CloudinaryService } from "../../cloudinary/cloudinary.service";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import {
  CreatePropertyImageDTO,
  UpdatePropertyImageDTO
} from "./dto/propertyImage.dto";

export class PropertyImagesService {
  private prisma: PrismaClient;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = prisma;
    this.cloudinaryService = new CloudinaryService();
  }

  getAllPropertyImagesByProperty = async (propertyId: number) => {
    const propertyImages = await this.prisma.propertyImage.findMany({
      where: { propertyId, deletedAt: null },
    });
    if (propertyImages.length === 0) {
      throw new ApiError("No images found for the property", 404);
    }
    return propertyImages;
  };

  uploadPropertyImage = async (
    propertyId: number,
    tenantId: number,
    urlImages: Express.Multer.File,
    body: CreatePropertyImageDTO
  ) => {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    }
    if (property.tenantId !== tenantId) {
      throw new ApiError("Unauthorized to add images to this property", 403);
    }

    if (body.isCover) {
      await this.prisma.propertyImage.updateMany({
        where: {
          propertyId,
          isCover: true,
          deletedAt: null,
        },
        data: {
          isCover: false,
        },
      });
    }

    const { secure_url } = await this.cloudinaryService.upload(urlImages);

    const propertyImage = await this.prisma.propertyImage.create({
      data: {
        propertyId,
        urlImages: secure_url,
        isCover: body.isCover,
      },
    });
    return propertyImage;
  };

    updatePropertyImage = async (
    id: number,
    tenantId: number,
    body: UpdatePropertyImageDTO
  ) => {
    const propertyImage = await this.prisma.propertyImage.findFirst({
      where: { id },
      include: {
        property: true,
      },
    });
    if (!propertyImage) {
      throw new ApiError("Property image not found", 404);
    }
    if (propertyImage.property.tenantId !== tenantId) {
      throw new ApiError("Forbidden", 403);
    }
    if (body.isCover === true) {
      await this.prisma.propertyImage.updateMany({
        where: {
          propertyId: propertyImage.propertyId,
          isCover: true,
          deletedAt: null,
        },
        data: { isCover: false },
      });
      const updatedPropertyImage = await this.prisma.propertyImage.update({
        where: { id },
        data: { isCover: body.isCover },
      });
      return updatedPropertyImage;
    }
  };
}
