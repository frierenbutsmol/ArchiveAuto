// The database always stores kilometres. These helpers convert for display and input.
const KM_PER_MI = 1.609344;

export const distanceUnit = (metric = true) => (metric ? 'km' : 'mi');
export const kmToDisplay = (km, metric = true) =>
  metric ? Math.round(Number(km) || 0) : Math.round((Number(km) || 0) / KM_PER_MI);
export const displayToKm = (value, metric = true) =>
  metric ? Math.round(value) : Math.round(value * KM_PER_MI);
export const formatDistance = (km, metric = true) =>
  `${kmToDisplay(km, metric).toLocaleString()} ${distanceUnit(metric)}`;