import { PrismaClient, PropertyStatus } from "../../../generated/prisma/client";
import { CloudinaryService } from "../../cloudinary/cloudinary.service";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { TenantService } from "../tenant/resolve-tenant";
import {
  CreatePropertyImageDTO
} from "./dto/propertyImage.dto";

export class PropertyImagesService {
  private prisma: PrismaClient;
  tenantService : TenantService;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = prisma;
    this.tenantService = new TenantService();
    this.cloudinaryService = new CloudinaryService();
  }

  getAllPropertyImagesByProperty = async (propertyId: number) => {
    const propertyImages = await this.prisma.propertyImage.findMany({
      where: { propertyId, deletedAt: null },
    });
    return propertyImages;
  };

  uploadPropertyImage = async (
    propertyId: number,
    authUserId: number,
    urlImages: Express.Multer.File,
    body: CreatePropertyImageDTO
  ) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 404);
    };
    if (property.tenantId !== tenant.id) {
      throw new ApiError("Unauthorized to add images to this property", 403);
    };
    const existingImagesCount = await this.prisma.propertyImage.count({
      where: {
        propertyId,
        deletedAt: null,
      },
    });

    if (existingImagesCount >= 10) {
      throw new ApiError(
        "Maximum 10 images allowed per property",
        400
      );
    };

    return await this.prisma.$transaction(async(tx) => {
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
      };
      const { secure_url } = await this.cloudinaryService.upload(urlImages);

      return tx.propertyImage.create({
        data: {
          propertyId,
          urlImages: secure_url,
          isCover: body.isCover,
        },
      })
    });
  };

  deletePropertyImage = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const image = await this.prisma.propertyImage.findFirst({
      where: { id,  deletedAt: null },
      include: {
        property : true,
      },
    });
    if (!image) {
      throw new ApiError("Property image not exist", 404);
    };

    if (image.property.tenantId !== tenant.id) { throw new ApiError ("Unauthorized", 403)};

    if (image.property.propertyStatus === PropertyStatus.PUBLISHED) {
      const count = await this.prisma.propertyImage.count({
        where: { propertyId : image.propertyId, deletedAt:null }
      });
      if (count <=1) { throw new ApiError ("Published property must have at least one image", 400)};
    };

    const deletedRoomImage = await this.prisma.propertyImage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    return deletedRoomImage;
  };
}
