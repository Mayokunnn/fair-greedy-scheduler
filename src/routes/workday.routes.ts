import express from 'express';
import { authorizeRoles } from '../middleware/auth.middleware';
import { generateWorkdays } from '../controllers/workday.controller';

const router = express.Router();

router.post('/generate', generateWorkdays);

export default router;