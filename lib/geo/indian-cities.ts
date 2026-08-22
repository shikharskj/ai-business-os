import { GST_STATE_CODES } from "@/modules/tax/domain/gstin";

/** Curated major cities/districts per GST state name (not exhaustive). */
export const INDIAN_CITIES_BY_STATE: Readonly<Record<string, readonly string[]>> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Durg"],
  Chandigarh: ["Chandigarh"],
  Delhi: ["New Delhi", "Delhi"],
  Goa: ["Panaji", "Margao", "Vasco da Gama"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar"],
  Haryana: ["Gurugram", "Faridabad", "Panipat", "Ambala", "Karnal"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  Ladakh: ["Leh", "Kargil"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Aurangabad"],
  Manipur: ["Imphal"],
  Meghalaya: ["Shillong"],
  Mizoram: ["Aizawl"],
  Nagaland: ["Kohima", "Dimapur"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  Puducherry: ["Puducherry", "Karaikal"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Mohali"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  Sikkim: ["Gangtok"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"],
  Tripura: ["Agartala"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Varanasi", "Agra"],
  Uttarakhand: ["Dehradun", "Haridwar", "Haldwani", "Roorkee"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Lakshadweep: ["Kavaratti"],
  "Other Territory": [],
};

const CITY_TO_STATES = new Map<string, string[]>();

for (const stateName of Object.values(GST_STATE_CODES)) {
  const cities = INDIAN_CITIES_BY_STATE[stateName] ?? [];
  for (const city of cities) {
    const key = city.trim().toLowerCase();
    const existing = CITY_TO_STATES.get(key) ?? [];
    if (!existing.includes(stateName)) {
      CITY_TO_STATES.set(key, [...existing, stateName]);
    }
  }
}

export function getCitiesForState(stateName: string): string[] {
  const normalized = stateName.trim();
  if (!normalized) {
    return [];
  }
  const exact = INDIAN_CITIES_BY_STATE[normalized];
  if (exact) {
    return [...exact];
  }
  const match = Object.entries(INDIAN_CITIES_BY_STATE).find(
    ([name]) => name.toLowerCase() === normalized.toLowerCase()
  );
  return match ? [...match[1]] : [];
}

export function getStateForCity(city: string): string | null {
  const states = CITY_TO_STATES.get(city.trim().toLowerCase()) ?? [];
  if (states.length === 1) {
    return states[0] ?? null;
  }
  return null;
}

export function getStatesForCity(city: string): string[] {
  return [...(CITY_TO_STATES.get(city.trim().toLowerCase()) ?? [])];
}

export function cityBelongsToState(city: string, stateName: string): boolean {
  if (!city.trim() || !stateName.trim()) {
    return true;
  }
  const mappedState = getStateForCity(city);
  if (mappedState) {
    return mappedState.toLowerCase() === stateName.trim().toLowerCase();
  }
  return true;
}
