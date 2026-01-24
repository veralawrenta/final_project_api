import { PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export class CityService {
    private prisma: PrismaClient;
  
    constructor() {
      this.prisma = prisma;
    }

    getAllCities = async () => {
      const cities = await this.prisma.city.findMany({});
      return cities;
    };
}