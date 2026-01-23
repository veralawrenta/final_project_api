import { PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { CreatePropertyDTO, UpdatePropertyDTO } from "./dto/property.dto";

export class PropertyService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  getAllProperties = async () => {
    const properties = await this.prisma.property.findMany({});
    return properties;
  };

  getAllPropertiesByTenant = async (tenantId: number) => {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new ApiError("Tenant not found", 400);
    }

    const properties = await this.prisma.property.findMany({
      where: { tenantId: tenantId },
      include: {
        category: true,
        city: true,
        propertyImages: true,
        rooms: true,
        amenities: true,
      },
    });

    if (properties.length === 0) {
      throw new ApiError("No properties found for this tenant", 400);
    }
    return properties;
  };

  getPropertyById = async (id: number) => {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        category: true,
        city: true,
        propertyImages: true,
        rooms: true,
        amenities: true,
      },
    });
    if (!property) {
      throw new ApiError("Property ID not found", 400);
    }
    return property;
  };

  createProperty = async (tenantId: number, body: CreatePropertyDTO) => {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new ApiError("Unauthorized", 400);
    }
    const existingProperty = await this.prisma.property.findFirst({
      where: {
        name: body.name,
        address: body.address,
        tenantId,
        deletedAt: null,
      },
    });
    if (existingProperty) {
      throw new ApiError(
        "Property with same name and address already exists",
        400
      );
    }
    const createdProperty = await this.prisma.property.create({
      data: {
        name: body.name,
        description: body.description,
        address: body.address,
        cityId: body.cityId,
        categoryId: body.categoryId,
        propertyType: body.propertyType,
        latitude: body.latitude,
        longitude: body.longitude,
        tenantId,
      },
    });
    return createdProperty;
  };

  updatePropertyById = async (
    id: number,
    tenantId: number,
    body: Partial<UpdatePropertyDTO>
  ) => {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 400);
    }

    if (property.tenantId !== tenantId) {
      throw new ApiError("Tenant is unauthorized", 403);
    }

    const propertyData: any = {};

    if (body.name !== undefined) propertyData.name === body.name;
    if (body.description !== undefined)
      propertyData.description !== body.description;
    if (body.address !== undefined) propertyData.address === body.description;
    if (body.cityId !== undefined) propertyData.cityId === body.cityId;
    if (body.categoryId !== undefined)
      propertyData.categoryId !== body.categoryId;
    if (body.propertyType !== undefined)
      propertyData.propertyData !== body.propertyType;
    if (body.latitude !== undefined) propertyData.latitude === body.latitude;
    if (body.longitude !== undefined) propertyData.longitude === body.longitude;

    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: propertyData,
    });
    return updatedProperty;
  };

  deletePropertyById = async (id: number, tenantId: number) => {
    const property = await this.prisma.property.findFirst({
      where: { id, deletedAt: null },
    });
    if (!property) {
      throw new ApiError("Property not found", 400);
    };
    if (property.tenantId !== tenantId) { throw new ApiError ("Unauthorized", 400)};

    const deletedProperty = await this.prisma.property.update({
        where: { id },
        data: {
            deletedAt: new Date(),
        },
    });
    return deletedProperty;
  };
}
