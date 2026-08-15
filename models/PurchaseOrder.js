/**
 * 进货单模型
 * status: 'pending' 待收货 | 'received' 已入库
 */
const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema(
  {
    orderNo: { type: String, required: true, unique: true }, // 进货单号
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }, // 进货数量
    cost: { type: Number, required: true, min: 0 }, // 进货单价
    supplier: { type: String, default: '' },
    date: { type: String, required: true }, // 进货日期 YYYY-MM-DD
    remark: { type: String, default: '', maxlength: 500 },
    status: { type: String, enum: ['pending', 'received'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', purchaseSchema);
