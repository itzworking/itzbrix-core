const { readFileSync } = require("fs");
const { join } = require("path");

let NOT_FOUND_HTML;

/**
 * Rewrite clean URLs to .html for S3 origin.
 * Blocks direct access to .html files for SEO.
 */
function rewriteUrl(request) {
  const uri = request.uri;

  // Block direct access to .html files for SEO
  if (uri.endsWith(".html")) {
    if (!NOT_FOUND_HTML) {
      NOT_FOUND_HTML = readFileSync(join(__dirname, "..", "404.html"), "utf-8");
    }

    return {
      status: "404",
      statusDescription: "Not Found",
      headers: {
        "content-type": [
          { key: "Content-Type", value: "text/html; charset=UTF-8" },
        ],
        "cache-control": [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      body: NOT_FOUND_HTML,
    };
  }

  if (uri.endsWith("/")) {
    request.uri = uri + "index.html";
  } else if (!/\.[^/]+$/.test(uri)) {
    request.uri = uri + "/index.html";
  }

  return request;
}

module.exports = { rewriteUrl };
