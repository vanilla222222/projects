'use strict';

RETRO.run = function runSearch(settings, onProgress) {
  const status = RETRO.settings.ready(settings);
  if (!status.ok) throw new Error(status.reason);
  const defaults = RETRO.settings.defaults();
  const unsupported = RETRO.settings.SCHEMA.filter(entry => RETRO.settings.UNAPPLIED.has(entry.key)
    && JSON.stringify(settings[entry.key]) !== JSON.stringify(defaults[entry.key]));
  if (unsupported.length) {
    throw new Error('These settings are not supported by the engine yet. Restore their defaults to search. '
      + unsupported.map(entry => entry.label).join(', '));
  }
  const started = Date.now();
  const engine = RETRO.search.makeEngine(settings);
  if (engine.stock.rejected.length) throw new Error('Could not read stock entries. ' + engine.stock.rejected.join(', '));
  const options = { deadline:started + settings.budgetMs, onProgress };
  const restrictions = ['allowCryogenic', 'allowPressure', 'allowPhotochemistry',
    'allowElectrochemistry', 'allowAirSensitive'];
  const hasRestrictions = restrictions.some(key => settings[key] === false);
  const result = settings.mode === 'analogues'
    ? RETRO.analogues.analogues(settings.target, settings, engine, options)
    : settings.mode === 'path'
      ? engine.path(settings.target, settings.start, options)
      : engine.route(settings.target, options);
  if (hasRestrictions) {
    result.conditionNotice = 'Condition exclusions apply to recorded rule metadata. Missing condition information is unknown.';
  }
  return result;
};
