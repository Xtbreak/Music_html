const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');

// 获取所有分类（公开）
router.get('/', async (req, res) => {
  try {
    const categories = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM categories ORDER BY id', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 为每个分类获取歌曲数量
    const categoriesWithCount = await Promise.all(categories.map(async (category) => {
      const count = await new Promise((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM songs WHERE category_id = ? AND deleted_at IS NULL',
          [category.id],
          (err, result) => {
            if (err) reject(err);
            else resolve(result.count);
          }
        );
      });
      return { ...category, song_count: count };
    }));

    res.json(categoriesWithCount);
  } catch (error) {
    console.error('获取分类错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取单个分类（公开）
router.get('/:id', async (req, res) => {
  try {
    const category = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM categories WHERE id = ?',
        [req.params.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    res.json(category);
  } catch (error) {
    console.error('获取分类错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 新增分类（需要管理员权限）
router.post('/', requireAdmin, async (req, res) => {
  const { name, description } = req.body;

  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [name, description],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });

    res.json({
      success: true,
      id: result.lastID,
      message: '分类创建成功'
    });
  } catch (error) {
    console.error('创建分类错误:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 修改分类（需要管理员权限）
router.put('/:id', requireAdmin, async (req, res) => {
  const { name, description } = req.body;

  try {
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE categories SET name = ?, description = ? WHERE id = ?',
        [name, description, req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true, message: '分类更新成功' });
  } catch (error) {
    console.error('更新分类错误:', error);
    res.status(500).json({ error: '更新分类失败' });
  }
});

// 删除分类（需要管理员权限）
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // 先删除该分类下的所有歌曲
    const songs = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM songs WHERE category_id = ?', [req.params.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // 删除歌曲关联的图片
    const { deleteImage } = require('../middleware/upload');
    for (const song of songs) {
      if (song.score_image) {
        deleteImage(song.score_image, 'scores');
      }
    }

    // 删除该分类下的所有歌曲
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM songs WHERE category_id = ?', [req.params.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 删除分类
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM categories WHERE id = ?', [req.params.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      success: true,
      message: '分类及其下的所有歌曲已删除',
      deletedSongsCount: songs.length
    });
  } catch (error) {
    console.error('删除分类错误:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

module.exports = router;
