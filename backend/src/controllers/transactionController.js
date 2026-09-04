const Transaction = require('../models/Transaction');
const apiResponse = require('../utils/apiResponse');

exports.create = async (req, res, next) => {
  try {
    req.body.userId = req.userId;
    const transaction = await Transaction.create(req.body);
    return apiResponse.success(res, 201, 'Transaction created successfully', transaction);
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const filter = { userId: req.userId };
    const { type, category, merchant, startDate, endDate, minAmount, maxAmount, source, page = 1, limit = 20 } = req.query;

    if (type) filter.type = type;
    if (category) filter.category = new RegExp(category, 'i');
    if (merchant) filter.merchant = new RegExp(merchant, 'i');
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }
    
    if (source) filter.source = source;

    const pageNum = parseInt(page, 10);
    const limitNum = Math.min(parseInt(limit, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Transaction.countDocuments(filter);

    return apiResponse.success(res, 200, 'Transactions retrieved successfully', {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
    if (!transaction) {
      return apiResponse.error(res, 404, 'Transaction not found');
    }
    return apiResponse.success(res, 200, 'Transaction retrieved successfully', transaction);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const allowedFields = ['type', 'amount', 'currency', 'category', 'merchant', 'description', 'date', 'paymentMethod', 'source'];
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return apiResponse.error(res, 404, 'Transaction not found');
    }

    return apiResponse.success(res, 200, 'Transaction updated successfully', transaction);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!transaction) {
      return apiResponse.error(res, 404, 'Transaction not found');
    }
    return apiResponse.success(res, 200, 'Transaction deleted successfully');
  } catch (error) {
    next(error);
  }
};

exports.bulkCreate = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.transactions)) {
      return apiResponse.error(res, 400, 'Transactions must be an array');
    }
    
    const transactions = req.body.transactions.map(t => ({ ...t, userId: req.userId }));
    const created = await Transaction.insertMany(transactions);
    
    return apiResponse.success(res, 201, `${created.length} transactions created successfully`, { count: created.length });
  } catch (error) {
    next(error);
  }
};
