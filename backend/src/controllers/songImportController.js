const asyncHandler = require('../utils/asyncHandler');
const songImportService = require('../services/songImportService');

const importFromJson = asyncHandler(async (req, res) => {
  const { totalInFile, imported, skipped, totalInDatabase, errors } =
    await songImportService.importFromJson(req.body);

  res.json({
    message: 'Імпорт завершено',
    results: {
      totalInFile,
      imported,
      skipped,
      errors: errors.length,
      totalInDatabase
    },
    ...(errors.length > 0 && { errors })
  });
});

module.exports = { importFromJson };
