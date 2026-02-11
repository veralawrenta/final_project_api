import { Prisma, PrismaClient } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { TenantService } from "../tenant/resolve-tenant.js";
import {
  CreateCategoryDTO,
  GetAllCategoriesDTO,
  UpdateCategoryDTO,
} from "./dto/category.dto.js";

export class CategoryService {
  private prisma: PrismaClient;
  tenantService : TenantService;

  constructor() {
    this.prisma = prisma;
    this.tenantService = new TenantService();
  }

  getAllCategoriesByTenant = async (
    authUserId: number,
    query: GetAllCategoriesDTO
  ) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    
    const whereClause: Prisma.CategoryWhereInput = {
      tenantId: tenant.id,
      deletedAt: null,
    };

    if (search) {
      whereClause.name = { contains: search, mode: "insensitive" };
    }
    const categories = await this.prisma.category.findMany({
      where: whereClause,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * take,
      take: take,
      include: {
        _count: {
          select: {
            properties: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
    const count = await this.prisma.category.count({
      where: whereClause,
    });

    const mappedCategories = categories.map((category) => ({
      id: category.id,
      name: category.name,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
      propertiesCount: category._count.properties,
    }));

    return {
      data: mappedCategories,
      meta: { page, take, total: count },
    };
  };

  getCategoryById = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
      include: {
        properties: {
          where: { deletedAt: null },
          include: {
            rooms: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });
    if (!category) {
      throw new ApiError("Category not found", 404);
    }
    return category;
  };

  createCategory = async (
    authUserId: number,
    body: CreateCategoryDTO
  ) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        name: body.name,
        tenantId: tenant.id,
        deletedAt: null,
      },
    });
  
    if (existingCategory) {
      throw new ApiError("Category already exists", 409);
    };
    return this.prisma.category.create({
      data: {
        name: body.name,
        tenantId: tenant.id,
      },
    });
  };

  updateCategory = async (
    id: number,
    authUserId: number,
    body: UpdateCategoryDTO
  ) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!category) {
      throw new ApiError("Category not found", 404);
    };

    const createdCategory = await this.prisma.category.update({
      where: { id },
      data: {
        name: body.name,
      },
    });
    return createdCategory;
  };

  deleteCategory = async (id: number, authUserId: number) => {
    const tenant = await this.tenantService.resolveTenantByUserId(authUserId);
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId: tenant.id, deletedAt: null },
    });
    if (!category) {
      throw new ApiError(" Category not found ", 404);
    };

    const deletedCategory = await this.prisma.category.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    return deletedCategory;
  };
}
