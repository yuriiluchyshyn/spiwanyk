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

// Export songs (optionally filtered by ?categories=a,b,c) as an import-ready
// JSON payload. Returned as a downloadable attachment.
const exportToJson = asyncHandler(async (req, res) => {
  const { categories } = req.query;
  const categoryList =
    typeof categories === 'string' && categories.trim()
      ? categories.split(',').map((c) => c.trim()).filter(Boolean)
      : [];

  const payload = await songImportService.exportForImport(categoryList);

  const label = categoryList.length > 0 ? categoryList.join('-') : 'all';
  const filename = `spivanyk-export-${label}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(payload, null, 2));
});

module.exports = { importFromJson, exportToJson };
