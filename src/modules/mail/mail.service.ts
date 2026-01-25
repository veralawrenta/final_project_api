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
    const templatePath = path.join(
      process.cwd(),
      "src",
      "modules",
      "mail",
      "templates",
      `${templateName}.hbs`
    );
  
    const templateSource = await fs.readFile(templatePath, "utf-8");
    const compiledTemplate = handlebars.compile(templateSource);
    return compiledTemplate(context);
  }

  sendMail = async (
    to: string,
    subject: string,
    templateName: string,
    context: any
  ) => {
    const html = await this.renderTemplate(templateName, context);
   const info = await this.transporter.sendMail({
      to,
      subject,
      html,
    });
    return info;
  };
}
