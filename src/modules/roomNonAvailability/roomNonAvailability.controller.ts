import { Request, Response } from "express";
import { RoomNonAvailabilityService } from "./roomNonAvailability.service";
import { plainToInstance } from "class-transformer";
import {
  CreateRoomNonAvailabilityDTO,
  GetRoomNonAvailabilitiesByTenant,
  UpdateRoomNonAvailabilityDTO,
} from "./dto/roomNonAvailability";

export class RoomNonAvailabilityController {
  roomNonAvailabilityService: RoomNonAvailabilityService;

  constructor() {
    this.roomNonAvailabilityService = new RoomNonAvailabilityService();
  }

  createRoomNonAvailability = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const roomId = Number(req.params.roomId);
    const data = plainToInstance(CreateRoomNonAvailabilityDTO, req.body);
    const result =
      await this.roomNonAvailabilityService.createRoomNonAvailability(
        tenantId,
        roomId,
        data
      );
    return res.status(201).send(result);
  };

  updateRoomNonAvailability = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const id = Number(req.params.id);
    const data = plainToInstance(UpdateRoomNonAvailabilityDTO, req.body);
    const result =
      await this.roomNonAvailabilityService.updateRoomNonAvailability(
        id,
        tenantId,
        data
      );
    return res.status(200).send(result);
  };

  deleteroomNonAvailability = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const id = Number(req.params.id);
    const result =
      await this.roomNonAvailabilityService.deleteroomNonAvailability(
        id,
        tenantId
      );
    return res.status(200).send(result);
  };

  getAllRoomNonAvailabilitiesByTenant = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const query = plainToInstance(GetRoomNonAvailabilitiesByTenant, req.query);
    const result =
      await this.roomNonAvailabilityService.getAllRoomNonAvailabilitiesByTenant(
        tenantId,
        query,
      );
    return res.status(200).send(result);
  };

  getAllRoomNonAvailabilitiesByRoom = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const roomId = Number(req.params.roomId);
    const result =
      await this.roomNonAvailabilityService.getAllRoomNonAvailabilitiesByRoom(
        tenantId,
        roomId
      );
    return res.status(200).send(result);
  };
}
