import multer from "multer";

export class UploaderMiddleware {
  upload = () => {
    return multer({
    storage : multer.memoryStorage(),
    limits : { fileSize: 1 * 1024 * 1024 }, 

    fileFilter: (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      const allowedMimeTypes = ["image/jpg", "image/jpeg", "image/png", "image/gif"];
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only image files are allowed."));
      };
    },
   });
  };
};