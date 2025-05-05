import { Router } from 'express';
import { register, login, getUser } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', getUser);

export default router;