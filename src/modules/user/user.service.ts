import { PrismaClient, Role } from "../../../generated/prisma/client";
import { CloudinaryService } from "../../cloudinary/cloudinary.service";
import { prisma } from "../../lib/prisma";
import { ApiError } from "../../utils/api-error";
import { UpdateDataTenantDTO, UpdateDataUserDTO } from "./dto/user-dto";

export class UserService {
  private prisma: PrismaClient;
  cloudinaryService: CloudinaryService;

  constructor() {
    this.prisma = prisma;
    this.cloudinaryService = new CloudinaryService();
  }

  getAllUsers = async () => {
    const users = await this.prisma.user.findMany();
    return users;
  };

  getUserById = async (id: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    console.log("Fetched user:", user);
    return user;
  };

  uploadImageUrl = async (id: number, imageUrl: Express.Multer.File) => {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    if (user.isVerified === false) {
      throw new ApiError("Please verify your account first", 400);
    }
    const { secure_url } = await this.cloudinaryService.upload(imageUrl);

    await this.prisma.user.update({
      where: { id },
      data: { imageUrl: "secure_url" },
    });
    console.log("Uploaded image for user ID:", id);
    return { message: "Image uploaded successfully", imageUrl: secure_url };
  };

  updateDataUser = async (body: Partial<UpdateDataUserDTO>) => {
    const user = await this.prisma.user.findUnique({
      where: { id: body.id },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    if (user.role !== Role.USER) {
      throw new ApiError("User role is mismatch", 400);
    }

    if (user.isVerified === false) {
      throw new ApiError("Please verify your account first", 400);
    }

    const data: any = {};

    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.address !== undefined) data.address = body.address;
    if (body.aboutMe !== undefined) data.aboutMe = body.aboutMe;

    const updatedUser = await this.prisma.user.update({
      where: { id: body.id },
      data,
    });
    console.log("Updated user:", updatedUser);
    return updatedUser;
  };
  updateDataTenant = async (body: Partial<UpdateDataTenantDTO>) => {
    const tenant = await this.prisma.user.findUnique({
      where: { id: body.id },
      include: { tenant: true },
    });

    if (!tenant) {
      throw new ApiError("User not found", 404);
    }

    if (tenant.role !== Role.TENANT) {
      throw new ApiError("User is not a tenant", 400);
    }

    if (tenant.isVerified === false) {
      throw new ApiError("Please verify your account first", 400);
    }
    const userData: any = {};
    const tenantData: any = {};

    if (body.firstName !== undefined) userData.firstName = body.firstName;
    if (body.lastName !== undefined) userData.lastName = body.lastName;
    if (body.phone !== undefined) userData.phone = body.phone;
    if (body.address !== undefined) userData.address = body.address;
    if (body.aboutMe !== undefined) userData.aboutMe = body.aboutMe;

    if (body.tenantName !== undefined) tenantData.tenantName = body.tenantName;
    if (body.bankName !== undefined) tenantData.bankName = body.bankName;
    if (body.bankNumber !== undefined) tenantData.bankNumber = body.bankNumber;

    const updatedUser = await this.prisma.user.update({
      where: { id: body.id },
      data: {
        ...userData,
        tenant: Object.keys(tenantData).length
          ? { update: tenantData }
          : undefined,
      },
      include: { tenant: true },
    });
    console.log("Updated tenant:", updatedUser);
    return updatedUser;
  };

  deleteUser = async (id: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    const deletedUser = await this.prisma.user.delete({
      where: { id },
    });
    console.log("Deleted user:", deletedUser);
    return deletedUser;
  };

  getMyProfile = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        aboutMe: true,
        imageUrl: true,
        isVerified: true,
        tenant: {
          select: {
            tenantName: true,
            bankName: true,
            bankNumber: true,
          },
        },
        createdAt: true,
      },
    });
  
    if (!user) {
      throw new ApiError("User not found", 404);
    };
  
    return user;
  };
}
