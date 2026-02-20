const { CACHE_TTL_MS } = require("./constants");
const {
  getDomainByName,
  getPrimaryDomainForWebsite,
} = require("./utils/dynamodb");
const {
  createRedirectResponse,
  createErrorResponse,
} = require("./utils/responses");
const { rewriteUrl } = require("./utils/rewrite-url");

// In-memory cache for domain lookups
const domainCache = new Map();

function getCachedDomain(domain) {
  const cached = domainCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached;
  return null;
}

function cacheDomain(domain, entry) {
  domainCache.set(domain, { ...entry, timestamp: Date.now() });
}

/**
 * Lambda@Edge viewer-request:
 * - Redirects non-primary domains to the primary domain (301)
 * - Rewrites clean URLs to .html for S3 origin
 */
exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const hostHeader = request.headers.host?.[0]?.value;

  if (!hostHeader) {
    return createErrorResponse(400, "Bad Request");
  }

  const currentDomain = hostHeader.toLowerCase();

  try {
    const cached = getCachedDomain(currentDomain);
    if (cached) {
      return cached.isPrimary
        ? rewriteUrl(request)
        : createRedirectResponse(cached.primaryDomain, request);
    }

    const domain = await getDomainByName(currentDomain);

    if (!domain) {
      return createErrorResponse(404, "Not Found");
    }

    if (domain.isPrimary) {
      cacheDomain(currentDomain, {
        isPrimary: true,
        websiteId: domain.websiteId,
      });
      return rewriteUrl(request);
    }

    // Non-primary domain — find the primary and redirect
    const primaryDomain = await getPrimaryDomainForWebsite(domain.websiteId);

    if (!primaryDomain) {
      return createErrorResponse(500, "Internal Server Error");
    }

    cacheDomain(currentDomain, {
      isPrimary: false,
      primaryDomain: primaryDomain.domainName,
      websiteId: domain.websiteId,
    });

    return createRedirectResponse(primaryDomain.domainName, request);
  } catch (error) {
    console.error("Error in domain redirect Lambda@Edge:", error);
    return createErrorResponse(500, "Internal Server Error");
  }
};