import { Router } from "express";
import { CategoryController } from "./category.controller";
import { JWTMiddleware } from "../../middlewares/jwt.middleware";
import { RoleMiddleware } from "../../middlewares/role.middleware";

export class CategoryRouter {
  router: Router;
  categoryController: CategoryController;
  jwtMiddleware: JWTMiddleware;
  roleMiddleware: RoleMiddleware;

  constructor() {
    this.router = Router();
    this.categoryController = new CategoryController();
    this.jwtMiddleware = new JWTMiddleware();
    this.roleMiddleware = new RoleMiddleware();
    this.initializedRoutes();
  }
  private initializedRoutes = () => {
    this.router.get("/", this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.categoryController.getAllCategoriesByTenant);
    this.router.get("/:id", this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.categoryController.getCategoryById);
    this.router.post("/", this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.categoryController.createCategory);
    this.router.patch("/:id",this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.categoryController.updateCategory);
    this.router.delete("/:id",this.jwtMiddleware.verifyToken(process.env.JWT_ACCESS_SECRET!), this.roleMiddleware.requireRoles("TENANT"), this.categoryController.deleteCategory)
  };

  getRouter = () => {
    return this.router;
  };
}
