import cors from "cors";
import express, { Express } from "express";
import "reflect-metadata";
import { PORT } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
//import { SampleRouter } from "./modules/sample/sample.router";
import { AmenityRouter } from "./modules/amenity/amenity.router";
import { AuthRouter } from "./modules/auth/auth.router";
import { CityRouter } from "./modules/city/city.router";
import { OAuthRouter } from "./modules/oAuth/oAuth.router";
import { PropertyRouter } from "./modules/property/property.router";
import { UserRouter } from "./modules/user/user.router";
import { RoomNonAvailabilityRouter } from "./modules/roomNonAvailability/roomNonAvailability.router";
import { PropertyImagesRouter } from "./modules/propertyImage/propertyImage.router";
import { RoomImageRouter } from "./modules/roomImage/roomImage.router";
import { SeasonalRateRouter } from "./modules/seasonalRates/seasonalRates.router";
import { RoomRouter } from "./modules/room/room.router";
import { CategoryRouter } from "./modules/category/category.router";
import { DashboardRouter } from "./modules/dashboard/dashboard.router";

export class App {
  app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
  }

  private configure() {
    this.app.use(cors(({
      origin: "http://localhost:3000",
      credentials: true,
    })))
    this.app.use(express.json());
  }

  private routes() {
    //const sampleRouter = new SampleRouter();
    const authRouter = new AuthRouter();
    const oAuthRouter = new OAuthRouter();
    const userRouter = new UserRouter();
    const dashboardRouter = new DashboardRouter ();
    const propertyRouter = new PropertyRouter();
    const roomRouter = new RoomRouter();
    const cityRouter = new CityRouter();
    const categoryRouter = new CategoryRouter();
    const amenityRouter = new AmenityRouter();
    const roomNonAvailabilityRouter = new RoomNonAvailabilityRouter();
    const propertyImagesRouter = new PropertyImagesRouter();
    const roomImageRouter = new RoomImageRouter();
    const seasonalRateRouter = new SeasonalRateRouter();

    //this.app.use("/samples", sampleRouter.getRouter());
    this.app.use("/auth", authRouter.getRouter())
    this.app.use("/oauth", oAuthRouter.getRouter())
    this.app.use("/users", userRouter.getRouter())
    this.app.use("/tenants", dashboardRouter.getRouter())
    this.app.use("/properties", propertyRouter.getRouter())
    this.app.use("/rooms", roomRouter.getRouter())
    this.app.use("/categories", categoryRouter.getRouter())
    this.app.use("/cities", cityRouter.getRouter())
    this.app.use("/amenities", amenityRouter.getRouter())
    this.app.use("/rooms-non-availability", roomNonAvailabilityRouter.getRouter())
    this.app.use("/property-images", propertyImagesRouter.getRouter());
    this.app.use("/room-images", roomImageRouter.getRouter());
    this.app.use("/seasonal-rates", seasonalRateRouter.getRouter());
  }

  private handleError() {
    this.app.use(errorMiddleware);
  }

  public start() {
    this.app.listen(PORT, () => {
      console.log(`Server running on port: ${PORT}`);
    });
  }
}
