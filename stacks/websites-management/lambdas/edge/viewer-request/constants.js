const AWS_REGION = "eu-west-1";

const SSM_WEBSITES_TABLE_NAME =
  "/itz-brix/resources/ITzBrixStateful/dynamodb/tables/WebsitesTable/table-name";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const REDIRECT_CACHE_MAX_AGE = "max-age=3600";

module.exports = {
  AWS_REGION,
  SSM_WEBSITES_TABLE_NAME,
  CACHE_TTL_MS,
  REDIRECT_CACHE_MAX_AGE,
};
