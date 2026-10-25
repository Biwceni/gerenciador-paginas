import * as migration_20261025_005205_initial from './20261025_005205_initial';

export const migrations = [
  {
    up: migration_20261025_005205_initial.up,
    down: migration_20261025_005205_initial.down,
    name: '20261025_005205_initial'
  },
];
