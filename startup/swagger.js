const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

module.exports = (app) => {
  const swaggerDocument = YAML.load(path.join(__dirname, '../swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};