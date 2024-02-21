import { Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { io } from '../..';
import { userReconnect } from './userReconnect';

export type User = {
  id: string;
  username: string;
};
export const users: Set<User> = new Set();
const getUsersArray = () => Array.from(users);

export const onConnection = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  console.log(`Client is connected with id: ${socket.id}`);

  io.emit('socket-id', socket.id);
  socket.emit('user-id', socket.id);

  socket.on('user-login', (user: User, callback: Function) => {
    const isUsernameTaken = Array.from(users).some(
      (existingUser) => existingUser.username === user.username
    );

    if (isUsernameTaken) {
      callback({ success: false, message: 'Username taken' });
    } else {
      users.add(user);
      callback({ success: true, message: 'User added successfully' });
    }
  });

  socket.on('user-entered-lobby', () => {
    io.emit('users-list-update', getUsersArray());
  });

  socket.on('user-reconnect', (username) => userReconnect(username, socket.id));
  socket.on('user-logout', (username): void => {
    const existingUser = Array.from(users).find(
      (user) => user.username === username
    );

    if (existingUser) {
      users.delete(existingUser);
    }

    io.emit('users-list-update', getUsersArray());
  });

  socket.on('disconnect', (reason): void => {
    const existingUser = Array.from(users).find(
      (user) => user.id === socket.id
    );

    if (existingUser) {
      users.delete(existingUser);
    }

    io.emit('users-list-update', getUsersArray());
  });

  socket.on('send-message', (message) => {
    console.log(`Message: ${message}, from user id: ${socket.id}`);
    io.emit('receive-message', message);
  });
};
