import * as migration_20261025_101925_initial from './20261025_101925_initial';

export const migrations = [
  {
    up: migration_20261025_101925_initial.up,
    down: migration_20261025_101925_initial.down,
    name: '20261025_101925_initial'
  },
];
