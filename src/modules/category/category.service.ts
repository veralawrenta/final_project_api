import { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import {
  CreateCategoryDTO,
  GetAllCategoriesDTO,
  UpdateCategoryDTO,
} from "./dto/category.dto";

export class CategoryService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  getAllCategoriesByTenant = async (
    tenantId: number,
    query: GetAllCategoriesDTO
  ) => {
    const { page, take, sortBy, sortOrder, search } = query;

    const whereClause: Prisma.CategoryWhereInput = {
      tenantId,
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

  getCategoryById = async (id: number, tenantId: number) => {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
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

  createCategory = async (tenantId: number, body: CreateCategoryDTO) => {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new ApiError("Tenant not found", 404);
    }

    const existingCategory = await this.prisma.category.findFirst({
      where: { name: body.name, tenantId, deletedAt: null },
    });
    if (existingCategory) {
      throw new ApiError("Category already exist", 409);
    }

    const createdCategory = await this.prisma.category.create({
      data: {
        name: body.name,
        tenantId,
      },
    });
    return createdCategory;
  };

  updateCategory = async (
    id: number,
    tenantId: number,
    body: UpdateCategoryDTO
  ) => {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!category) {
      throw new ApiError("Category not found", 404);
    }

    if (category.tenantId !== tenantId) {
      throw new ApiError("Unauthorized", 403);
    }

    const createdCategory = await this.prisma.category.update({
      where: { id },
      data: {
        name: body.name,
      },
    });
    return createdCategory;
  };

  deleteCategory = async (id: number, tenantId: number) => {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
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
