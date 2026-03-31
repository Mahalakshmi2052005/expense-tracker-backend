const express = require('express');
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all expenses (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    const filter = { userId: req.userId };

    if (category && category !== 'All') filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate + 'T23:59:59');
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    res.json({ expenses, total });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add expense
router.post('/', auth, async (req, res) => {
  try {
    const { title, amount, category, date, note } = req.body;
    if (!title || !amount || !category || !date)
      return res.status(400).json({ message: 'Required fields missing' });

    const expense = await Expense.create({ userId: req.userId, title, amount, category, date, note });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update expense
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Stats by category
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Expense.aggregate([
      { $match: { userId: req.userId } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
