const bcrypt = require('bcrypt');
const { db, initializeDatabase } = require('./database');

async function initDatabase() {
  console.log('开始初始化数据库...');

  // 等待数据库表创建完成
  await initializeDatabase();

  try {
    // 1. 检查是否已有超级管理员
    const adminExists = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE role = ?', ['super_admin'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // 2. 如果没有超级管理员，创建一个
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          ['admin', hashedPassword, 'super_admin'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      console.log('✓ 创建超级管理员账户 (用户名: admin, 密码: admin123)');
    } else {
      console.log('✓ 超级管理员账户已存在');
    }

    // 3. 检查是否已有分类
    const categoriesCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (categoriesCount === 0) {
      // 创建默认分类
      const categories = [
        { name: '流行歌曲', description: '当下热门流行音乐' },
        { name: '经典老歌', description: '经典怀旧歌曲' },
        { name: '民谣歌曲', description: '民谣风格音乐' }
      ];

      for (const cat of categories) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [cat.name, cat.description],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log('✓ 创建默认分类: 流行歌曲, 经典老歌, 民谣歌曲');
    } else {
      console.log('✓ 分类已存在');
    }

    // 4. 检查是否已有歌曲
    const songsCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM songs', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (songsCount === 0) {
      // 获取分类ID
      const categories = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM categories', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const categoryMap = {};
      categories.forEach(cat => {
        if (cat.name === '流行歌曲') categoryMap['流行歌曲'] = cat.id;
        if (cat.name === '经典老歌') categoryMap['经典老歌'] = cat.id;
        if (cat.name === '民谣歌曲') categoryMap['民谣歌曲'] = cat.id;
      });

      // 创建示例歌曲
      const songs = [
        {
          title: '月亮代表我的心',
          category_id: categoryMap['经典老歌'],
          content: `[C]你问我爱你有多深
[Am]我爱你有几分
[F]我的情也真
[G7]我的爱也真
[C]月亮代表我的心

[Am]你问我爱你有多深
[Dm]我爱你有几分
[G]我的情不移
[C]我的爱不变
[Am]月亮代表我的心

[F]轻轻的一个吻
[G]已经打动我的心
[Am]深深的一段情
[Dm]教我思念到如今
[G]轻轻的一个吻
[C]已经打动我的心
[F]深深的一段情
[Dm]教我思念到如今

[C]你问我爱你有多深
[Am]我爱你有几分
[F]我的情也真
[G7]我的爱也真
[C]月亮代表我的心`,
          score_image: null
        },
        {
          title: '平凡之路',
          category_id: categoryMap['民谣歌曲'],
          content: `[G]徘徊着的 在路上的
[Em]你要走吗 via via
[C]易碎的 骄傲着
[D]那也曾是我的模样

[G]沸腾着的 不安着的
[Em]你要去哪 via via
[C]谜一样的 沉默着的
[D]故事你真的在听吗

[G]我曾经跨过山和大海
[Em]也穿过人山人海
[C]我曾经拥有着的一切
[D]转眼都飘散如烟

[G]我曾经失落失望失掉所有方向
[Em]直到看见平凡才是唯一的答案`,
          score_image: null
        },
        {
          title: '告白气球',
          category_id: categoryMap['流行歌曲'],
          content: `[C]塞纳河畔 左岸的咖啡
[G]我手一杯 品尝你的美
[Am]留下唇印的嘴
[Em]花店玫瑰 名字写错谁
[F]告白气球 风吹到对街
[G]微笑在天上飞

[C]你说你有点难追 想让我知难而退
[G]礼物不需挑最贵 只要香榭的落叶
[Am]营造浪漫的约会 不害怕搞砸一切
[Em]拥有你就拥有 全世界

[F]亲爱的 爱上你 从那天起
[G]甜蜜的很轻易
[Em]亲爱的 别任性 你的眼睛
[Am]在说我愿意`,
          score_image: null
        }
      ];

      for (const song of songs) {
        await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO songs (title, category_id, content, score_image, created_by, updated_by)
             VALUES (?, ?, ?, ?, 1, 1)`,
            [song.title, song.category_id, song.content, song.score_image],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
      }
      console.log('✓ 创建示例歌曲: 月亮代表我的心, 平凡之路, 告白气球');
      console.log('  (注意: 歌曲的歌谱图片需要管理员登录后上传)');
    } else {
      console.log('✓ 歌曲已存在');
    }

    console.log('\n✅ 数据库初始化完成!');
    console.log('   默认管理员账户: admin / admin123');
    console.log('   访问地址: http://localhost:3000\n');
  } catch (error) {
    console.error('初始化数据库错误:', error);
    process.exit(1);
  }
}

// 运行初始化
initDatabase().then(() => {
  process.exit(0);
});
