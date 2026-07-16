const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'autowash',
  password: '123456',
  port: 5432,
});

async function reset() {
  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('DROP SCHEMA public CASCADE;');
    console.log('Schema dropped');
    await client.query('CREATE SCHEMA public;');
    console.log('Schema created');
  } catch (err) {
    console.error('Error resetting DB', err);
  } finally {
    await client.end();
  }
}

reset();
