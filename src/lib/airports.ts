/** Business-aviation airports operators can pick as trip endpoints. */
export interface Airport {
  icao: string
  name: string
  city: string
  lat: number
  lng: number
}

export const AIRPORTS: Airport[] = [
  // North America
  { icao: 'KTEB', name: 'Teterboro', city: 'New York, NY', lat: 40.8501, lng: -74.0608 },
  { icao: 'KHPN', name: 'Westchester County', city: 'White Plains, NY', lat: 41.067, lng: -73.7076 },
  { icao: 'KJFK', name: 'John F. Kennedy Intl', city: 'New York, NY', lat: 40.6413, lng: -73.7781 },
  { icao: 'KBED', name: 'Hanscom Field', city: 'Bedford, MA', lat: 42.47, lng: -71.289 },
  { icao: 'KACK', name: 'Nantucket Memorial', city: 'Nantucket, MA', lat: 41.2531, lng: -70.0602 },
  { icao: 'KMVY', name: "Martha's Vineyard", city: 'Vineyard Haven, MA', lat: 41.3931, lng: -70.6143 },
  { icao: 'KIAD', name: 'Washington Dulles Intl', city: 'Washington, DC', lat: 38.9531, lng: -77.4565 },
  { icao: 'KPBI', name: 'Palm Beach Intl', city: 'West Palm Beach, FL', lat: 26.6832, lng: -80.0956 },
  { icao: 'KOPF', name: 'Miami-Opa Locka Exec', city: 'Miami, FL', lat: 25.907, lng: -80.2784 },
  { icao: 'KFLL', name: 'Fort Lauderdale-Hollywood', city: 'Fort Lauderdale, FL', lat: 26.0726, lng: -80.1527 },
  { icao: 'KAPF', name: 'Naples Municipal', city: 'Naples, FL', lat: 26.1526, lng: -81.7753 },
  { icao: 'KPDK', name: 'DeKalb-Peachtree', city: 'Atlanta, GA', lat: 33.8756, lng: -84.302 },
  { icao: 'KCLT', name: 'Charlotte Douglas Intl', city: 'Charlotte, NC', lat: 35.214, lng: -80.9431 },
  { icao: 'KBNA', name: 'Nashville Intl', city: 'Nashville, TN', lat: 36.1245, lng: -86.6782 },
  { icao: 'KMDW', name: 'Chicago Midway', city: 'Chicago, IL', lat: 41.7868, lng: -87.7522 },
  { icao: 'KPWK', name: 'Chicago Executive', city: 'Wheeling, IL', lat: 42.1142, lng: -87.9015 },
  { icao: 'KDAL', name: 'Dallas Love Field', city: 'Dallas, TX', lat: 32.8471, lng: -96.8518 },
  { icao: 'KADS', name: 'Addison', city: 'Dallas, TX', lat: 32.9686, lng: -96.8364 },
  { icao: 'KHOU', name: 'William P. Hobby', city: 'Houston, TX', lat: 29.6454, lng: -95.2789 },
  { icao: 'KAUS', name: 'Austin-Bergstrom Intl', city: 'Austin, TX', lat: 30.1975, lng: -97.6664 },
  { icao: 'KAPA', name: 'Centennial', city: 'Denver, CO', lat: 39.5701, lng: -104.849 },
  { icao: 'KASE', name: 'Aspen/Pitkin County', city: 'Aspen, CO', lat: 39.2232, lng: -106.8688 },
  { icao: 'KEGE', name: 'Eagle County Regional', city: 'Vail, CO', lat: 39.6426, lng: -106.9177 },
  { icao: 'KTEX', name: 'Telluride Regional', city: 'Telluride, CO', lat: 37.9538, lng: -107.9085 },
  { icao: 'KSUN', name: 'Friedman Memorial', city: 'Sun Valley, ID', lat: 43.5044, lng: -114.2962 },
  { icao: 'KJAC', name: 'Jackson Hole', city: 'Jackson, WY', lat: 43.6073, lng: -110.7377 },
  { icao: 'KBZN', name: 'Bozeman Yellowstone Intl', city: 'Bozeman, MT', lat: 45.7775, lng: -111.1503 },
  { icao: 'KSDL', name: 'Scottsdale', city: 'Scottsdale, AZ', lat: 33.6229, lng: -111.9105 },
  { icao: 'KLAS', name: 'Harry Reid Intl', city: 'Las Vegas, NV', lat: 36.084, lng: -115.1537 },
  { icao: 'KTRK', name: 'Truckee Tahoe', city: 'Truckee, CA', lat: 39.32, lng: -120.1396 },
  { icao: 'KVNY', name: 'Van Nuys', city: 'Los Angeles, CA', lat: 34.2098, lng: -118.49 },
  { icao: 'KSMO', name: 'Santa Monica Municipal', city: 'Santa Monica, CA', lat: 34.0158, lng: -118.4513 },
  { icao: 'KBUR', name: 'Hollywood Burbank', city: 'Burbank, CA', lat: 34.2007, lng: -118.3587 },
  { icao: 'KSNA', name: 'John Wayne', city: 'Orange County, CA', lat: 33.6757, lng: -117.8682 },
  { icao: 'KCRQ', name: 'McClellan-Palomar', city: 'Carlsbad, CA', lat: 33.1283, lng: -117.2803 },
  { icao: 'KTRM', name: 'Jacqueline Cochran Regional', city: 'Palm Springs, CA', lat: 33.6267, lng: -116.16 },
  { icao: 'KOAK', name: 'Oakland Intl', city: 'Oakland, CA', lat: 37.7213, lng: -122.2208 },
  { icao: 'KSJC', name: 'San José Mineta Intl', city: 'San José, CA', lat: 37.3639, lng: -121.9289 },
  { icao: 'KBFI', name: 'Boeing Field', city: 'Seattle, WA', lat: 47.53, lng: -122.3019 },
  { icao: 'PHNL', name: 'Daniel K. Inouye Intl', city: 'Honolulu, HI', lat: 21.3187, lng: -157.9225 },
  { icao: 'PHOG', name: 'Kahului', city: 'Maui, HI', lat: 20.8986, lng: -156.4305 },
  { icao: 'PANC', name: 'Ted Stevens Anchorage Intl', city: 'Anchorage, AK', lat: 61.1743, lng: -149.9962 },
  { icao: 'CYYZ', name: 'Toronto Pearson Intl', city: 'Toronto, ON', lat: 43.6777, lng: -79.6248 },
  { icao: 'CYUL', name: 'Montréal-Trudeau Intl', city: 'Montréal, QC', lat: 45.4706, lng: -73.7408 },
  { icao: 'CYVR', name: 'Vancouver Intl', city: 'Vancouver, BC', lat: 49.1967, lng: -123.1815 },
  { icao: 'MMSD', name: 'Los Cabos Intl', city: 'San José del Cabo, MX', lat: 23.1518, lng: -109.7215 },
  { icao: 'MMUN', name: 'Cancún Intl', city: 'Cancún, MX', lat: 21.0365, lng: -86.8771 },
  // Caribbean
  { icao: 'MYNN', name: 'Lynden Pindling Intl', city: 'Nassau, BS', lat: 25.039, lng: -77.4662 },
  { icao: 'TNCM', name: 'Princess Juliana Intl', city: 'St. Maarten', lat: 18.041, lng: -63.1089 },
  { icao: 'TFFJ', name: 'Gustaf III', city: 'St. Barthélemy', lat: 17.9044, lng: -62.8436 },
  { icao: 'TIST', name: 'Cyril E. King', city: 'St. Thomas, VI', lat: 18.3373, lng: -64.9734 },
  { icao: 'TBPB', name: 'Grantley Adams Intl', city: 'Barbados', lat: 13.0746, lng: -59.4925 },
  // Europe
  { icao: 'EGLF', name: 'Farnborough', city: 'Farnborough, UK', lat: 51.2758, lng: -0.7763 },
  { icao: 'EGGW', name: 'London Luton', city: 'London, UK', lat: 51.8747, lng: -0.3683 },
  { icao: 'EGKB', name: 'London Biggin Hill', city: 'London, UK', lat: 51.3308, lng: 0.0325 },
  { icao: 'LFPB', name: 'Paris–Le Bourget', city: 'Paris, FR', lat: 48.9694, lng: 2.4414 },
  { icao: 'LFMN', name: "Nice Côte d'Azur", city: 'Nice, FR', lat: 43.6584, lng: 7.2159 },
  { icao: 'LSGG', name: 'Geneva', city: 'Geneva, CH', lat: 46.2381, lng: 6.109 },
  { icao: 'LSZH', name: 'Zürich', city: 'Zürich, CH', lat: 47.4582, lng: 8.5555 },
  { icao: 'LSZS', name: 'Samedan', city: 'St. Moritz, CH', lat: 46.5341, lng: 9.8841 },
  { icao: 'LIML', name: 'Milan Linate', city: 'Milan, IT', lat: 45.4451, lng: 9.2767 },
  { icao: 'LIRA', name: 'Rome Ciampino', city: 'Rome, IT', lat: 41.7994, lng: 12.5949 },
  { icao: 'LIEO', name: 'Olbia Costa Smeralda', city: 'Olbia, IT', lat: 40.8987, lng: 9.5176 },
  { icao: 'LEIB', name: 'Ibiza', city: 'Ibiza, ES', lat: 38.8729, lng: 1.3731 },
  { icao: 'LEMD', name: 'Madrid–Barajas', city: 'Madrid, ES', lat: 40.4983, lng: -3.5676 },
  { icao: 'LGMK', name: 'Mykonos', city: 'Mykonos, GR', lat: 37.4351, lng: 25.3481 },
  { icao: 'EDDM', name: 'Munich', city: 'Munich, DE', lat: 48.3538, lng: 11.7861 },
  { icao: 'EHAM', name: 'Amsterdam Schiphol', city: 'Amsterdam, NL', lat: 52.3105, lng: 4.7683 },
  { icao: 'LOWW', name: 'Vienna Intl', city: 'Vienna, AT', lat: 48.1103, lng: 16.5697 },
  { icao: 'BIKF', name: 'Keflavík Intl', city: 'Reykjavík, IS', lat: 63.985, lng: -22.6056 },
  // Middle East / Africa / Asia-Pacific
  { icao: 'OMDW', name: 'Al Maktoum Intl', city: 'Dubai, AE', lat: 24.8962, lng: 55.1614 },
  { icao: 'OERK', name: 'King Khalid Intl', city: 'Riyadh, SA', lat: 24.9576, lng: 46.6988 },
  { icao: 'FAOR', name: 'O. R. Tambo Intl', city: 'Johannesburg, ZA', lat: -26.1392, lng: 28.246 },
  { icao: 'VHHH', name: 'Hong Kong Intl', city: 'Hong Kong', lat: 22.308, lng: 113.9185 },
  { icao: 'WSSL', name: 'Seletar', city: 'Singapore', lat: 1.4169, lng: 103.8678 },
  { icao: 'RJTT', name: 'Tokyo Haneda', city: 'Tokyo, JP', lat: 35.5494, lng: 139.7798 },
  { icao: 'YSSY', name: 'Sydney Kingsford Smith', city: 'Sydney, AU', lat: -33.9399, lng: 151.1753 },
]

