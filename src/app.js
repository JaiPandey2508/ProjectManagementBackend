import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// basic configurations :-
app.use(express.json({ limit: "16kb" })); //enables to receive json files
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //getting input and understanding from url's
app.use(express.static("public")); //makes the public folder available publicly
app.use(cookieParser()); //now we have access to cookies

//cors configurations :-
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-type", "Authorization"],
  }),
);

//import the routes
import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";

app.use("/api/v1/healthcheck", healthCheckRouter); //yaha vo /api/v1/healthcheck pe jaane se healthCheckRouter serve krega hume
// so we'll have to make changes in routes file only, not app.js
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);

app.get("/", (req, res) => {
  res.send("Welcome to basecampy");
});

export default app;
