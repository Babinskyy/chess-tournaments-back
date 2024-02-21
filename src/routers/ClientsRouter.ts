import express from 'express';
import { ClientsController } from '../controllers/ClientsControllers';

export const router = express.Router();

router.get('/getclients', ClientsController.getConnectedClients);
router.get('/connect', ClientsController.connect);
router.post('/islogged', ClientsController.checkIsLogged);
router.post('/username', ClientsController.setUsername);
