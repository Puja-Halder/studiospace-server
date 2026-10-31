import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../config/auth.js";

export const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Please log in to access this resource.",
      });
    }

    req.user = session.user;
    req.authSession = session.session;

    next();
  } catch (error) {
    console.error("Authentication check failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to verify your login session.",
    });
  }
};
