/**
 * AgriPulse Community — community layer over the 1:1 Cloud API.
 * ─────────────────────────────────────────────────────────────────────────
 * Meta's Cloud API has no group/Community API, so the AgriPulse Community
 * is modeled server-side: farmers JOIN named channels and every community
 * event fans out as individual messages to the members of that channel.
 * From the farmer's side it behaves exactly like a community group:
 * Suresh posts a truck load → every Truck Pool member's WhatsApp pings.
 *
 * ZERO-COST RULE: broadcasts are only delivered to members whose 24-hour
 * service window is open (they messaged us within 24 h). Everyone else is
 * skipped and counted — upgrading them to paid template pushes is a
 * one-line change in broadcastToChannel() if ever wanted.
 */

import { sendTextMessage } from './client.js';
import { listMembers, isWindowOpen } from './store.js';

export const COMMUNITY_NAME = 'AgriPulse';

/** Channel ids mirror the group ids in the app's demo hub (pool/fraud/deals/mandi). */
export const CHANNELS = [
  { id: 'pool', emoji: '🚚', title: 'Truck Pool', description: 'Aas-paas ke loads — bhada split karo' },
  { id: 'fraud', emoji: '🚨', title: 'Fraud Alerts', description: 'Pakde gaye frauds ki turant khabar' },
  { id: 'deals', emoji: '🛒', title: 'Direct Deals', description: 'Buyers ke seedhe orders, bina bichauliye' },
  { id: 'mandi', emoji: '🥬', title: 'Mandi Bhav', description: 'Roz ke bhav aur trend alerts' },
];

export const getChannel = (id) => CHANNELS.find((c) => c.id === id) || null;

/**
 * Fan a community post out to a channel's members.
 * @param {string} channelId       one of CHANNELS ids
 * @param {string} text            WhatsApp-Markdown body (header is added)
 * @param {{exclude?: string}} opts exclude a phone (usually the poster)
 * @returns {{sent: number, skipped: number, members: number}}
 */
export async function broadcastToChannel(channelId, text, { exclude } = {}) {
  const channel = getChannel(channelId);
  if (!channel) return { sent: 0, skipped: 0, members: 0 };

  const members = await listMembers(channelId);
  const body =
    `${channel.emoji} *${COMMUNITY_NAME} Community · ${channel.title}*\n\n${text}\n\n` +
    `_Reply *leave ${channel.id}* to mute this channel._`;

  let sent = 0;
  let skipped = 0;
  for (const member of members) {
    if (exclude && member.phone === exclude) continue;
    if (!isWindowOpen(member)) { skipped++; continue; } // free tier: service window only
    try {
      await sendTextMessage(member.phone, body);
      sent++;
    } catch (err) {
      console.error(`[community] fan-out to ${member.phone} failed:`, err.message);
      skipped++;
    }
  }
  console.log(`[community] ${channel.title}: ${sent} delivered, ${skipped} skipped (window closed)`);
  return { sent, skipped, members: members.length };
}
