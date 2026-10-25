import * as migration_20261025_101925_initial from './20261025_101925_initial';
import * as migration_20261025_110113_hero_slides from './20261025_110113_hero_slides';

export const migrations = [
  {
    up: migration_20261025_101925_initial.up,
    down: migration_20261025_101925_initial.down,
    name: '20261025_101925_initial',
  },
  {
    up: migration_20261025_110113_hero_slides.up,
    down: migration_20261025_110113_hero_slides.down,
    name: '20261025_110113_hero_slides'
  },
];
