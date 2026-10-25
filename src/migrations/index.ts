import * as migration_20261025_101925_initial from './20261025_101925_initial';
import * as migration_20261025_110113_hero_slides from './20261025_110113_hero_slides';
import * as migration_20261025_111618_blob_storage from './20261025_111618_blob_storage';
import * as migration_20261025_150726_addendum_p0p1 from './20261025_150726_addendum_p0p1';

export const migrations = [
  {
    up: migration_20261025_101925_initial.up,
    down: migration_20261025_101925_initial.down,
    name: '20261025_101925_initial',
  },
  {
    up: migration_20261025_110113_hero_slides.up,
    down: migration_20261025_110113_hero_slides.down,
    name: '20261025_110113_hero_slides',
  },
  {
    up: migration_20261025_111618_blob_storage.up,
    down: migration_20261025_111618_blob_storage.down,
    name: '20261025_111618_blob_storage',
  },
  {
    up: migration_20261025_150726_addendum_p0p1.up,
    down: migration_20261025_150726_addendum_p0p1.down,
    name: '20261025_150726_addendum_p0p1'
  },
];
