
const ALLOWED_FRIENDS = [
  "45446205", // Aaron (beav1982@gmail.com)
  "45488068", // AG (ag101058.aaron@gmail.com) 
  "45447124", // B3 (b3av1982@gmail.com)
  "45446935", // AA (aaron.p.beaver@gmail.com)
  "45488132", // B3 (b3av@yahoo.com)
  "45490754", // rlholan85 (rlholan85@gmail.com)
  "45524337", // zachguenther00 (zachguenther00@gmail.com)
  "46219322", // katwhite1618 (katwhite1618@gmail.com)
  "46219324", // mandyjo13 (mandyjo13@me.com)
];

export const friendsOnly = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || !req.user?.claims?.sub) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const userId = req.user.claims.sub;
  if (!ALLOWED_FRIENDS.includes(userId)) {
    return res.status(403).json({ 
      message: "Access restricted to invited friends only" 
    });
  }

  next();
};
