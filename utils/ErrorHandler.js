/**
 * Standard Error Taxonomy
 * Provides consistent error handling across the application
 */

/**
 * Standard Error Taxonomy
 * HTTP status + application-level error codes
 */

export const ErrorCodes = {
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS: {
    code: 101,
    status: 401,
    message: "Invalid credentials",
  },
  AUTH_TOKEN_EXPIRED: {
    code: 102,
    status: 401,
    message: "Access token expired",
  },
  AUTH_TOKEN_INVALID: {
    code: 103,
    status: 401,
    message: "Invalid access token",
  },
  AUTH_TOKEN_MISSING: {
    code: 104,
    status: 401,
    message: "Access token missing",
  },
  AUTH_REFRESH_TOKEN_EXPIRED: {
    code: 105,
    status: 401,
    message: "Refresh token expired",
  },
  AUTH_REFRESH_TOKEN_INVALID: {
    code: 106,
    status: 401,
    message: "Invalid refresh token",
  },
  AUTH_REFRESH_TOKEN_REVOKED: {
    code: 107,
    status: 401,
    message: "Refresh token revoked",
  },
  AUTH_UNAUTHORIZED: {
    code: 108,
    status: 403,
    message: "Unauthorized access",
  },
  AUTH_SESSION_EXPIRED: {
    code: 109,
    status: 401,
    message: "Session expired",
  },

  // Validation Errors
  VALIDATION_REQUIRED_FIELD: {
    code: 201,
    status: 400,
    message: "Required field missing",
  },
  VALIDATION_INVALID_EMAIL: {
    code: 202,
    status: 400,
    message: "Invalid email format",
  },
  VALIDATION_INVALID_PASSWORD: {
    code: 203,
    status: 400,
    message: "Password does not meet requirements",
  },
  VALIDATION_INVALID_FORMAT: {
    code: 204,
    status: 400,
    message: "Invalid data format",
  },

  // Resource Errors
  RESOURCE_NOT_FOUND: {
    code: 301,
    status: 404,
    message: "Resource not found",
  },
  RESOURCE_ALREADY_EXISTS: {
    code: 302,
    status: 409,
    message: "Resource already exists",
  },
  RESOURCE_CONFLICT: {
    code: 303,
    status: 409,
    message: "Resource conflict",
  },

  // User Errors
  USER_NOT_FOUND: {
    code: 401,
    status: 404,
    message: "User not found",
  },
  USER_ALREADY_EXISTS: {
    code: 402,
    status: 409,
    message: "User already exists",
  },
  USER_INACTIVE: {
    code: 403,
    status: 403,
    message: "User account is inactive",
  },
  USER_EMAIL_EXISTS: {
    code: 404,
    status: 409,
    message: "Email already registered",
  },
  USER_USERNAME_EXISTS: {
    code: 405,
    status: 409,
    message: "Username already taken",
  },

  // Server Errors
  SERVER_ERROR: {
    code: 501,
    status: 500,
    message: "Internal server error",
  },
  SERVER_DATABASE_ERROR: {
    code: 502,
    status: 500,
    message: "Database error",
  },
  SERVER_SERVICE_UNAVAILABLE: {
    code: 503,
    status: 503,
    message: "Service temporarily unavailable",
  },

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: {
    code: 601,
    status: 429,
    message: "Rate limit exceeded",
  },
};


export class AppError extends Error {
  constructor(errorCode, details = null) {
    super(errorCode.message);
    this.name = "AppError";
    this.code = errorCode.code;
    this.statusCode = errorCode.status;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}


export const throwError = (errorCode, details = null) => {
  throw new AppError(errorCode, details);
};


// Standard success response
export const successResponse = (data, message = "Success", meta = null) => {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
};

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    const field =
      err.keyValue ? Object.keys(err.keyValue)[0] : "resource";

    return res.status(409).json({
      success: false,
      error: {
        code: ErrorCodes.RESOURCE_ALREADY_EXISTS.code,
        message: `${field} already exists`,
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Mongo validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_INVALID_FORMAT.code,
        message: "Validation failed",
        details: Object.values(err.errors).map((e) => e.message),
        timestamp: new Date().toISOString(),
      },
    });
  }

  // Fallback
  return res.status(500).json({
    success: false,
    error: {
      code: ErrorCodes.SERVER_ERROR.code,
      message: ErrorCodes.SERVER_ERROR.message,
      timestamp: new Date().toISOString(),
    },
  });
};

// Async handler wrapper to catch errors
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};