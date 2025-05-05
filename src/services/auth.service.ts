import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const SALT_ROUNDS =  10

type Role = 'ADMIN' | 'EMPLOYEE';

export const signup = async (email: string, password: string, fullName: string, role: Role = "EMPLOYEE") => {
  const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt);  
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        schedules: true,
      },
    });
    return user;
  };
  

export const signin = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const user = await prisma.user.findUnique({ where: { email },  });

  if (!user) {
    throw new Error('User not found');
  }


  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: '7d',
  });

  return { token, user };
};

export const getMe = async (token: string) => {
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId || decoded.id }, select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
      schedules: true,
    },});
    return user;
  } catch {
    throw new Error('Invalid token');
  }
};
