const entryService = require('../services/entryService');

async function createEntry(req, res) {
  try {
    const { entry_date, generated_units, consumed_units, buying_rate, selling_rate, notes } = req.body;

    if (!entry_date) {
      return res.status(400).json({ success: false, error: 'Entry date is required' });
    }
    if (generated_units === undefined || consumed_units === undefined) {
      return res.status(400).json({ success: false, error: 'Generated units and Consumed units are required' });
    }

    const entry = await entryService.createEntry(req.user.id, {
      entry_date,
      generated_units,
      consumed_units,
      buying_rate,
      selling_rate,
      notes
    });

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function getEntries(req, res) {
  try {
    const result = await entryService.getEntries(req.user.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getEntryById(req, res) {
  try {
    const entry = await entryService.getEntryById(req.user.id, req.params.id);
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
}

async function updateEntry(req, res) {
  try {
    const { entry_date, generated_units, consumed_units, buying_rate, selling_rate, notes } = req.body;

    if (!entry_date || generated_units === undefined || consumed_units === undefined) {
      return res.status(400).json({ success: false, error: 'Entry date, generated units, and consumed units are required' });
    }

    const updated = await entryService.updateEntry(req.user.id, req.params.id, {
      entry_date,
      generated_units,
      consumed_units,
      buying_rate,
      selling_rate,
      notes
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function deleteEntry(req, res) {
  try {
    await entryService.deleteEntry(req.user.id, req.params.id);
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

async function bulkDeleteEntries(req, res) {
  try {
    const { ids } = req.body;
    await entryService.bulkDeleteEntries(req.user.id, ids);
    res.json({ success: true, message: `${ids.length} entries deleted successfully` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

module.exports = {
  createEntry,
  getEntries,
  getEntryById,
  updateEntry,
  deleteEntry,
  bulkDeleteEntries
};
