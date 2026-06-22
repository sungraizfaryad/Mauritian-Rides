export interface Location {
  name: string;
  lat: number;
  lng: number;
}

// Default catalogue used by the fare estimator and autocomplete dropdown.
// Ordered by frequency of use in Mauritius ride bookings.
export const LOCATIONS: Location[] = [
  { name: 'SSR International Airport',   lat: -20.4302, lng: 57.6836 },
  { name: 'Port Louis Waterfront',        lat: -20.1600, lng: 57.5012 },
  { name: 'Grand Baie',                   lat: -20.0135, lng: 57.5803 },
  { name: 'Flic en Flac',                 lat: -20.2983, lng: 57.3675 },
  { name: 'Le Morne',                     lat: -20.4496, lng: 57.3186 },
  { name: 'Mahebourg',                    lat: -20.4085, lng: 57.7027 },
  { name: 'Trou aux Biches',              lat: -20.0310, lng: 57.5340 },
  { name: 'Belle Mare',                   lat: -20.1935, lng: 57.7792 },
  // Hotel hubs
  { name: 'Beachcomber (Trou aux Biches)', lat: -20.0285, lng: 57.5322 },
  { name: 'LUX* Grand Gaube',             lat: -19.9817, lng: 57.6611 },
  { name: 'Constance Belle Mare Plage',   lat: -20.1915, lng: 57.7805 },
  { name: 'Attitude Azuri',               lat: -20.0012, lng: 57.6408 },
  { name: 'Heritage Le Telfair',          lat: -20.4426, lng: 57.4151 },
  { name: 'Sugar Beach Resort',           lat: -20.3009, lng: 57.3730 },
  { name: 'Four Seasons Anahita',         lat: -20.2055, lng: 57.8003 },
  { name: 'One&Only Le Saint Géran',      lat: -20.1869, lng: 57.8078 },
];
