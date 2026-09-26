// The app's mountains for the site: src/data/app-mountains.json (exported
// from the trails table by eiger-ops/scripts/export_app_mountains.py) bound
// to the pure index in appMountainsIndex.js.
import data from '../data/app-mountains.json';
import { createAppIndex } from './appMountainsIndex';

const index = createAppIndex(data.mountains);

export const APP_MOUNTAINS = index.mountains;
export const { appMountainFor, nearbyAppMountain, selectionFromApp } = index;
