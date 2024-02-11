import { Request, Response } from 'express';
import { io } from '../../index';
import { clients } from '../socket/onConnection';

export const ClientsController = {
  get: async (_req: Request, res: Response) => {
    try {
      const clientsWithUsername = clients.filter((client) => client.username);
      res.json(clientsWithUsername);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error ziom' });
    }
  },
  connect: async (_req: Request, res: Response) => {
    try {
      io.emit('hello', 'hello ziom');
      res.status(200);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error ziom' });
    }
  },
  checkIsLogged: async (req: Request, res: Response) => {
    try {
      console.log('1', req.body);
      if (req.body.player.username) {
        res.status(200).json({
          message: `Player ${req.body.player.username} is logged with Id: ${req.body.player.id}`,
        });
      } else {
        res.status(308).json({
          message: `Player with Id: ${req.body.player.id} has no username!`,
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error ziom' });
    }
  },
  setUsername: async (req: Request, res: Response) => {
    try {
      res.status(200).json({username: req.body.player.username})
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error ziom' });
    }
  },
};
