/**
 * Popular scooters, so nobody has to know what a watt-hour is.
 *
 * Asking a fourteen-year-old for their "pack capacity in Wh" is asking them to
 * skip the question. Asking which scooter they have is not. Pack energy is the
 * maker's nominal voltage × amp-hours, worked out here rather than copied,
 * because the Wh printed on listings is often an old label (a "960 Wh" G2 Max
 * is 48 V × 20.8 Ah = 998 Wh). Sources and the variants each model comes in
 * are in the research dossier; the battery size stays editable because packs
 * change between production runs without a new name.
 *
 * `display` is how that scooter usually shows its charge, so picking a model
 * also picks the right way to ask for the battery. `maxKmh` is the factory
 * top speed; anything over the legal 25 km/h gets a note (see rules.js).
 */
export const BRANDS = ["Xiaomi", "Segway", "NIU", "Navee", "KuKirin", "Dualtron"];

const S = (brand, key, name, packWh, display, maxKmh) => ({ brand, key, name, packWh, display, maxKmh });

export const SCOOTERS = [
  S("Xiaomi", "xiaomi-4", "Xiaomi Electric Scooter 4", 275, "app", 25),
  S("Xiaomi", "xiaomi-4-pro", "Xiaomi 4 Pro", 446, "app", 25),
  S("Xiaomi", "xiaomi-4-pro-2", "Xiaomi 4 Pro (2nd gen)", 468, "app", 25),
  S("Xiaomi", "xiaomi-5", "Xiaomi 5 / 5 Pro / 5 Max", 477, "app", 25),

  S("Segway", "segway-g30", "Segway Max G30", 551, "app", 25),
  S("Segway", "segway-g2", "Segway Max G2", 551, "app", 25),
  S("Segway", "segway-f2-pro", "Segway F2 Pro", 460, "app", 25),
  S("Segway", "segway-e2-pro", "Segway E2 Pro", 275, "app", 25),

  S("NIU", "niu-kqi3-pro", "NIU KQi3 Pro", 486, "app", 25),

  S("Navee", "navee-n65", "Navee N65", 600, "app", 25),

  // KuKirin dashboards show the battery as ten segments.
  S("KuKirin", "kukirin-s1", "KuKirin S1", 216, "bars10", 30),
  S("KuKirin", "kukirin-s1-pro", "KuKirin S1 Pro", 270, "bars10", 30),
  S("KuKirin", "kukirin-s1-max", "KuKirin S1 Max", 374, "bars10", 25),
  S("KuKirin", "kukirin-a1", "KuKirin A1", 624, "bars10", 45),
  S("KuKirin", "kukirin-c1-pro", "KuKirin C1 Pro", 1248, "bars10", 45),
  S("KuKirin", "kukirin-m4", "KuKirin M4", 600, "bars10", 45),
  S("KuKirin", "kukirin-m4-pro", "KuKirin M4 Pro", 864, "bars10", 45),
  S("KuKirin", "kukirin-m4-max", "KuKirin M4 Max", 874, "bars10", 45),
  S("KuKirin", "kukirin-t3", "KuKirin T3", 749, "bars10", 45),
  S("KuKirin", "kukirin-g2", "KuKirin G2", 720, "bars10", 45),
  S("KuKirin", "kukirin-g2-pro", "KuKirin G2 Pro", 749, "bars10", 45),
  S("KuKirin", "kukirin-g2-max", "KuKirin G2 Max", 998, "bars10", 55),
  S("KuKirin", "kukirin-g2-ultra", "KuKirin G2 Ultra", 864, "bars10", 50),
  S("KuKirin", "kukirin-g2-master", "KuKirin G2 Master", 1082, "bars10", 60),
  S("KuKirin", "kukirin-g3", "KuKirin G3", 936, "bars10", 50),
  S("KuKirin", "kukirin-g3-pro", "KuKirin G3 Pro", 1206, "bars10", 65),
  S("KuKirin", "kukirin-g4", "KuKirin G4 / G4 Ultra", 1200, "bars10", 70),
  S("KuKirin", "kukirin-g4-max", "KuKirin G4 Max", 2112, "bars10", 86),

  // Dualtron's EY3 and EY4 throttles can show the charge as a percentage.
  S("Dualtron", "dualtron-mini", "Dualtron Mini", 910, "number", 45),
  S("Dualtron", "dualtron-mini-special", "Dualtron Mini Special", 1092, "number", 45),
  S("Dualtron", "dualtron-aminia", "Dualtron Aminia", 910, "number", 45),
  S("Dualtron", "dualtron-togo", "Dualtron Togo", 720, "number", 40),
  S("Dualtron", "dualtron-togo-limited", "Dualtron Togo Limited", 900, "number", 52),
  S("Dualtron", "dualtron-popular", "Dualtron Popular", 1040, "number", 45),
  S("Dualtron", "dualtron-popular-dual", "Dualtron Popular (dual motor)", 1300, "number", 55),
  S("Dualtron", "dualtron-eagle-pro", "Dualtron Eagle Pro", 1344, "number", 69),
  S("Dualtron", "dualtron-city", "Dualtron City", 1500, "number", 70),
  S("Dualtron", "dualtron-spider-2", "Dualtron Spider 2", 1800, "number", 70),
  S("Dualtron", "dualtron-compact", "Dualtron Compact", 1800, "number", 65),
  S("Dualtron", "dualtron-victor", "Dualtron Victor / Victor Luxury", 1800, "number", 80),
  S("Dualtron", "dualtron-victor-luxury-plus", "Dualtron Victor Luxury+", 2100, "number", 85),
  S("Dualtron", "dualtron-achilleus", "Dualtron Achilleus", 2100, "number", 70),
  S("Dualtron", "dualtron-storm", "Dualtron Storm", 2268, "number", 85),
  S("Dualtron", "dualtron-thunder-2", "Dualtron Thunder 2", 2880, "number", 100),
  S("Dualtron", "dualtron-thunder-3", "Dualtron Thunder 3", 2880, "number", 100),
  S("Dualtron", "dualtron-x2-up", "Dualtron X2 Up", 3024, "number", 105),
  S("Dualtron", "dualtron-storm-limited", "Dualtron Storm Limited", 3780, "number", 100),
  S("Dualtron", "dualtron-x-limited", "Dualtron X Limited", 5040, "number", 110),
];

