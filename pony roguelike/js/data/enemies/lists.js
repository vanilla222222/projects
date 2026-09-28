'use strict';

const ENEMY_LIST = Object.values(ENEMY_TYPES);

const LEGACY_ENEMY_ALIASES = {
  grub:'gravegrub', scrapper:'bonepicker', slinger:'cryptslinger', brute:'thornhide',
  bomber:'sporepopper', wisp:'firefly', shellback:'shellbone',
};
function resolveEnemyTypeId(id){
  return ENEMY_TYPES[id] ? id : (LEGACY_ENEMY_ALIASES[id] || id);
}
