import * as migration_20261025_005205_initial from './20261025_005205_initial';
import * as migration_20261025_174452_users_role from './20261025_174452_users_role';

export const migrations = [
  {
    up: migration_20261025_005205_initial.up,
    down: migration_20261025_005205_initial.down,
    name: '20261025_005205_initial',
  },
  {
    up: migration_20261025_174452_users_role.up,
    down: migration_20261025_174452_users_role.down,
    name: '20261025_174452_users_role'
  },
];
