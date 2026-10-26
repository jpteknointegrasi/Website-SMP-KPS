import * as migration_20261025_101925_initial from './20261025_101925_initial';
import * as migration_20261025_110113_hero_slides from './20261025_110113_hero_slides';
import * as migration_20261025_111618_blob_storage from './20261025_111618_blob_storage';
import * as migration_20261025_150726_addendum_p0p1 from './20261025_150726_addendum_p0p1';
import * as migration_20261026_055721_ika_alumni_page from './20261026_055721_ika_alumni_page';
import * as migration_20261026_061423_event_banner_rundown from './20261026_061423_event_banner_rundown';
import * as migration_20261026_064136_alumni_photo_credit from './20261026_064136_alumni_photo_credit';

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
    up: migration_20261026_055721_ika_alumni_page.up,
    down: migration_20261026_055721_ika_alumni_page.down,
    name: '20261026_055721_ika_alumni_page',
  },
  {
    up: migration_20261026_061423_event_banner_rundown.up,
    down: migration_20261026_061423_event_banner_rundown.down,
    name: '20261026_061423_event_banner_rundown',
  },
  {
    up: migration_20261026_064136_alumni_photo_credit.up,
    down: migration_20261026_064136_alumni_photo_credit.down,
    name: '20261026_064136_alumni_photo_credit'
  },
];
