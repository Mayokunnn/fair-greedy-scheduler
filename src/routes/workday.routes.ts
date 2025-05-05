import express from 'express';
import { authorizeRoles } from '../middleware/auth.middleware';
import { generateWorkdays } from '../controllers/workday.controller';

const router = express.Router();

router.post('/generate', authorizeRoles('ADMIN'), generateWorkdays);

export default router;