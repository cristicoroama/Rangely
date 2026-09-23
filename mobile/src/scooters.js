/**
 * Popular scooters, so nobody has to know what a watt-hour is.
 *
 * Asking a fourteen-year-old for their "pack capacity in Wh" is asking them to
 * skip the question. Asking which scooter they have is not. Figures are the
 * makers' own specifications (voltage × amp-hours), collected in the research
 * dossier; "other" keeps the old number field for everything else.
 */
export const SCOOTERS = [
  { key: "xiaomi-4", name: "Xiaomi Electric Scooter 4", packWh: 275 },
  { key: "xiaomi-4-pro", name: "Xiaomi 4 Pro", packWh: 446 },
  { key: "xiaomi-4-pro-2", name: "Xiaomi 4 Pro (2nd gen)", packWh: 468 },
  { key: "xiaomi-5", name: "Xiaomi 5 / 5 Pro / 5 Max", packWh: 477 },
  { key: "segway-g30", name: "Segway Max G30", packWh: 551 },
  { key: "segway-g2", name: "Segway Max G2", packWh: 551 },
  { key: "segway-f2-pro", name: "Segway F2 Pro", packWh: 460 },
  { key: "segway-e2-pro", name: "Segway E2 Pro", packWh: 275 },
  { key: "niu-kqi3-pro", name: "NIU KQi3 Pro", packWh: 486 },
  { key: "navee-n65", name: "Navee N65", packWh: 600 },
];

export const OTHER = { key: "other", name: "Another scooter", packWh: 400 };

export const findScooter = (key) => SCOOTERS.find((s) => s.key === key) ?? null;

/**
 * Where the rider reads the battery, which decides how precise a ride can be.
 *
 * The maker's phone app shows exact percent; many dashboards show five bars of
 * twenty percent each, which is ±8 points on a difference — fine for a full
 * charge, useless for a trip to the shop.
 */
export const DISPLAYS = [
  { key: "app", label: "Exact %, in the scooter's app", resolution: 1 },
  { key: "number", label: "A number on the scooter", resolution: 2 },
  { key: "bars", label: "Bars on the scooter", resolution: 20 },
];

export const displayResolution = (key) =>
  DISPLAYS.find((d) => d.key === key)?.resolution ?? 1;
