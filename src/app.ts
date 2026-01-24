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

export class App {
  app: Express;

  constructor() {
    this.app = express();
    this.configure();
    this.routes();
    this.handleError();
  }

  private configure() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private routes() {
    //const sampleRouter = new SampleRouter();
    const authRouter = new AuthRouter();
    const oAuthRouter = new OAuthRouter();
    const userRouter = new UserRouter();
    const propertyRouter = new PropertyRouter()
    const cityRouter = new CityRouter();
    const amenityRouter = new AmenityRouter();

    //this.app.use("/samples", sampleRouter.getRouter());
    this.app.use("/auth", authRouter.getRouter())
    this.app.use("/oauth", oAuthRouter.getRouter())
    this.app.use("/users", userRouter.getRouter())
    this.app.use("/property", propertyRouter.getRouter())
    this.app.use("/city", cityRouter.getRouter())
    this.app.use("/amenity", amenityRouter.getRouter())
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
