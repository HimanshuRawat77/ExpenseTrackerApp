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

exports.processSmsTransactions = async (req, res, next) => {
  try {
    const rawItems = Array.isArray(req.body.transactions)
      ? req.body.transactions
      : (req.body && req.body.amount ? [req.body] : []);

    if (rawItems.length === 0) {
      return apiResponse.error(res, 400, 'No transactions provided');
    }

    const created = [];
    const duplicates = [];
    const failed = [];

    for (const item of rawItems) {
      try {
        if (!item.amount || isNaN(item.amount) || Number(item.amount) <= 0) {
          failed.push({ item, reason: 'Invalid or missing amount' });
          continue;
        }

        // Duplicate checks
        const duplicateConditions = [];
        if (item.externalId && typeof item.externalId === 'string' && item.externalId.trim().length > 0) {
          duplicateConditions.push({ externalId: item.externalId.trim() });
        }
        if (item.fingerprint && typeof item.fingerprint === 'string' && item.fingerprint.trim().length > 0) {
          duplicateConditions.push({ fingerprint: item.fingerprint.trim() });
        }

        if (duplicateConditions.length > 0) {
          const existing = await Transaction.findOne({
            userId: req.userId,
            $or: duplicateConditions
          });

          if (existing) {
            duplicates.push({
              externalId: item.externalId,
              fingerprint: item.fingerprint,
              existingId: existing._id,
              reason: 'Transaction with matching externalId or fingerprint already exists'
            });
            continue;
          }
        }

        const newTx = new Transaction({
          userId: req.userId,
          type: item.type === 'income' ? 'income' : 'expense',
          amount: Number(item.amount),
          currency: item.currency || 'INR',
          category: item.category || 'Other',
          merchant: item.merchant ? item.merchant.trim() : null,
          description: item.description ? item.description.trim() : (item.merchant ? `SMS: ${item.merchant}` : 'SMS Transaction'),
          date: item.date ? new Date(item.date) : new Date(),
          paymentMethod: ['cash', 'upi', 'card', 'bank_transfer', 'wallet', 'other'].includes(item.paymentMethod)
            ? item.paymentMethod
            : 'other',
          source: 'sms',
          externalId: item.externalId ? item.externalId.trim() : null,
          fingerprint: item.fingerprint ? item.fingerprint.trim() : null,
          aiCategorized: Boolean(item.aiCategorized)
        });

        await newTx.save();
        created.push(newTx);
      } catch (err) {
        failed.push({ item, reason: err.message });
      }
    }

    return apiResponse.success(res, 201, `Processed ${rawItems.length} SMS transactions: ${created.length} created, ${duplicates.length} duplicates, ${failed.length} failed`, {
      created,
      duplicates,
      failed,
      summary: {
        total: rawItems.length,
        createdCount: created.length,
        duplicateCount: duplicates.length,
        failedCount: failed.length
      }
    });
  } catch (error) {
    next(error);
  }
};

