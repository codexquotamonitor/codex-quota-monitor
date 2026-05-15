/**
 * Ponto de entrada dos testes.
 * Uso: node tests/run.js
 */

const { run } = require('./runner');

run([
  require('./test-fmt'),
  require('./test-usage'),
  require('./test-popup'),
]);
