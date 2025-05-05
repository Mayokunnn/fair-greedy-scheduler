export const authorizeRoles = (...allowedRoles: string[]) => {
    return (req: any, res: any, next: Function) => {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }
      next();
    };
  };
  