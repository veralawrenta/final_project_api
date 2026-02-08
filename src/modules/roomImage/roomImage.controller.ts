import { Request, Response } from "express";
import { RoomImagesService } from "./roomImage.service";
import { ApiError } from "../../utils/api-error";
import { plainToInstance } from "class-transformer";
import { CreateRoomImageDTO, UpdateRoomImageDTO } from "./dto/roomImage.dto";

export class RoomImagesController {
  private roomImagesService: RoomImagesService;

  constructor() {
    this.roomImagesService = new RoomImagesService();
  }

  getAllRoomImagesByRoom = async (req: Request, res: Response) => {
    const roomId = Number(req.params.roomId);
    const result = await this.roomImagesService.getAllRoomImagesByRoom(roomId);
    return res.status(200).send(result);
  };

  uploadRoomImage = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) { throw new ApiError ("Unauthorized", 403)};

    const roomId = Number(req.params.roomId);
    const files = req.files as { [filedname: string]: Express.Multer.File[] };
    const urlImage = files.urlImage?.[0];
    if (!urlImage) {
      throw new ApiError("Image is required", 400);
    }
    const data = plainToInstance(CreateRoomImageDTO, req.body);
    const result = await this.roomImagesService.uploadRoomImage(
      roomId,
      authUserId,
      urlImage,
      data
    );
    return res.status(201).send(result);
  };

  deleteRoomImage = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) { throw new ApiError ("Unauthorized", 403)};
    const id = Number(req.params.id);
    const result = await this.roomImagesService.deleteRoomImage(id, authUserId);
    return res.status(200).send(result);
  };
};
