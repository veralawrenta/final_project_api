import { PrismaClient, PropertyStatus } from "../../../generated/prisma/client";
import { CloudinaryService } from "../../cloudinary/cloudinary.service";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
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
    if (roomImages.length === 0) {
      throw new ApiError("No images found for the room", 404);
    }
    return roomImages;
  };

  uploadRoomImage = async (
    roomId: number,
    tenantId: number,
    urlImage: Express.Multer.File,
    body: CreateRoomImageDTO
  ) => {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, deletedAt: null },
      include: {
        property: true,
      },
    });
    if (!room) {
      throw new ApiError("Room not found", 404);
    }
    if (room.property.tenantId !== tenantId) {
      throw new ApiError("Unauthorized to add images to this room", 403);
    }

    if (body.isCover) {
      await this.prisma.roomImage.updateMany({
        where: {
          roomId,
          isCover: true,
          deletedAt: null,
        },
        data: {
          isCover: false,
        },
      });
    }

    const { secure_url } = await this.cloudinaryService.upload(urlImage);

    const roomImage = await this.prisma.roomImage.create({
      data: {
        roomId,
        urlImages: secure_url,
        isCover: body.isCover,
      },
    });
    return roomImage;
  };

  updateRoomImage = async (
    id: number,
    tenantId: number,
    body: UpdateRoomImageDTO
  ) => {
    const roomImage = await this.prisma.roomImage.findFirst({
      where: { id },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });
    if (!roomImage) {
      throw new ApiError("Room image not found", 404);
    }
    if (roomImage.room.property.tenantId !== tenantId) {
      throw new ApiError("Forbidden", 403);
    }
    if (body.isCover === true) {
      await this.prisma.roomImage.updateMany({
        where: {
          roomId: roomImage.roomId,
          isCover: true,
          deletedAt: null,
        },
        data: { isCover: false },
      });
      const updatedRoomImage = await this.prisma.roomImage.update({
        where: { id },
        data: { isCover: body.isCover },
      });
      return updatedRoomImage;
    }
  };

  deleteRoomImage = async (id: number, tenantId: number) => {
    const image = await this.prisma.roomImage.findFirst({
      where: { id },
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
    if (image.room.property.tenantId !== tenantId) {
      throw new ApiError("Unauthorized", 403);
    };

    if (image.room.property.propertyStatus === PropertyStatus.PUBLISHED) {
      const count = await this.prisma.roomImage.count({
        where: { roomId: image.roomId, deletedAt: null }
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
