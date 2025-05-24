import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.verifications.email_verified) {
      return res.status(403).json({ message: 'Please verify your email' });
    }

    if (user.authentication.mfa_setting.enabled && !req.headers['x-mfa-code']) {
      return res.status(403).json({ message: 'MFA code required' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const isAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role.admin_level === 'none') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export const isProOwner = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (
    !user ||
    !(
      user.role.is_owner &&
      user.subscription.plan === 'pro_owner' &&
      user.subscription.status === 'active'
    )
  ) {
    return res.status(403).json({ message: 'Pro owner subscription required' });
  }
  next();
};
  