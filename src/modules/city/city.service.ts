import { PrismaClient } from "../../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";

export class CityService {
    private prisma: PrismaClient;
  
    constructor() {
      this.prisma = prisma;
    }

    getAllCities = async (search?: string) => {
      const cities = await this.prisma.city.findMany({
        where: search
          ? {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : {},
        orderBy: {
          name: 'asc',
        },
      });
      return cities;
    };
}