const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const logger = require('../utils/logger');

const loadSecrets = async () => {
  if (process.env.AWS_SECRETS_MANAGER_ENABLED !== 'true') {
    logger.info('[Secrets] AWS Secrets Manager is disabled, using local environment variables');
    return;
  }

  const secretName = process.env.AWS_SECRET_NAME || 'swastik/production';
  const region = process.env.AWS_REGION || 'ap-south-1';

  try {
    const client = new SecretsManagerClient({ region });
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      
      // Merge secrets into process.env, avoiding overwriting existing keys unless specified
      for (const [key, value] of Object.entries(secrets)) {
        if (!process.env[key] || process.env.OVERRIDE_ENV_WITH_SECRETS === 'true') {
          process.env[key] = value;
        }
      }
      
      logger.info(`[Secrets] Successfully loaded secrets from AWS Secrets Manager: ${secretName}`);
    }
  } catch (err) {
    logger.error(`[Secrets] Failed to load secrets from AWS Secrets Manager: ${err.message}`);
    // Do not crash the app, just fallback to local env vars
  }
};

module.exports = { loadSecrets };
