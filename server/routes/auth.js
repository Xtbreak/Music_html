const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../database');

// 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 查询用户
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, user) => {
          if (err) reject(err);
          else resolve(user);
        }
      );
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 设置session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 检查登录状态
router.get('/check-login', (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      loggedIn: true,
      user: req.session.user
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// 登出
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: '登出失败' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
