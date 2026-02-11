import { PrismaClient, Role } from "../../../generated/prisma/client.js";
import { CloudinaryService } from "../../cloudinary/cloudinary.service.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../utils/api-error.js";
import { UpdateDataTenantDTO, UpdateDataUserDTO } from "./dto/user-dto.js";

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

  uploadAvatar = async (authUserId: number, avatar: Express.Multer.File) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    if (!user.isVerified) {
      throw new ApiError("Please verify your account first", 400);
    }
    const { secure_url } = await this.cloudinaryService.upload(avatar);

    await this.prisma.user.update({
      where: { id: authUserId },
      data: { avatar: secure_url },
    });
    return { message: "Image uploaded successfully", avatar: secure_url };
  };

  updateDataUser = async (authUserId: number, body: Partial<UpdateDataUserDTO>) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId },
    });

    if (!user) {
      throw new ApiError("User not found", 404);
    }

    if (user.role !== Role.USER) {
      throw new ApiError("User role is mismatch", 400);
    }

    if (!user.isVerified) {
      throw new ApiError("Please verify your account first", 400);
    }

    const data: any = {};

    if (body.firstName !== undefined) data.firstName = body.firstName;
    if (body.lastName !== undefined) data.lastName = body.lastName;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.address !== undefined) data.address = body.address;
    if (body.aboutMe !== undefined) data.aboutMe = body.aboutMe;

    const updatedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data,
    });
    return updatedUser;
  };
  updateDataTenant = async (authUserId: number, body: Partial<UpdateDataTenantDTO>) => {
    const tenant = await this.prisma.user.findUnique({
      where: { id: authUserId },
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
      where: { id: authUserId },
      data: {
        ...userData,
        tenant: Object.keys(tenantData).length
          ? { update: tenantData }
          : undefined,
      },
      include: { tenant: true },
    });
    return updatedUser;
  };

  deleteUser = async (authUserId: number) => {
    const user = await this.prisma.user.findUnique({
      where: { id: authUserId},
    });
    if (!user) {
      throw new ApiError("User not found", 404);
    }
    const deletedUser = await this.prisma.user.update({
      where: { id: authUserId },
      data: {
        deletedAt: new Date(),
      }
    });
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
        avatar: true,
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
