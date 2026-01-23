import { Router } from "express";
import { OAuthController } from "./oAuth.controller";

export class OAuthRouter {
    private router: Router;
    private oAuthController: OAuthController;
  
    constructor() {
      this.router = Router();
      this.oAuthController = new OAuthController();
      this.initializedRoutes();
    }
  
    private initializedRoutes = () => {
      this.router.post("/google/login", this.oAuthController.googleLogin);
    };
    
    getRouter = () => {
      return this.router;
    };
  }