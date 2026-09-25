// Fuel efficiency tracker for tractors & goods vehicles
const FUEL_KEY = 'ap_fuel_logs_v1';

export function getFuelLogs() {
  try {
    const raw = localStorage.getItem(FUEL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addFuelLog(log) {
  // log: { vehicle, type: 'tractor'|'truck', hoursOrKm, fuelLiters, workType, date }
  try {
    const logs = getFuelLogs();
    logs.unshift({ ...log, id: Date.now(), at: Date.now() });
    localStorage.setItem(FUEL_KEY, JSON.stringify(logs.slice(0, 100)));
    return logs;
  } catch { return []; }
}

export function deleteFuelLog(id) {
  try {
    const logs = getFuelLogs().filter(l => l.id !== id);
    localStorage.setItem(FUEL_KEY, JSON.stringify(logs));
    return logs;
  } catch { return []; }
}

export function getFuelStats() {
  const logs = getFuelLogs();
  if (!logs.length) return null;
  const totalFuel = logs.reduce((s,l) => s + (parseFloat(l.fuelLiters)||0), 0);
  const totalWork = logs.reduce((s,l) => s + (parseFloat(l.hoursOrKm)||0), 0);
  const avgEfficiency = totalWork ? (totalFuel / totalWork).toFixed(2) : 0; // L per hour or per km
  const byVehicle = {};
  logs.forEach(l => {
    const v = l.vehicle || 'Unknown';
    if (!byVehicle[v]) byVehicle[v] = { fuel:0, work:0, count:0 };
    byVehicle[v].fuel += parseFloat(l.fuelLiters)||0;
    byVehicle[v].work += parseFloat(l.hoursOrKm)||0;
    byVehicle[v].count += 1;
  });
  // Find most efficient
  let best = null;
  Object.entries(byVehicle).forEach(([veh, stats]) => {
    const eff = stats.work ? stats.fuel / stats.work : 999;
    if (!best || eff < best.eff) best = { vehicle: veh, eff, ...stats };
  });
  return { totalFuel, totalWork, avgEfficiency, byVehicle, best, logs: logs.slice(0,10) };
}

export function getFuelTips(efficiency) {
  const tips = [];
  if (efficiency > 4) tips.push('High fuel use — check air filter, tyre pressure, avoid overloading.');
  if (efficiency > 6) tips.push('Very high — service tractor, check injector, use correct gear.');
  tips.push('Maintain 1500-1800 RPM for best efficiency.');
  tips.push('Use 5-star rated implements, reduce idle time.');
  return tips;
}