const BY_ICAO = new Map(AIRPORTS.map((a) => [a.icao, a]))

export function findAirport(icao: string | undefined): Airport | undefined {
  return icao ? BY_ICAO.get(icao.toUpperCase()) : undefined
}

/** Common business-jet type ratings (FAA designators) for the picker. */
export const TYPE_RATINGS = [
  'CE-525 (Citation CJ series)',
  'CE-560XL (Citation Excel/XLS)',
  'CE-680 (Citation Sovereign/Latitude)',
  'CE-700 (Citation Longitude)',
  'CE-750 (Citation X)',
  'EMB-505 (Phenom 300)',
  'EMB-545 (Praetor/Legacy 450/500)',
  'LR-JET (Learjet)',
  'HS-125 (Hawker)',
  'BE-400 (Beechjet/Hawker 400)',
  'PC-12 (Pilatus PC-12)',
  'PC-24 (Pilatus PC-24)',
  'CL-30 (Challenger 300/350)',
  'CL-65 (Challenger 600 series)',
  'BD-700 (Global Express/5000/6000/7500)',
  'G-IV (Gulfstream IV/G450)',
  'G-V (Gulfstream V/G550)',
  'GVI (Gulfstream G650)',
  'GVII (Gulfstream G500/G600)',
  'G-280 (Gulfstream G280)',
  'DA-50 (Falcon 50)',
  'DA-7X (Falcon 7X/8X)',
  'DA-2000 (Falcon 2000)',
  'DA-900 (Falcon 900)',
  'HDJ-1 (HondaJet)',
]

/** Short designator used for matching: "G-IV (Gulfstream IV/G450)" → "G-IV". */
export function ratingCode(rating: string): string {
  return rating.split(' (')[0].trim().toUpperCase()
}
