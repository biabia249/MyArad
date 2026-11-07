import { Asset } from 'expo-asset';

export const routeBurgundy = '#800020';
const pedestrianUri = Asset.fromModule(require('../../../assets/images/map-pedestrian.png')).uri;
const escapedUri = pedestrianUri.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Keep the GPS halo separate from Leaflet's marker positioning transform.
export const travelerMarkup = `<span class="traveler-halo"></span><img class="traveler-person" src="${escapedUri}" alt="" aria-hidden="true" draggable="false" />`;