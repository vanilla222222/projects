'use strict';

const ITEM_LIST = Object.values(ITEMS);
const PASSIVE_ITEMS = ITEM_LIST.filter(i => i.type === 'passive');
const ACTIVE_ITEMS = ITEM_LIST.filter(i => i.type === 'active');
