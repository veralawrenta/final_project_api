import { Request, Response } from "express";
import { RoomNonAvailabilityService } from "./roomNonAvailability.service";
import { plainToInstance } from "class-transformer";
import {
  CreateRoomNonAvailabilityDTO,
  GetRoomNonAvailabilitiesByTenant,
  UpdateRoomNonAvailabilityDTO,
} from "./dto/roomNonAvailability";
import { ApiError } from "../../utils/api-error";

export class RoomNonAvailabilityController {
  roomNonAvailabilityService: RoomNonAvailabilityService;

  constructor() {
    this.roomNonAvailabilityService = new RoomNonAvailabilityService();
  }

  createRoomNonAvailability = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    };
    const roomId = Number(req.params.roomId);
    const data = plainToInstance(CreateRoomNonAvailabilityDTO, req.body);
    const result =
      await this.roomNonAvailabilityService.createRoomNonAvailability(
        authUserId,
        roomId,
        data
      );
    return res.status(201).send(result);
  };

  updateRoomNonAvailability = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const id = Number(req.params.id);
    const data = plainToInstance(UpdateRoomNonAvailabilityDTO, req.body);
    const result =
      await this.roomNonAvailabilityService.updateRoomNonAvailability(
        id,
        authUserId,
        data
      );
    return res.status(200).send(result);
  };

  deleteroomNonAvailability = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const id = Number(req.params.id);
    const result =
      await this.roomNonAvailabilityService.deleteroomNonAvailability(
        id,
        authUserId
      );
    return res.status(200).send(result);
  };

  getAllRoomNonAvailabilitiesByTenant = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const query = plainToInstance(GetRoomNonAvailabilitiesByTenant, req.query);
    const result =
      await this.roomNonAvailabilityService.getAllRoomNonAvailabilitiesByTenant(
        authUserId,
        query,
      );
    return res.status(200).send(result);
  };

  getAllRoomNonAvailabilitiesByRoom = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const roomId = Number(req.params.roomId);
    const result =
      await this.roomNonAvailabilityService.getAllRoomNonAvailabilitiesByRoom(
        authUserId,
        roomId
      );
    return res.status(200).send(result);
  };
}
