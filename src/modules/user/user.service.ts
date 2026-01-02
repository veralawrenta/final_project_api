import { PrismaClient } from "../../../generated/prisma/client";
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
    };

    getAllUsers = async () => {
        const users = await this.prisma.user.findMany();
        return users;
    }

    getUserById = async (id: number) => {
        const user = await this.prisma.user.findUnique({
            where: { id },
        })
        if (!user) {
            throw new ApiError("User not found", 404);
        };
        console.log("Fetched user:", user);
        return user;
    }

    uploadImageUrl = async (id: number, imageUrl: Express.Multer.File) => {
        const user = await this.prisma.user.findFirst({
            where: { id },
        });
        if (!user) {
            throw new ApiError("User not found", 404);
        };
        if (user.isVerified === false) {
            throw new ApiError("Please verify your account first", 400);
        };
        const {secure_url} = await this.cloudinaryService.upload(imageUrl);
        
        await this.prisma.user.update({
            where: { id },
            data: { imageUrl: "secure_url" },
        });
        console.log("Uploaded image for user ID:", id);
        return {message: "Image uploaded successfully", imageUrl: secure_url};
    };

    updateDataUser = async (body: UpdateDataUserDTO) => {
        const user = await this.prisma.user.findUnique({
            where: { id: body.id },
        });

        if (!user) {
            throw new ApiError("User not found", 404);
        };

        if (user.role !== "USER") {
            throw new ApiError("User role is mismatch", 400);
        };

        if (user.isVerified === false) {
            throw new ApiError("Please verify your account first", 400);
        };
        const updatedUser = await this.prisma.user.update({
            where: { id: body.id },
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                phone: body.phone,
                address: body.address,
                aboutMe: body.aboutMe,
            },
        });
        console.log("Updated user:", updatedUser);
        return updatedUser;
    };
    updateDataTenant = async (body: UpdateDataTenantDTO) => {
        const tenant = await this.prisma.user.findUnique({
            where: { id: body.id },
            include: { tenant: true },
        });

        if (!tenant) {
            throw new ApiError("User not found", 404);
        };
        
        if (tenant.role !== "TENANT") {
            throw new ApiError("User is not a tenant", 400);
        };

        if (tenant.isVerified === false) {
            throw new ApiError("Please verify your account first", 400);
        };

        const updatedUser = await this.prisma.user.update({
            where: { id: body.id },
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                phone: body.phone,
                address: body.address,
                aboutMe: body.aboutMe,
                tenant: {
                    update: {
                        tenantName: body.tenantName,
                        bankName: body.bankName,
                        bankNumber: body.bankNumber,
                    },
                },
            },
            include : { tenant: true },
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
        };
        const deletedUser = await this.prisma.user.delete({
            where: { id },
        });
        console.log("Deleted user:", deletedUser);
        return deletedUser;
    };
}