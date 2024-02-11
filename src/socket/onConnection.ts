import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { io } from "../..";

export const clients: { id: string; username: string }[] = [];

export const onConnection = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  console.log(`Client is connected with id: ${socket.id}`);

  clients.push({ id: socket.id, username: "" });

  io.emit("socket-id", socket.id);
  socket.emit("user-id", socket.id);

  

  socket.on("disconnect", (reason): void => {
    const searchedClientIndex = clients.findIndex(
      (connectedClient) => connectedClient.id === socket.id
    );
    
    if (searchedClientIndex !== -1) {
      console.log(socket.id, "disconnected")
      clients.splice(searchedClientIndex, 1);
    }
  });

  socket.on("send-message", (message) => {
    console.log(`Message: ${message}, from user id: ${socket.id}`);
    io.emit("receive-message", message);
  });
};
