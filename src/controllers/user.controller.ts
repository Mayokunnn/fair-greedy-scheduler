import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllEmployees = async (req: any, res: any) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        schedules: {
          select: {
            id: true,
            workdayId: true,
            assignedById: true,
            createdAt: true,
          },
        },
      },
    });
    
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: "Error fetching employees", error: err });
  }
};
export const getAllUsers = async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
      schedules: true,
    },});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err });
  }
};
