import {
  adv1,
  choiceFollowsFight,
  getCampground,
  getFuel,
  getProperty,
  haveEquipped,
  inebrietyLimit,
  inMultiFight,
  myInebriety,
  numericModifier,
  print,
  runCombat,
  setProperty,
  visitUrl,
  xpath,
} from 'kolmafia';
import {
  $item,
  $skill,
  Macro as LibramMacro,
  property,
  set,
} from 'libram';
// import { get } from 'lodash-es';
import {
  getPropertyBoolean,
  getPropertyInt,
  turboMode,
} from './lib';

// multiFight() stolen from Aenimus: https://github.com/Aenimus/aen_cocoabo_farm/blob/master/scripts/aen_combat.ash.
// Thanks! Licensed under MIT license.
function multiFight() {
  while (inMultiFight()) runCombat();
  if (choiceFollowsFight()) visitUrl('choice.php');
}

function candyblastDamage() {
  const spellDamagePercent = numericModifier('spell damage percent');
  const multiplier = (100 + spellDamagePercent) / 100;
  return Math.ceil(multiplier * 48);
}

export class Macro extends LibramMacro {
  submit() {
    print(`Submitting macro: ${this.toString()}`);
    return super.submit();
  }

  static nonFree() {
    return '!monstername "witchess" && !monstername "sausage goblin" && !monstername "black crayon"';
  }

  kill() {
    return this.externalIf(myInebriety() > inebrietyLimit(), 'attack')
      .if_('monstername sleaze hobo', Macro.skill($skill`Saucegeyser`).repeat())
      .externalIf(
        getPropertyInt('_shatteringPunchUsed') < 3,
        Macro.if_(Macro.nonFree(), Macro.skill($skill`Shattering Punch`))
      )
      .externalIf(
        !getPropertyBoolean('_gingerbreadMobHitUsed'),
        Macro.if_(Macro.nonFree(), Macro.skill($skill`Gingerbread Mob Hit`))
      )
      .externalIf(
        getPropertyInt('_chestXRayUsed') < 3 && haveEquipped($item`Lil' Doctor™ bag`),
        Macro.if_(Macro.nonFree(), Macro.skill($skill`Chest X-Ray`))
      )
      .externalIf(
        !getPropertyBoolean('_firedJokestersGun') && haveEquipped($item`The Jokester's gun`),
        Macro.if_(Macro.nonFree(), Macro.skill($skill`Fire the Jokester's Gun`))
      )
      .externalIf(
        !getPropertyBoolean('_missileLauncherUsed') &&
          getCampground()['Asdon Martin keyfob'] !== undefined &&
          getFuel() >= 100,
        Macro.if_(Macro.nonFree(), Macro.skill($skill`Asdon Martin: Missile Launcher`))
      )
      .externalIf(
        !turboMode(),
        Macro.while_('!hpbelow 500 && !match "some of it is even intact"', Macro.skill($skill`Candyblast`))
      )
      .skill($skill`Lunging Thrust-Smack`)
      .skill($skill`Lunging Thrust-Smack`)
      .if_('monstername spooky hobo', Macro.skill($skill`Lunging Thrust-Smack`).repeat())
      .skill($skill`Stuffed Mortar Shell`)
      .skill($skill`Saucegeyser`)
      .attack();
  }

  static kill() {
    return new Macro().kill();
  }

  spellKill() {
    return this.attack().repeat();
  }

  static spellKill() {
    return new Macro().spellKill();
  }

  tentacle(...steps: Macro[]) {
    return this.if_('monstername eldritch tentacle', Macro.step(...steps).spellKill());
  }

  static tentacle(...steps: Macro[]) {
    return new Macro().tentacle(...steps);
  }

  professor() {
    let lecture = $skill`lecture on relativity`;
    return this.if_(`hasskill ${lecture}`, Macro.skill(`${lecture}`));
  }
  static professor() {
    return new Macro().professor();
  }

  kramco(...steps: Macro[]) {
    return this.if_('monstername sausage goblin', Macro.step(...steps).spellKill());
  }

  static kramco(...step: Macro[]) {
    return new Macro().kramco(...step);
  }
}

export const MODE_NULL = '';
export const MODE_MACRO = 'macro';
export const MODE_FIND_MONSTER_THEN = 'findthen';
export const MODE_RUN_UNLESS_FREE = 'rununlessfree';
type CombatMode = '' | 'macro' | 'findthen' | 'rununlessfree';

export function setMode(mode: CombatMode, arg1: string | null = null, arg2: string | null = null) {
  setProperty('minehobo_combatMode', mode);
  if (arg1 !== null) setProperty('minehobo_combatArg1', arg1);
  if (arg2 !== null) setProperty('minehobo_combatArg2', arg2);
}

export function getMode() {
  return getProperty('minehobo_combatMode');
}

function trackPranker(page: string) {
  let prankerMatch = xpath(page, '//span[@id="monname"]/text()');
  if (prankerMatch.length > 0) {
    let prankers = property
      .getString('_timePranks')
      .split(',')
      .filter(s => s.length > 0)
      .concat(prankerMatch);
    set('_timePranks', prankers.join(','));
  } else {
    print('Unable to track time pranker!');
  }
}

export function main(initialRound: number, foe: Monster, page: string) {
  if (foe === Monster.get('time-spinner prank')) {
    trackPranker(page);
  }
  const mode = getMode();
  if (mode === MODE_MACRO) {
    Macro.load().submit();
  } else {
    throw 'Unrecognized mode.';
  }
}

export function withMacro<T>(macro: Macro, action: () => T) {
  try {
    macro.save();
    setMode(MODE_MACRO);
    return action();
  } finally {
    multiFight();
    Macro.clearSaved();
  }
}
export function adventureMacro(loc: Location, macro: Macro) {
  withMacro(macro, () => adv1(loc, -1, ''));
}
