/**
 * 用户模型（管理员 / 员工）
 * role: 'admin' 管理员 | 'staff' 员工
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: [true, '账号不能为空'], unique: true, trim: true, maxlength: 50 },
    password: { type: String, required: [true, '密码不能为空'], maxlength: 50 }, // 课程演示项目明文存储
    name: { type: String, required: [true, '姓名不能为空'], trim: true, maxlength: 50 },
    phone: { type: String, default: '', maxlength: 20 },
    role: { type: String, enum: ['admin', 'staff'], required: true, default: 'staff' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
