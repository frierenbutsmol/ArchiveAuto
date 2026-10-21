// Brands and models offered in the Add Vehicle form (nobody has to type them).
// To change the lists, just edit the names below. Keep about 6-7 brands per type.
// "Other" is added automatically at the end of every list.
export const OTHER = 'Other';

export const VEHICLE_CATALOG = {
  car: {
    Toyota: ['Vios', 'Corolla Altis', 'Wigo', 'Rush', 'Innova', 'Fortuner', 'Hilux'],
    Honda: ['City', 'Civic', 'Brio', 'BR-V', 'HR-V', 'CR-V', 'Jazz'],
    Mitsubishi: ['Mirage', 'Mirage G4', 'Xpander', 'Montero Sport', 'Strada', 'Outlander'],
    Nissan: ['Almera', 'Kicks', 'Juke', 'Terra', 'Navara', 'Livina'],
    Suzuki: ['Swift', 'Dzire', 'Celerio', 'S-Presso', 'Ertiga', 'Jimny', 'Vitara'],
    Ford: ['Ranger', 'Everest', 'Territory', 'EcoSport', 'Explorer', 'Mustang'],
    Hyundai: ['Accent', 'Reina', 'Elantra', 'Creta', 'Tucson', 'Santa Fe', 'Kona'],
  },
  motorcycle: {
    Honda: ['Click 125', 'Click 160', 'Beat', 'XRM 125', 'TMX 125', 'PCX 160', 'ADV 160'],
    Yamaha: ['Mio i 125', 'Mio Gear', 'NMAX', 'Aerox', 'Sniper 155', 'XSR 155'],
    Suzuki: ['Raider R150', 'Smash 115', 'Skydrive 125', 'Burgman Street', 'GSX-R150', 'GSX-S150'],
    Kawasaki: ['Barako 175', 'Rouser NS200', 'KLX 150', 'W175', 'Ninja 400', 'Z400'],
    Kymco: ['Like 150i', 'Visar 150', 'Agility 125', 'Many 110', 'Super 8', 'Xciting S400'],
    SYM: ['Jet 14', 'Symphony ST 125', 'Bonus 110', 'Orbit III', 'Husky ADV 150'],
    KTM: ['Duke 200', 'Duke 390', 'RC 200', 'RC 390', 'Adventure 390'],
  },
  van: {
    Toyota: ['Hiace Commuter', 'Hiace Grandia', 'Hiace Super Grandia', 'Lite Ace'],
    Nissan: ['Urvan NV350', 'Urvan Escapade', 'Serena'],
    Hyundai: ['Starex', 'Grand Starex', 'H-100', 'H350'],
    Mitsubishi: ['L300', 'L300 Exceed', 'Delica'],
    Suzuki: ['APV', 'Carry', 'Every'],
    Ford: ['Transit', 'Transit Custom'],
    Foton: ['View Traveller', 'Transvan', 'Gratour', 'Toano'],
  },
  truck: {
    Isuzu: ['Elf N-Series', 'Forward F-Series', 'Giga', 'Traviz', 'D-Max'],
    'Mitsubishi Fuso': ['Canter', 'Fighter', 'Super Great', 'Shogun'],
    Hino: ['300 Series', '500 Series', '700 Series', 'Dutro'],
    Foton: ['Tornado', 'Aumark', 'Auman', 'Gratour'],
    Toyota: ['Hilux', 'Land Cruiser Pickup', 'Dyna'],
    Suzuki: ['Carry', 'Super Carry'],
    Ford: ['Ranger', 'F-150', 'Transit'],
  },
};

// Brand choices for a vehicle type (empty until a type is chosen).
export const brandsFor = (type) => {
  const brands = VEHICLE_CATALOG[type];
  return brands ? [...Object.keys(brands), OTHER] : [];
};

// Model choices for a brand. "Other" brand -> only "Other".
export const modelsFor = (type, brand) => {
  if (!brand) return [];
  if (brand === OTHER) return [OTHER];
  return [...(VEHICLE_CATALOG[type]?.[brand] || []), OTHER];
};

// Keeps a value that is already saved on a vehicle (for example one typed before these
// lists existed) selectable when you edit it, so editing never loses data.
export const withCurrent = (options, current) =>
  current && !options.includes(current) ? [current, ...options] : options;