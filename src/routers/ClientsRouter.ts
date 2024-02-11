import express from 'express';
import { ClientsController } from '../controllers/ClientsControllers';

export const router = express.Router();

router.get('/get', ClientsController.get);
router.get('/connect', ClientsController.connect);
router.post('/islogged', ClientsController.checkIsLogged);
router.post('/username', ClientsController.setUsername);
