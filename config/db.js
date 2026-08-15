/**
 * MongoDB 连接配置
 * 默认连接本机 27017 端口的 supermarket 数据库，
 * 可通过环境变量 DB_URI 覆盖，例如：
 *   DB_URI=mongodb://127.0.0.1:27017/supermarket node ./bin/www
 */
const mongoose = require('mongoose');

const DB_URI = process.env.DB_URI || 'mongodb://127.0.0.1:27017/supermarket';

async function connectDB() {
  try {
    await mongoose.connect(DB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[MongoDB] 连接成功:', DB_URI);
  } catch (err) {
    console.error('[MongoDB] 连接失败:', err.message);
    console.error('请确认 MongoDB 服务已启动（默认 127.0.0.1:27017）');
    process.exit(1);
  }
}

module.exports = connectDB;
