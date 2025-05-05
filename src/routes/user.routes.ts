import { Router } from 'express';
import { getAllEmployees, getAllUsers } from '../controllers/user.controller';
import { authorizeRoles } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAllUsers);
router.get('/employees', getAllEmployees);

export default router;