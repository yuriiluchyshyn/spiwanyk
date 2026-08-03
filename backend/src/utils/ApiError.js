/**
 * Error type carrying an HTTP status code. Services throw these to signal
 * business-level failures (not found, forbidden, bad request) without importing
 * anything from the HTTP layer. The central error middleware translates them
 * into responses.
 */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (details !== undefined) {
      this.details = details;
    }
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static forbidden(message = 'Доступ заборонено') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Не знайдено') {
    return new ApiError(404, message);
  }
}

module.exports = ApiError;
