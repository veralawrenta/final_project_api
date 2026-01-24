import { Request, Response } from "express";
import { RoomService } from "./room.service";
import { plainToInstance } from "class-transformer";
import { CreateRoomDTO, UpdateRoomDTO } from "./dto/room.dto";

export class RoomController {
  roomService: RoomService;

  constructor() {
    this.roomService = new RoomService();
  }

  getAllRoomsByProperty = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const propertyId = Number(req.params.propertyId);
    const result = await this.roomService.getAllRoomsByProperty(
      tenantId,
      propertyId
    );
    return res.status(200).send(result);
  };

  getAllRoomsByTenant = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const result = await this.roomService.getAllRoomsByTenant(tenantId);
    return res.status(200).send(result);
  };

  getRoomById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.roomService.getRoomId(id);;
    return res.status(200).send(result);
  };
  
  createRoom = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const propertyId = Number(req.params.propertyId);
    const data = plainToInstance(CreateRoomDTO, req.body);
    const result = await this.roomService.createRoom(
      tenantId,
      propertyId,
      data
    );
    return res.status(201).send(result);
  };

  updateRoom = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId = Number(res.locals.user.tenant.id);
    const data = plainToInstance(UpdateRoomDTO, req.body);
    const result = await this.roomService.updateRoom(id, tenantId, data);
    return res.status(200).send(result);
  };

  deleteRoom = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId = Number(res.locals.user.tenant.id);
    await this.roomService.deleteRoom(id, tenantId);
    return res.status(204).send();
  };
}
