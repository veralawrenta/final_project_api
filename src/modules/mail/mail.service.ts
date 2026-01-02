import { createTransport, Transporter } from "nodemailer";
import handlebars from "handlebars";
import path from "path";
import fs from "fs/promises";

export class MailService {
  transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  renderTemplate = async (templateName: string, context: any) => {
    console.log("__dirname:", __dirname);
    const templateDir = path.resolve(__dirname, "./templates");
    
    const templatePath = path.join(
      //process.cwd(),
      //"src",
      //"modules",
      //"mail",
      //"templates",
      templateDir, `${templateName}.hbs`);
    const templateSource = await fs.readFile(templatePath, "utf-8");
    const compiledTemplate = handlebars.compile(templateSource);
    return compiledTemplate(context);
  };

  sendMail = async (
    to: string,
    subject: string,
    templateName: string,
    context: any
  ) => {
    const html = await this.renderTemplate(templateName, context);
    await this.transporter.sendMail({
      to,
      subject,
      html,
    });
  };
}
