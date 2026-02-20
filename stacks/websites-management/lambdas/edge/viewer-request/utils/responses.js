const { REDIRECT_CACHE_MAX_AGE } = require("../constants");

/**
 * 301 redirect to the primary domain
 */
function createRedirectResponse(toDomain, request) {
  const fullPath = request.querystring
    ? `${request.uri}?${request.querystring}`
    : request.uri;
  const redirectUrl = `https://${toDomain}${fullPath}`;

  console.log(
    `301 ${request.headers.host[0].value}${fullPath} -> ${redirectUrl}`,
  );

  return {
    status: "301",
    statusDescription: "Moved Permanently",
    headers: {
      location: [{ key: "Location", value: redirectUrl }],
      "cache-control": [
        { key: "Cache-Control", value: REDIRECT_CACHE_MAX_AGE },
      ],
    },
  };
}

/**
 * Create an error response (generic — no internal details leaked)
 */
function createErrorResponse(status, message) {
  console.error(`Error ${status}: ${message}`);

  return {
    status: status.toString(),
    statusDescription: message,
    headers: {
      "content-type": [{ key: "Content-Type", value: "text/plain" }],
      "cache-control": [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    },
    body: message,
  };
}

module.exports = {
  createRedirectResponse,
  createErrorResponse,
};