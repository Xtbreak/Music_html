// 加载环境变量
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { db } = require('./database');

// 路由引入
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const songRoutes = require('./routes/songs');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session配置
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'default-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24小时
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // 生产环境启用 HTTPS
    sameSite: 'strict' // 防止 CSRF 攻击
  }
};

app.use(session(sessionConfig));

// 静态文件服务
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/admin', adminRoutes);

// 页面路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '未找到请求的资源' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('================================');
  console.log('🎵 音乐歌谱库系统');
  console.log('================================');
  console.log(`📡 服务器运行在: http://localhost:${PORT}`);
  console.log('================================');
  console.log('🔑 默认管理员账户:');
  console.log('   用户名: admin');
  console.log('   密码: admin123');
  console.log('================================');
  console.log('\n按 Ctrl+C 停止服务器\n');
});

module.exports = app;
