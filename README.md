# 音乐歌谱库管理系统

一个简洁、优雅的音乐歌谱管理系统，支持图片和文字两种歌谱形式。

## 功能特性

- 📝 歌曲管理（增删改查）
- 📂 分类管理
- 🖼️ 支持图片和文字歌谱
- 🔍 歌曲搜索
- 👥 多用户权限管理
- 🔒 安全的会话管理

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite3
- **认证**: express-session + bcrypt
- **文件上传**: multer

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

**重要**：生产环境务必修改 `SESSION_SECRET` 为强随机字符串！

生成随机密钥：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 初始化数据库

```bash
npm run init
```

这将创建：
- 默认管理员账户 (用户名: `admin`, 密码: `admin123`)
- 默认分类（流行歌曲、经典老歌、民谣歌曲）
- 示例歌曲数据

### 4. 启动服务器

```bash
npm start
```

访问 http://localhost:3000

## 默认账户

- **用户名**: admin
- **密码**: admin123

⚠️ **首次登录后请立即修改密码！**

## 项目结构

```
Music_html/
├── server/              # 后端代码
│   ├── routes/          # API 路由
│   ├── middleware/      # 中间件
│   ├── database.js      # 数据库配置
│   ├── init.js          # 初始化脚本
│   └── server.js        # 服务器入口
├── public/              # 静态资源
│   └── uploads/         # 上传文件
├── js/                  # 前端 JavaScript
├── css/                 # 样式文件
├── data/                # SQLite 数据库
├── .env                 # 环境变量配置
└── package.json
```

## 安全特性

✅ **已实现的安全措施**：
- 密码使用 bcrypt 加密存储
- Session Cookie 安全配置（httpOnly, secure, sameSite）
- HTML 转义防止 XSS 攻击
- 文件上传类型和大小限制
- 参数化查询防止 SQL 注入
- 权限分级管理

## API 接口

### 公开接口

- `GET /api/songs` - 获取歌曲列表
- `GET /api/songs/:id` - 获取歌曲详情
- `GET /api/songs/search?q=keyword` - 搜索歌曲
- `GET /api/categories` - 获取分类列表

### 认证接口

- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出
- `GET /api/auth/check-login` - 检查登录状态

### 管理员接口

- `POST /api/songs` - 新增歌曲
- `PUT /api/songs/:id` - 编辑歌曲
- `DELETE /api/songs/:id` - 删除歌曲
- `POST /api/categories` - 新增分类
- `PUT /api/categories/:id` - 编辑分类
- `DELETE /api/categories/:id` - 删除分类

### 超级管理员接口

- `GET /api/admin/users` - 获取用户列表
- `POST /api/admin/users` - 创建用户
- `PUT /api/admin/users/:id` - 编辑用户
- `DELETE /api/admin/users/:id` - 删除用户

## 生产环境部署建议

1. **环境变量**：
   - 修改 `SESSION_SECRET` 为强随机字符串
   - 设置 `NODE_ENV=production`

2. **HTTPS**：
   - 使用 HTTPS 协议
   - Session Cookie 的 `secure` 选项会自动启用

3. **反向代理**：
   - 推荐使用 Nginx 作为反向代理
   - 配置静态文件缓存

4. **数据库备份**：
   - 定期备份 `data/music.db` 文件

5. **日志**：
   - 使用 PM2 等进程管理器
   - 配置日志轮转

## 常见问题

### 忘记管理员密码？

删除 `data/music.db` 文件，重新运行 `npm run init`

### 上传图片失败？

检查 `public/uploads/covers` 和 `public/uploads/scores` 目录是否存在且有写入权限

### 无法登录？

- 检查 Session 配置
- 确认浏览器允许 Cookie
- 查看控制台错误信息

## 更新日志

### v1.0.1 (2024-03-04)
- 🐛 修复文件上传大小限制配置错误
- 🐛 修复删除图片路径错误
- 🔒 Session Secret 移至环境变量
- 🔒 增强 Session Cookie 安全配置
- 🔒 添加 HTML 转义防止 XSS 攻击
- ⚡ 添加数据库索引优化查询性能
- ♻️ 统一分类删除业务逻辑
- 📝 添加配置文件示例和文档

### v1.0.0 (2024-03-04)
- 🎉 初始版本发布

## 许可证

MIT License

## 作者

音乐歌谱库开发团队
