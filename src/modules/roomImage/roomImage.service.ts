import { PrismaClient, PropertyStatus } from "../../../generated/prisma/client";
import { CloudinaryService } from "../../cloudinary/cloudinary.service";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { resolveTenantByUserId } from "../services/shared/resolve-tenant";
import { CreateRoomImageDTO, UpdateRoomImageDTO } from "./dto/roomImage.dto";

export class RoomImagesService {
  private prisma: PrismaClient;
  private cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = prisma;
    this.cloudinaryService = new CloudinaryService();
  }

  getAllRoomImagesByRoom = async (roomId: number) => {
    const roomImages = await this.prisma.roomImage.findMany({
      where: { roomId, deletedAt: null },
    });
    return roomImages;
  };

  uploadRoomImage = async (
    roomId: number,
    authUserId: number,
    urlImage: Express.Multer.File,
    body: CreateRoomImageDTO
  ) => {
    
      const tenant = await resolveTenantByUserId(authUserId);

      const room = await this.prisma.room.findFirst({
        where: { id: roomId, property: {tenantId: tenant.id}, deletedAt: null },
        include: { property: true },
      });

      if (!room) {
        throw new ApiError("Room not found", 404);
      };

      if (room.property.tenantId !== tenant.id) {
        throw new ApiError("Unauthorized to add images to this room", 403);
      };

      const count = await this.prisma.roomImage.count({
        where: { roomId, deletedAt: null },
      });

      if (count >= 3) {
        throw new ApiError("Maximum 3 images allowed per room", 400);
      }

      if (body.isCover) {
        await this.prisma.roomImage.updateMany({
          where: {
            roomId,
            isCover: true,
            deletedAt: null,
          },
          data: { isCover: false },
        });
      }

      const { secure_url } = await this.cloudinaryService.upload(urlImage);

      return this.prisma.roomImage.create({
        data: {
          roomId,
          urlImages: secure_url,
          isCover: body.isCover,
        },
      });
  };

  deleteRoomImage = async (id: number, authUserId: number) => {
    const tenant = await resolveTenantByUserId(authUserId);
    const image = await this.prisma.roomImage.findFirst({
      
      where: { id, deletedAt: null },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });
    if (!image) {
      throw new ApiError("Room image not exist", 404);
    }
    if (image.room.property.tenantId !== tenant.id) {
      throw new ApiError("Unauthorized", 403);
    }

    if (image.room.property.propertyStatus === PropertyStatus.PUBLISHED) {
      const count = await this.prisma.roomImage.count({
        where: { roomId: image.roomId, deletedAt: null },
      });
      if (count <= 1) {
        throw new ApiError("Published room must have at least one image", 400);
      };
    };

    const deletedRoomImage = await this.prisma.roomImage.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    return deletedRoomImage;
  };
}
