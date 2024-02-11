import express from 'express';
import { UrlController } from '../controllers/UrlController';

export const router = express.Router();

router.get("/generate", UrlController.generate);