import { INDIA_STATES, getIndiaStateName } from './indiaStates';

/**
 * Returns list of Indian states without requiring the 8.6MB world geo database.
 */
export const getIndiaStatesList = () => {
  return Object.entries(INDIA_STATES).map(([isoCode, name]) => ({
    isoCode,
    name
  }));
};

let cachedGeoModule = null;

/**
 * Lazy loads country-state-city only on demand when cities for a specific state are requested.
 */
export const getCitiesForIndiaState = async (stateCode) => {
  if (!stateCode) return [];
  try {
    if (!cachedGeoModule) {
      cachedGeoModule = await import('country-state-city');
    }
    return cachedGeoModule.City.getCitiesOfState('IN', stateCode);
  } catch (err) {
    console.error('Failed to load cities for state:', stateCode, err);
    return [];
  }
};

export { getIndiaStateName };
