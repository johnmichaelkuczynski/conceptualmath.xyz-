import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import { setupSession } from "./session";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Hosting probes must not depend on cookies, authentication, or PostgreSQL.
app.get(["/healthz", "/api/healthz"], (_req, res) => {
  res.status(200).json({ status: "ok" });
});
app.get("/", (_req, res) => {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/qr-course/dist/public/index.html"),
    path.resolve(process.cwd(), "../qr-course/dist/public/index.html"),
    path.resolve(process.cwd(), "../../artifacts/qr-course/dist/public/index.html"),
  ];
  const indexHtml = candidates.find((file) => fs.existsSync(file));
  if (indexHtml) return res.status(200).sendFile(indexHtml);
  res.status(200).json({ status: "ok" });
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database-backed anonymous sessions keep each visitor's saved work separate.
setupSession(app);

app.use("/api", router);

// In production, serve the built qr-course frontend from the same process.
// On Replit the deploy sidecar handles this; on Render (single web service)
// the API server serves both /api and the static SPA.
if (process.env.NODE_ENV === "production") {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/qr-course/dist/public"),
    path.resolve(process.cwd(), "../qr-course/dist/public"),
    path.resolve(process.cwd(), "../../artifacts/qr-course/dist/public"),
  ];
  const staticDir = candidates.find((p) => fs.existsSync(p));

  if (staticDir) {
    const indexHtml = path.join(staticDir, "index.html");
    logger.info({ staticDir }, "Serving qr-course static bundle");
    app.use(express.static(staticDir, { index: false }));
    app.get(/^\/(?!api\/).*/, (_req, res, next) => {
      if (!fs.existsSync(indexHtml)) return next();
      res.sendFile(indexHtml);
    });
  } else {
    logger.warn(
      { tried: candidates },
      "qr-course static bundle not found; only /api will be served",
    );
  }
}

export default app;
