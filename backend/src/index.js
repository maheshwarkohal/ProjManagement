import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import connectDB from "./db/index.js";
import { initializeSocket } from "./socket/chat.socket.js";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    const server = http.createServer(app);
    const io = initializeSocket(server);
    app.set("io", io);

    server.listen(port, () => {
      console.log(`Example app listening on port http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });
