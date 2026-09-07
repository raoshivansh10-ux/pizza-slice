import cron from 'node-cron';
import PizzaOption from '../models/PizzaOption.js';
import { sendEmail } from '../utils/sendEmail.js';

const ADMIN_NOTIFY_EMAIL =
  process.env.ADMIN_NOTIFY_EMAIL ||
  process.env.ADMIN_SEED_EMAIL ||
  'admin@pizzadelivery.com';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Checks for low-stock pizza ingredients and dispatches a single consolidated alert email
 * @returns {Promise<Object>} Summary of check and notification status
 */
export const checkLowStockAndNotify = async () => {
  console.log('[LowStockJob] Checking for low stock pizza ingredients...');

  try {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Find all options where stockQty is below threshold AND (not yet notified OR notified > 6 hours ago)
    const lowStockItems = await PizzaOption.find({
      $expr: { $lt: ['$stockQty', '$lowStockThreshold'] },
      $or: [{ lastNotifiedAt: null }, { lastNotifiedAt: { $lt: sixHoursAgo } }],
      isActive: true,
    }).sort({ type: 1, name: 1 });

    if (!lowStockItems || lowStockItems.length === 0) {
      console.log('[LowStockJob] All ingredient stocks are healthy or recently notified. No alert needed.');
      return { triggered: false, count: 0, items: [] };
    }

    console.log(`[LowStockJob] ⚠️ Found ${lowStockItems.length} items below low-stock threshold! Preparing consolidated alert...`);

    // Build consolidated plain-text summary
    let textContent = `⚠️ INVENTORY ALERT: Low Stock Warning\n\nThe following ${lowStockItems.length} ingredient(s) have dropped below their minimum stock thresholds:\n\n`;
    lowStockItems.forEach((item, idx) => {
      const deficit = item.lowStockThreshold - item.stockQty;
      textContent += `${idx + 1}. [${item.type.toUpperCase()}] ${item.name} - Current Stock: ${item.stockQty} (Threshold: ${item.lowStockThreshold}, Deficit: -${deficit})\n`;
    });
    textContent += `\nPlease log in to the Admin Dashboard to restock inventory:\n${CLIENT_URL}/admin/inventory\n`;

    // Build rich HTML table summary
    const tableRowsHtml = lowStockItems
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 12px 16px; font-weight: bold; color: #f8fafc;">${item.name}</td>
          <td style="padding: 12px 16px; text-transform: uppercase; color: #94a3b8; font-size: 12px;">${item.type}</td>
          <td style="padding: 12px 16px; font-weight: bold; color: #ef4444; text-align: center;">${item.stockQty}</td>
          <td style="padding: 12px 16px; color: #cbd5e1; text-align: center;">${item.lowStockThreshold}</td>
          <td style="padding: 12px 16px; font-weight: bold; color: #f97316; text-align: center;">-${item.lowStockThreshold - item.stockQty}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0c0f17; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 680px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
          <h1 style="color: #f97316; margin: 0 0 6px 0; font-size: 24px;">🍕 Pizza Slice - Inventory Alert</h1>
          <p style="color: #94a3b8; margin: 0; font-size: 14px;">Automated Low-Stock Inventory Monitor</p>
        </div>

        <p style="font-size: 15px; line-height: 1.6; color: #e2e8f0;">
          Attention Administrator, <br/>
          <strong>${lowStockItems.length} ingredient(s)</strong> have fallen below their configured minimum threshold and require immediate restocking.
        </p>

        <table style="width: 100%; border-collapse: collapse; background-color: #141a29; border-radius: 8px; overflow: hidden; margin: 24px 0;">
          <thead>
            <tr style="background-color: #1e293b; text-align: left; font-size: 12px; letter-spacing: 0.05em; color: #94a3b8;">
              <th style="padding: 12px 16px;">INGREDIENT</th>
              <th style="padding: 12px 16px;">CATEGORY</th>
              <th style="padding: 12px 16px; text-align: center;">CURRENT STOCK</th>
              <th style="padding: 12px 16px; text-align: center;">THRESHOLD</th>
              <th style="padding: 12px 16px; text-align: center;">DEFICIT</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div style="margin: 28px 0; text-align: center;">
          <a href="${CLIENT_URL}/admin/inventory" style="background-color: #f97316; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">Open Admin Inventory</a>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #1e293b; padding-top: 16px;">
          This automated alert was dispatched to <strong>${ADMIN_NOTIFY_EMAIL}</strong>. Items will not re-trigger notifications within 6 hours.
        </p>
      </div>
    `;

    // Send single consolidated email
    await sendEmail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `⚠️ [ALERT] Low Stock Inventory Warning (${lowStockItems.length} items)`,
      text: textContent,
      html: htmlContent,
      actionUrl: `${CLIENT_URL}/admin/inventory`,
    });

    // Update lastNotifiedAt timestamp on each notified item
    const now = new Date();
    const itemIds = lowStockItems.map((item) => item._id);
    await PizzaOption.updateMany({ _id: { $in: itemIds } }, { $set: { lastNotifiedAt: now } });

    console.log(`[LowStockJob] ✅ Alert dispatched and lastNotifiedAt updated on ${itemIds.length} items.`);

    return {
      triggered: true,
      count: lowStockItems.length,
      items: lowStockItems.map((i) => ({ name: i.name, stockQty: i.stockQty, threshold: i.lowStockThreshold })),
      notifiedAt: now,
      recipient: ADMIN_NOTIFY_EMAIL,
    };
  } catch (error) {
    console.error('[LowStockJob Error]', error.message);
    return { triggered: false, error: error.message };
  }
};

/**
 * Initialize node-cron schedule for automatic low-stock checks
 */
export const initLowStockCron = () => {
  const cronSchedule = process.env.LOW_STOCK_CRON || '0 */6 * * *';

  if (!cron.validate(cronSchedule)) {
    console.warn(`[LowStockJob] Invalid cron expression '${cronSchedule}'. Defaulting to '0 */6 * * *'.`);
  }

  const validSchedule = cron.validate(cronSchedule) ? cronSchedule : '0 */6 * * *';

  console.log(`[LowStockJob] Initializing cron job on schedule: '${validSchedule}'`);

  const task = cron.schedule(validSchedule, async () => {
    console.log(`\n[LowStockJob] Cron triggered at ${new Date().toISOString()}`);
    await checkLowStockAndNotify();
  });

  return task;
};
