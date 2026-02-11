import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { CreateRoomDTO, GetAllRoomsDTO, UpdateRoomDTO } from "./dto/room.dto";
import { RoomService } from "./room.service";

export class RoomController {
  roomService: RoomService;

  constructor() {
    this.roomService = new RoomService();
  };

  getAllRoomsByProperty = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const propertyId = Number(req.params.propertyId);
    const result = await this.roomService.getAllRoomsByProperty(
      authUserId,
      propertyId
    );
    return res.status(200).send(result);
  };

  getAllRoomsByTenant = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const query = plainToInstance(GetAllRoomsDTO, req.query);
    const result = await this.roomService.getAllRoomsByTenant(authUserId, query);
    return res.status(200).send(result);
  };

  getRoomById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.roomService.getRoomId(id);
    return res.status(200).send(result);
  };

  createRoom = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    };
    const propertyId = Number(req.params.propertyId);
    const data = plainToInstance(CreateRoomDTO, req.body);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const urlImages = files.urlImages;

    if (!urlImages || urlImages.length === 0) {
      throw new ApiError("At least one room image is required", 400);
    }

    const result = await this.roomService.createRoom(
      authUserId,
      propertyId,
      data,
      urlImages
    );
    return res.status(201).send(result);
  };

  updateRoom = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    };
    const data = plainToInstance(UpdateRoomDTO, req.body);
    const result = await this.roomService.updateRoom(id, authUserId, data);
    return res.status(200).send(result);
  };

  deleteRoom = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    };
    await this.roomService.deleteRoom(id, authUserId);
    return res.status(204).send();
  };
}
