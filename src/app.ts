import cors from "cors";
import express, { Express } from "express";
import "reflect-metadata";
import { PORT } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";
//import { SampleRouter } from "./modules/sample/sample.router";
import { AuthRouter } from "./modules/auth/auth.router";
import { OAuthRouter } from "./modules/oAuth/oAuth.router";
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
    //this.app.use(cors());
    this.app.use(express.json());
  }

  private routes() {
    //const sampleRouter = new SampleRouter();
    const authRouter = new AuthRouter();
    const oAuthRouter = new OAuthRouter();
    const userRouter = new UserRouter();

    //this.app.use("/samples", sampleRouter.getRouter());
    this.app.use("/auth", authRouter.getRouter())
    this.app.use("/oauth", oAuthRouter.getRouter())
    this.app.use("/users", userRouter.getRouter())
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
