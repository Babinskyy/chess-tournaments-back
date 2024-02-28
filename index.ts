import express, { Request, Response, Application } from "express";
import dotenv from "dotenv";
import cors from "cors";

import { router as UrlRouter } from "./src/routers/UrlRouter";
import http from "http";
import { Server } from "socket.io";
import { onConnection } from "./src/socket/onConnection";

dotenv.config();

export const app: Application = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

export const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

export const clients: { id: string; username: string }[] = [];

io.on("connection", onConnection);

app.get("/", (_req: Request, res: Response) => {
  res.send("Welcome to server ziom");
});

app.use("/url", UrlRouter);

server.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});
