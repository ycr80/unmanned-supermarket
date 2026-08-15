/**
 * 订单模型（顾客选购下单，下单即扣减库存）
 */
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }, // 下单时单价（快照）
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true }, // 订单号
    customer: { type: String, default: '散客', maxlength: 50 },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, default: '已支付' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