export const OTHER = { key: "other", name: "Another scooter", packWh: 400, display: "app" };

export const findScooter = (key) => SCOOTERS.find((s) => s.key === key) ?? null;

export const scootersOf = (brand) => SCOOTERS.filter((s) => s.brand === brand);

/** Faster than the law allows out of the box — worth a word when picked. */
export const overLegalSpeed = (preset, limitKmh = 25) => !!preset && preset.maxKmh > limitKmh;

/**
 * Where the rider reads the battery, which decides how precise a ride can be.
 *
 * The maker's phone app shows exact percent; dashboards show five bars of
 * twenty percent (Xiaomi, Segway) or ten of ten (KuKirin). A bar is worth
 * half its width either way on each reading, which is why the coarser the
 * display, the longer a ride has to be before it says anything about the pack.
 */
export const DISPLAYS = [
  { key: "app", label: "Exact %, in the scooter's app", resolution: 1 },
  { key: "number", label: "A number on the scooter", resolution: 2 },
  { key: "bars10", label: "Ten bars on the scooter", resolution: 10, bars: 10 },
  { key: "bars", label: "Five bars on the scooter", resolution: 20, bars: 5 },
];

export const findDisplay = (key) => DISPLAYS.find((d) => d.key === key) ?? DISPLAYS[0];

export const displayResolution = (key) => DISPLAYS.find((d) => d.key === key)?.resolution ?? 1;
