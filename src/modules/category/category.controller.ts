import { Request, Response } from "express";
import { CategoryService } from "./category.service";
import { ApiError } from "../../utils/api-error";
import { plainToInstance } from "class-transformer";
import { CreateCategoryDTO, UpdateCategoryDTO } from "./dto/category.dto";

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getAllCategoriesByTenant = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    if (!tenantId) {
      throw new ApiError("Unauthorized", 403);
    }
    const result = await this.categoryService.getAllCategoriesByTenant(
      tenantId
    );
    return res.status(200).send(result);
  };

  getCategoryById = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    const id = Number(req.params.id);
    if (!tenantId) {
      throw new ApiError("Unauthorized", 403);
    }
    const result = await this.categoryService.getCategoryById(
      id,
      tenantId
    );
    return res.status(200).send(result);
  };

  createCategory = async (req: Request, res: Response) => {
    const tenantId = Number(res.locals.user.tenant.id);
    if (!tenantId) {
      throw new ApiError("Unauthorized", 403);
    }
    const data = plainToInstance(CreateCategoryDTO, req.body);
    const result = await this.categoryService.createCategory(tenantId, data);
    return res.status(201).send(result);
  };

  updateCategory = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId = Number(res.locals.user.tenant.id);
    const data = plainToInstance(UpdateCategoryDTO, req.body);
    const result = await this.categoryService.updateCategory(
      id,
      tenantId,
      data
    );
    return res.status(200).send(result);
  };

  deleteCategory = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tenantId = Number(res.locals.user.tenant.id);
    await this.categoryService.deleteCategory(id, tenantId);
    return res.status(204).send()
  };
}
