import { Router } from "express";
import { OAuthController } from "./oAuth.controller";

export class OAuthRouter {
    private router: Router;
    private oAuthController: OAuthController;
    //private jwt : JWTMiddleware;
  
    constructor() {
      this.router = Router();
      this.oAuthController = new OAuthController();
      //this.jwt = new JWTMiddleware();
      this.initializedRoutes();
    }
  
    private initializedRoutes = () => {
      this.router.post("/google/login", this.oAuthController.googleLogin);
    };
    
    getRouter = () => {
      return this.router;
    };
  }