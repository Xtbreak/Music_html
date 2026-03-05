const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const { upload, checkFileSize } = require('../middleware/upload');

// 获取所有歌曲（公开）
router.get('/', async (req, res) => {
  try {
    const { category_id } = req.query;

    let query = `
      SELECT s.*, c.name as category_name
      FROM songs s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.deleted_at IS NULL
    `;
    let params = [];

    if (category_id) {
      query += ' AND s.category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const songs = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json(songs);
  } catch (error) {
    console.error('获取歌曲错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 搜索歌曲（公开）
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    const songs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.*, c.name as category_name
         FROM songs s
         LEFT JOIN categories c ON s.category_id = c.id
         WHERE s.title LIKE ? AND s.deleted_at IS NULL
         ORDER BY s.created_at DESC`,
        [`%${q}%`],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(songs);
  } catch (error) {
    console.error('搜索歌曲错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个歌曲详情（公开）
router.get('/:id', async (req, res) => {
  try {
    const song = await new Promise((resolve, reject) => {
      db.get(
        `SELECT s.*, c.name as category_name
         FROM songs s
         LEFT JOIN categories c ON s.category_id = c.id
         WHERE s.id = ? AND s.deleted_at IS NULL`,
        [req.params.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!song) {
      return res.status(404).json({ error: '歌曲不存在' });
    }

    res.json(song);
  } catch (error) {
    console.error('获取歌曲错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 新增歌曲（需要管理员权限，支持图片上传）
router.post('/', requireAdmin, upload.fields([
  { name: 'scoreImage', maxCount: 1 }
]), checkFileSize, async (req, res) => {
  const { title, category_id, content } = req.body;
  const scoreImage = req.files['scoreImage'] ? req.files['scoreImage'][0].filename : null;

  try {
    // 检查歌曲名称是否已存在
    const existingSong = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM songs WHERE title = ?', [title], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingSong) {
      return res.status(400).json({ error: '歌曲名称已存在，请使用其他名称' });
    }

    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO songs (title, category_id, score_image, content, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, category_id, scoreImage, content, req.session.user.id, req.session.user.id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      id: result.lastID,
      message: '歌曲创建成功'
    });
  } catch (error) {
    console.error('创建歌曲错误:', error);
    res.status(500).json({ error: '创建歌曲失败' });
  }
});

// 修改歌曲（需要管理员权限，支持图片更新）
router.put('/:id', requireAdmin, upload.fields([
  { name: 'scoreImage', maxCount: 1 }
]), checkFileSize, async (req, res) => {
  const { title, category_id, content } = req.body;
  const hasNewImage = req.files['scoreImage'];
  const scoreImage = hasNewImage ? req.files['scoreImage'][0].filename : req.body.score_image;

  try {
    // 检查歌曲名称是否已被其他歌曲使用
    const existingSong = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM songs WHERE title = ? AND id != ?', [title, req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingSong) {
      return res.status(400).json({ error: '歌曲名称已存在，请使用其他名称' });
    }

    // 如果上传了新图片，删除旧图片
    if (hasNewImage) {
      const oldSong = await new Promise((resolve, reject) => {
        db.get('SELECT score_image FROM songs WHERE id = ?', [req.params.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (oldSong && oldSong.score_image) {
        const { deleteImage } = require('../middleware/upload');
        deleteImage(oldSong.score_image, 'scores');
      }
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE songs
         SET title = ?, category_id = ?, score_image = ?, content = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [title, category_id, scoreImage, content, req.session.user.id, req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '歌曲更新成功' });
  } catch (error) {
    console.error('更新歌曲错误:', error);
    res.status(500).json({ error: '更新歌曲失败' });
  }
});

// 删除歌曲（软删除，移入回收站）
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // 软删除：设置 deleted_at
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE songs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '歌曲已移入回收站' });
  } catch (error) {
    console.error('删除歌曲错误:', error);
    res.status(500).json({ error: '删除歌曲失败' });
  }
});

// ==================== 回收站功能 ====================

// 获取回收站歌曲列表（需要管理员权限）
router.get('/trash/list', requireAdmin, async (req, res) => {
  try {
    const songs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT s.*, c.name as category_name
         FROM songs s
         LEFT JOIN categories c ON s.category_id = c.id
         WHERE s.deleted_at IS NOT NULL
         ORDER BY s.deleted_at DESC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json(songs);
  } catch (error) {
    console.error('获取回收站错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 恢复歌曲（需要管理员权限）
router.post('/trash/:id/restore', requireAdmin, async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE songs SET deleted_at = NULL WHERE id = ?',
        [req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '歌曲已恢复' });
  } catch (error) {
    console.error('恢复歌曲错误:', error);
    res.status(500).json({ error: '恢复歌曲失败' });
  }
});

// 永久删除歌曲（需要管理员权限）
router.delete('/trash/:id/permanent', requireAdmin, async (req, res) => {
  try {
    // 先获取歌曲信息，删除关联的图片
    const song = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM songs WHERE id = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (song && song.score_image) {
      const { deleteImage } = require('../middleware/upload');
      deleteImage(song.score_image, 'scores');
    }

    // 永久删除歌曲记录
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM songs WHERE id = ?', [req.params.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: '歌曲已永久删除' });
  } catch (error) {
    console.error('永久删除歌曲错误:', error);
    res.status(500).json({ error: '永久删除失败' });
  }
});

// 清空回收站（需要管理员权限）
router.delete('/trash/clear', requireAdmin, async (req, res) => {
  try {
    // 获取所有回收站歌曲的图片
    const songs = await new Promise((resolve, reject) => {
      db.all(
        'SELECT score_image FROM songs WHERE deleted_at IS NOT NULL',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // 删除所有图片
    const { deleteImage } = require('../middleware/upload');
    songs.forEach(song => {
      if (song.score_image) {
        deleteImage(song.score_image, 'scores');
      }
    });

    // 永久删除所有回收站歌曲
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM songs WHERE deleted_at IS NOT NULL', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: '回收站已清空' });
  } catch (error) {
    console.error('清空回收站错误:', error);
    res.status(500).json({ error: '清空回收站失败' });
  }
});

module.exports = router;
