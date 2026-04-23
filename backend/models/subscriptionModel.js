const { pool } = require('../lib/db');

const TABLE = '"ego"."subscription"';

async function upsertFromStripe(usuariId, row) {
  const {
    stripe_customer_id,
    stripe_subscription_id,
    status,
    current_period_end,
    cancel_at_period_end,
  } = row;

  const result = await pool.query(
    `INSERT INTO ${TABLE} (
       usuari_id, stripe_customer_id, stripe_subscription_id, status,
       current_period_end, cancel_at_period_end, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (usuari_id) DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       updated_at = NOW()
     RETURNING *`,
    [
      usuariId,
      stripe_customer_id || null,
      stripe_subscription_id || null,
      status,
      current_period_end || null,
      Boolean(cancel_at_period_end),
    ]
  );
  return result.rows[0];
}

async function findByUserId(usuariId) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE usuari_id = $1`, [usuariId]);
  return r.rows[0] || null;
}

async function findByStripeSubscriptionId(subId) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE stripe_subscription_id = $1`, [subId]);
  return r.rows[0] || null;
}

module.exports = {
  upsertFromStripe,
  findByUserId,
  findByStripeSubscriptionId,
};
