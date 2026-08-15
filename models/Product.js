/**
 * 商品模型
 * safetyStock: 安全库存阈值（默认取初始库存的 20%），库存 <= safetyStock 时触发预警
 */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, '商品名称不能为空'], trim: true, maxlength: 100 },
    category: { type: String, default: '其他', trim: true, maxlength: 50 },
    price: { type: Number, required: [true, '售价不能为空'], min: 0 }, // 售价
    cost: { type: Number, default: 0, min: 0 }, // 进价
    stock: { type: Number, required: true, min: 0, default: 0 }, // 库存量
    safetyStock: { type: Number, default: 0, min: 0 }, // 安全库存阈值（预警线）
    unit: { type: String, default: '件', maxlength: 20 }, // 计件方式
    supplier: { type: String, default: '', maxlength: 100 }, // 供应商
    productionDate: { type: String, default: '' }, // 生产日期 YYYY-MM-DD
    expiryDate: { type: String, default: '' }, // 过期时间 YYYY-MM-DD
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
