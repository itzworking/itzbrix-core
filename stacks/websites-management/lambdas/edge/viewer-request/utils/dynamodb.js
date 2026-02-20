const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { AWS_REGION, SSM_WEBSITES_TABLE_NAME } = require("../constants");

// Loaded once per Lambda container
const ssmClient = new SSMClient({ region: AWS_REGION });
const ddbClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: AWS_REGION }),
);

let tableName = null;

async function getTableName() {
  if (tableName) return tableName;

  const param = await ssmClient.send(
    new GetParameterCommand({ Name: SSM_WEBSITES_TABLE_NAME }),
  );
  tableName = param.Parameter.Value;
  console.log("Loaded table name:", tableName);
  return tableName;
}

/**
 * Query domain by domain name using GSI2
 */
async function getDomainByName(domainName) {
  const table = await getTableName();

  const result = await ddbClient.send(
    new QueryCommand({
      TableName: table,
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
      ExpressionAttributeValues: {
        ":pk": `WEBSITE_DOMAIN#${domainName}`,
        ":sk": `WEBSITE_DOMAIN#${domainName}`,
      },
      Limit: 1,
    }),
  );

  return result.Items?.[0] || null;
}

/**
 * Get primary domain for a website
 */
async function getPrimaryDomainForWebsite(websiteId) {
  const table = await getTableName();

  const result = await ddbClient.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `WEBSITE#${websiteId}`,
        ":sk": "WEBSITE_DOMAIN#",
      },
    }),
  );

  return (result.Items || []).find((d) => d.isPrimary === true) || null;
}

module.exports = {
  getDomainByName,
  getPrimaryDomainForWebsite,
};