const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDirs = [
  path.join(__dirname, '../../public/uploads/scores')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 生成唯一文件名（如果重名则添加数字后缀）
const generateUniqueFilename = (dir, basename, ext) => {
  let filename = basename + ext;
  let counter = 1;

  while (fs.existsSync(path.join(dir, filename))) {
    filename = `${basename}_${counter}${ext}`;
    counter++;
  }

  return filename;
};

// 存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'scoreImage') {
      cb(null, path.join(__dirname, '../../public/uploads/scores'));
    } else {
      cb(null, path.join(__dirname, '../../public/uploads'));
    }
  },
  filename: (req, file, cb) => {
    const uploadDir = file.fieldname === 'scoreImage'
      ? path.join(__dirname, '../../public/uploads/scores')
      : path.join(__dirname, '../../public/uploads');

    // 获取原始文件名（不含扩展名）并清理特殊字符
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_'); // 只保留字母、数字、中文、下划线和横线

    const uniqueFilename = generateUniqueFilename(uploadDir, basename, ext);
    cb(null, uniqueFilename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPEG, PNG, WebP 格式的图片'));
  }
};

// 文件大小限制中间件
const checkFileSize = (req, res, next) => {
  if (!req.files) return next();

  for (const fieldName in req.files) {
    const files = req.files[fieldName];
    files.forEach(file => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        const error = new Error('歌谱图片大小不能超过 5MB');
        error.code = 'LIMIT_FILE_SIZE';
        return next(error);
      }
    });
  }
  next();
};

// 上传配置
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 统一设置为5MB，具体检查在中间件中
  }
});

// 单文件上传
const uploadSingle = (fieldName) => upload.single(fieldName);

// 多文件上传
const uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount);

// 删除图片
const deleteImage = (filename, type = 'scores') => {
  const uploadDir = 'scores';
  const fullPath = path.join(__dirname, '..', '..', 'public', 'uploads', uploadDir, filename);

  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`成功删除图片: ${filename}`);
    } catch (err) {
      console.error(`删除图片失败: ${filename}`, err);
    }
  }
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  deleteImage,
  checkFileSize
};
