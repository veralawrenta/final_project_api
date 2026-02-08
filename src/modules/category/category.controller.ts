import { plainToInstance } from "class-transformer";
import { Request, Response } from "express";
import { ApiError } from "../../utils/api-error";
import { CategoryService } from "./category.service";
import {
  CreateCategoryDTO,
  GetAllCategoriesDTO,
  UpdateCategoryDTO,
} from "./dto/category.dto";

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getAllCategoriesByTenant = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const data = plainToInstance(GetAllCategoriesDTO, req.query);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const result = await this.categoryService.getAllCategoriesByTenant(
      authUserId,
      data
    );
    return res.status(200).send(result);
  };

  getCategoryById = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    const id = Number(req.params.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const result = await this.categoryService.getCategoryById(id, authUserId);
    return res.status(200).send(result);
  };

  createCategory = async (req: Request, res: Response) => {
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const data = plainToInstance(CreateCategoryDTO, req.body);
    const result = await this.categoryService.createCategory(authUserId, data);
    return res.status(201).send(result);
  };

  updateCategory = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    const data = plainToInstance(UpdateCategoryDTO, req.body);
    const result = await this.categoryService.updateCategory(
      id,
      authUserId,
      data
    );
    return res.status(200).send(result);
  };

  deleteCategory = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const authUserId = Number(res.locals.user.id);
    if (!authUserId) {
      throw new ApiError("Unauthorized", 403);
    }
    await this.categoryService.deleteCategory(id, authUserId);
    return res.status(204).send();
  };
}
