import { Request, Response } from "express";
import { UserService } from "./user.service";
import { plainToInstance } from "class-transformer";
import { UpdateDataTenantDTO, UpdateDataUserDTO } from "./dto/user-dto";
import { ApiError } from "../../utils/api-error";

export class UserController {
  userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  getAllUsers = async (req: Request, res: Response) => {
    const result = await this.userService.getAllUsers();
    return res.status(200).send(result);
  };

  getUserById = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const result = await this.userService.getUserById(id);
    return res.status(200).send(result);
  };

  uploadImageUrl = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const imageUrl = files.imageUrl?.[0];
    if (!imageUrl) {
      return res.status(400).send({ message: "No image file provided" });
    }
    const result = await this.userService.uploadImageUrl(id, imageUrl);
    return res.status(200).send(result);
  };

  updateDataUser = async (req: Request, res: Response) => {
    const id = res.locals.user.id;
    const data = plainToInstance(UpdateDataUserDTO, { ...req.body, id });
    const result = await this.userService.updateDataUser(data);
    return res.status(200).send(result);
  };

  updateDataTenant = async (req: Request, res: Response) => {
    const id = res.locals.user.id;
    const data = plainToInstance(UpdateDataTenantDTO, { ...req.body, id });
    const result = await this.userService.updateDataTenant(data);
    return res.status(200).send(result);
  };

  deleteUser = async (req: Request, res: Response) => {
    const id = res.locals.user.id;
    const result = await this.userService.deleteUser(id);
    return res.status(200).send(result);
  };

  getMeProfile = async (req: Request, res: Response) => {
    const authUserId = res.locals.user.id; 
    const result = await this.userService.getMyProfile(authUserId);
    return res.status(200).send(result);
  };
  
  
}
