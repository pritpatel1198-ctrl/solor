const entryService = require('../services/entryService');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Returns an error message for invalid entry payloads, or null when valid.
 */
function validateEntryPayload(body) {
  if (!isValidDate(body.entry_date)) return 'Entry date is required in YYYY-MM-DD format';
  for (const field of ['generated_units', 'consumed_units']) {
    const n = Number(body[field]);
    if (body[field] === undefined || body[field] === null || body[field] === '' || !Number.isFinite(n) || n < 0) {
      return 'Generated units and Consumed units must be non-negative numbers';
    }
  }
  for (const field of ['buying_rate', 'selling_rate', 'opening_import_meter', 'closing_import_meter', 'opening_export_meter', 'closing_export_meter']) {
    const v = body[field];
    if (v !== undefined && v !== null && v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0)) {
      return `${field.replace(/_/g, ' ')} must be a non-negative number`;
    }
  }
  if (body.notes !== undefined && body.notes !== null && typeof body.notes !== 'string') return 'Notes must be text';
  return null;
}

function sendError(res, err, fallbackStatus) {
  res.status(err.status || fallbackStatus).json({ success: false, error: err.message });
}

async function createEntry(req, res) {
  try {
    const {
      entry_date, generated_units, consumed_units, buying_rate, selling_rate, notes,
      opening_import_meter, closing_import_meter, opening_export_meter, closing_export_meter
    } = req.body;

    const validationError = validateEntryPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const entry = await entryService.createEntry(req.user.id, {
      entry_date,
      generated_units,
      consumed_units,
      buying_rate,
      selling_rate,
      notes,
      opening_import_meter,
      closing_import_meter,
      opening_export_meter,
      closing_export_meter
    });

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    sendError(res, err, 400);
  }
}

async function getEntries(req, res) {
  try {
    const result = await entryService.getEntries(req.user.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    sendError(res, err, 500);
  }
}

async function getEntryById(req, res) {
  try {
    const entry = await entryService.getEntryById(req.user.id, req.params.id);
    res.json({ success: true, data: entry });
  } catch (err) {
    sendError(res, err, 404);
  }
}

async function updateEntry(req, res) {
  try {
    const {
      entry_date, generated_units, consumed_units, buying_rate, selling_rate, notes,
      opening_import_meter, closing_import_meter, opening_export_meter, closing_export_meter
    } = req.body;

    const validationError = validateEntryPayload(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, error: validationError });
    }

    const updated = await entryService.updateEntry(req.user.id, req.params.id, {
      entry_date,
      generated_units,
      consumed_units,
      buying_rate,
      selling_rate,
      notes,
      opening_import_meter,
      closing_import_meter,
      opening_export_meter,
      closing_export_meter
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    sendError(res, err, 400);
  }
}

async function deleteEntry(req, res) {
  try {
    await entryService.deleteEntry(req.user.id, req.params.id);
    res.json({ success: true, message: 'Entry deleted successfully' });
  } catch (err) {
    sendError(res, err, 400);
  }
}

async function bulkDeleteEntries(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000 || !ids.every(id => typeof id === 'string')) {
      return res.status(400).json({ success: false, error: 'Provide a list of entry IDs to delete' });
    }
    await entryService.bulkDeleteEntries(req.user.id, ids);
    res.json({ success: true, message: `${ids.length} entries deleted successfully` });
  } catch (err) {
    sendError(res, err, 400);
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
