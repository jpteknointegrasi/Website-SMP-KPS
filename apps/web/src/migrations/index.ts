import * as migration_20261025_101925_initial from './20261025_101925_initial';
import * as migration_20261025_110113_hero_slides from './20261025_110113_hero_slides';
import * as migration_20261025_111618_blob_storage from './20261025_111618_blob_storage';
import * as migration_20261025_150726_addendum_p0p1 from './20261025_150726_addendum_p0p1';
import * as migration_20261025_200110_platform_multi_tenant from './20261025_200110_platform_multi_tenant';
import * as migration_20261025_211956_platform_document_locks from './20261025_211956_platform_document_locks';
import * as migration_20261026_032802_product_subscriptions from './20261026_032802_product_subscriptions';
import * as migration_20261027_011036_app_karya from './20261027_011036_app_karya';

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
    name: '20261025_150726_addendum_p0p1',
  },
  {
    up: migration_20261025_200110_platform_multi_tenant.up,
    down: migration_20261025_200110_platform_multi_tenant.down,
    name: '20261025_200110_platform_multi_tenant',
  },
  {
    up: migration_20261025_211956_platform_document_locks.up,
    down: migration_20261025_211956_platform_document_locks.down,
    name: '20261025_211956_platform_document_locks',
  },
  {
    up: migration_20261026_032802_product_subscriptions.up,
    down: migration_20261026_032802_product_subscriptions.down,
    name: '20261026_032802_product_subscriptions',
  },
  {
    up: migration_20261027_011036_app_karya.up,
    down: migration_20261027_011036_app_karya.down,
    name: '20261027_011036_app_karya'
  },
];
