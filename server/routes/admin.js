const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { db } = require('../database');
const { requireSuperAdmin } = require('../middleware/auth');

// 获取所有管理员（仅超级管理员）
router.get('/users', requireSuperAdmin, async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(users);
  } catch (error) {
    console.error('获取用户错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 创建新管理员（仅超级管理员）
router.post('/users', requireSuperAdmin, async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: '用户名、密码和角色不能为空' });
  }

  if (role !== 'admin' && role !== 'super_admin') {
    return res.status(400).json({ error: '角色必须是 admin 或 super_admin' });
  }

  try {
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      id: result.lastID,
      message: '用户创建成功'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    console.error('创建用户错误:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

// 修改管理员信息（仅超级管理员）
router.put('/users/:id', requireSuperAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  const userId = req.params.id;

  try {
    // 检查是否是当前用户
    if (parseInt(userId) === req.session.user.id) {
      return res.status(400).json({ error: '不能修改自己的账户' });
    }

    // 检查用户是否存在
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 更新用户信息
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
          [username, hashedPassword, role, userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET username = ?, role = ? WHERE id = ?',
          [username, role, userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({ success: true, message: '用户更新成功' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    console.error('更新用户错误:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
});

// 删除管理员（仅超级管理员）
router.delete('/users/:id', requireSuperAdmin, async (req, res) => {
  const userId = req.params.id;

  try {
    // 检查是否是当前用户
    if (parseInt(userId) === req.session.user.id) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

module.exports = router;
