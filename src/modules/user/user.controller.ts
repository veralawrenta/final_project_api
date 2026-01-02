import { Request, Response } from "express";
import { UserService } from "./user.service";

export class UserController {
    userService : UserService;

    constructor() {
        this.userService = new UserService();
    };

    getAllUsers = async (req: Request, res: Response) => {
        const result = await this.userService.getAllUsers();
        res.status(200).send(result);
    };

    getUserById = async (req: Request, res: Response) => {
        const id = parseInt(req.params.id);
        const result = await this.userService.getUserById(id);
        res.status(200).send(result);
    };

    uploadImageUrl = async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const files = req.files as ({[fieldname: string]: Express.Multer.File[]});
        const imageUrl = files.imageUrl?.[0];
        if (!imageUrl) {
            return res.status(400).send({ message: "No image file provided" });
        };
        const result = await this.userService.uploadImageUrl(id, imageUrl);
        res.status(200).send(result);
    };

    updateDataUser = async (req: Request, res: Response) => {
        const body = req.body;
        const result = await this.userService.updateDataUser(body);
        res.status(200).send(result);
    };

    updateDataTenant = async (req: Request, res: Response) => {
        const body = req.body;
        const result = await this.userService.updateDataTenant(body);
        res.status(200).send(result);
    };

    deleteUser = async (req: Request, res: Response) => {
        const id = Number(req.params.id);
        const result = await this.userService.deleteUser(id);
        res.status(200).send(result);
    };
};