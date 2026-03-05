// 认证中间件 - 检查是否已登录
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: '未登录，请先登录' });
  }
}

// 管理员认证中间件 - 检查是否是管理员或超级管理员
function requireAdmin(req, res, next) {
  if (req.session && req.session.user &&
      (req.session.user.role === 'admin' || req.session.user.role === 'super_admin')) {
    next();
  } else {
    res.status(403).json({ error: '需要管理员权限' });
  }
}

// 超级管理员认证中间件 - 检查是否是超级管理员
function requireSuperAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ error: '需要超级管理员权限' });
  }
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireSuperAdmin
};
