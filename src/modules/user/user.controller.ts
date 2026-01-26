import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { UpdateDataTenantDTO, UpdateDataUserDTO } from "./dto/user-dto";
import { UserService } from "./user.service";

export class UserController {
  userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getAllUsers = async (req: Request, res: Response) => {
    const result = await this.userService.getAllUsers();
    return res.status(200).send(result);
  };

  uploadAvatar = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const avatar = files.avatar?.[0];
    if (!avatar) {
      return res.status(400).send({ message: "No avatar image file provided" });
    }
    const result = await this.userService.uploadAvatar(authUserId, avatar);
    return res.status(200).send(result);
  };

  updateDataUser = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const data = plainToInstance(UpdateDataUserDTO, { ...req.body });
    const result = await this.userService.updateDataUser(authUserId, data);
    return res.status(200).send(result);
  };

  updateDataTenant = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const data = plainToInstance(UpdateDataTenantDTO, { ...req.body });
    const result = await this.userService.updateDataTenant(authUserId, data);
    return res.status(200).send(result);
  };

  deleteUser = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const result = await this.userService.deleteUser(authUserId);
    return res.status(200).send(result);
  };

  getMeProfile = async (req: Request, res: Response) => {
      console.log("JWT USER:", res.locals.user);
      const authUserId = res.locals.user.id;
      if (!authUserId) {
        throw new ApiError("User ID not found in token", 401);
      }
      const result = await this.userService.getMyProfile(authUserId);
      return res.status(200).send(result);
  };
}
