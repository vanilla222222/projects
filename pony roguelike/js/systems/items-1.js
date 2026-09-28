'use strict';

'use strict';

function recalcPlayerStats(player){
  const p = player.passives;
  const sc = statConvBonus(player);
  const t = player.trinketId;
  const crown = p.championscrown || 0;

  const ecosystemSetActive = applySynergyComboFlag(player, 'ecosystemSet');

  if (ecosystemSetActive && !player._ecosystemSetSeen) {
    player._ecosystemSetSeen = true;
    bumpStat('ecosystemSetActivations', 1);
  }

  applySynergyComboFlag(player, 'packBond');
  applySynergyComboFlag(player, 'twinFangs');

  player.luck = player.luckyPennies + 3 * (p.luckyclover || 0) + 1 * (p.luckup || 0) + 2 * crown + 2 * (p.gamblerscoin || 0)
    + (t === 'nbtr_witchhazel' ? 1 : 0)
    + 1 * (p.trophy_mbhollowsentinel || 0)
    + (t === 'glimmeringtally' ? 1 : 0)

    + 1 * (p.sk8i_luckbead || 0) + 3 * (p.sk8i_grandluck || 0)

    + (t === 'astrallodestone' ? 2 : 0) + (t === 'cometgrit' ? 1 : 0) + (t === 'quasarpip' ? 2 : 0)
    + (t === 'zenithchit' ? 1 : 0) + (t === 'starchartscrap' ? 1 : 0)
    + 1 * (p.cometdustpouch || 0)
    + 1 * (p.fourleafclover || 0) + sc.luck
    + 2 * (p.puritycharm || 0) + 1 * (p.ascendantcharm || 0) - 1 * (p.hollowsoul || 0) + 1 * (p.cursedhalo || 0)
     + 1 * (p.blessedwanderer || 0) + 1 * (p.chainreaction || 0)
    + (t === 'luckypaw' ? 2 : 0) + (t === 'luckyhorseshoe' ? 1 : 0) - (t === 'cursedcoin' ? 1 : 0) - (t === 'gildedcharm' ? 1 : 0)

    + (t === 'sk8t_fourleafpin' ? 2 : 0) + (t === 'sk8t_witchhazelcharm' ? 1 : 0) - (t === 'sk8t_leadenlocket' ? 1 : 0)

    + 2 * (p.hiddenpassagecharm || 0) + 1 * (p.cartographerseye || 0) + 2 * (p.hoardersblessing || 0)
    + 1 * (p.vipmembershipcard || 0) + 1 * (p.dragonshoardshard || 0) + 2 * (p.goldenskeletonkey || 0)
    + 2 * (p.midasfingertip || 0) + 1 * (p.collectorssatchel || 0) + 2 * (p.curatorspendant || 0)
    + 1 * (p.charmbracelet || 0) + 1 * (p.menageriekeeperscloak || 0) + 1 * (p.apothecaryssatchel || 0)
    + 2 * (p.alchemistsformula || 0)  + 2 * (p.beastfriendsbond || 0)
    + 2 * (p.radianthalofragment || 0) + 2 * (p.gildedcompass || 0) + 1 * (p.moonkissedpelt || 0)
    + 1 * (p.feralfragment || 0) + 2 * (p.frostedbell || 0) + 1 * (p.roaringbrooch || 0)
    + 2 * (p.runicgauntlet || 0) + 2 * (p.shadowring || 0) + 1 * (p.onyxwisp || 0)
    + 1 * (p.lunarshard || 0) + (t === 'solarorb' ? 2 : 0) + (t === 'runicchain' ? 1 : 0)
    + (t === 'wildcrown' ? 2 : 0)
    + (t === 'fourleafbadge' ? 2 : 0) + (t === 'starlitpendant' ? 1 : 0)

    + (t === 'starweaveband' ? 2 : 0) + (t === 'gleamingacorn' ? 1 : 0) + (t === 'wishboneshard' ? 2 : 0)
    + (t === 'cloverpin' ? 1 : 0) + (t === 'fortunesthimble' ? 1 : 0) + (t === 'magpiefeather' ? 2 : 0)

    + 1 * (p.masterytrophy_meleekills_t1 || 0) + 1 * (p.masterytrophy_turretsdestroyed_t2 || 0) + 1 * (p.explorationtrophy_rock || 0)

    + (t === 'fortunebead' ? 2 : 0) + (t === 'charmedpebble' ? 1 : 0) + (t === 'trefoiltoken' ? 2 : 0)
    - (t === 'grindstonechip' ? 1 : 0)

    + (t === 'stormdrainpenny' ? 2 : 0) + (t === 'mossagate' ? 1 : 0) + (t === 'canopycharm' ? 2 : 0)
    + (t === 'gutterdice' ? 1 : 0)

    + (t === 'fourleafpip' ? 1 : 0) + (t === 'fourleafdram' ? 1 : 0) + (t === 'auspiciouschit' ? 2 : 0)
    + (t === 'serendipitysprig' ? 2 : 0) + (t === 'auspiciousknot' ? 1 : 0) + (t === 'breezyknot' ? 1 : 0)
    + (t === 'glidingtrefoil' ? 1 : 0) + (t === 'auspiciousspyring' ? 1 : 0) + (t === 'acridtrefoil' ? 1 : 0)
    + (t === 'serendipitysole' ? 1 : 0) + (t === 'fortunatepawl' ? 2 : 0) + (t === 'whisperingfleck' ? 1 : 0)
    + (t === 'overlooktoken' ? 1 : 0) + (t === 'viciouschit' ? 1 : 0) + (t === 'fourleafstone' ? 1 : 0)
    + (t === 'bulwarkknot' ? 1 : 0) + (t === 'bilioustoken' ? 1 : 0) + (t === 'gleamingknuckle' ? 1 : 0)
    + (t === 'bracedwishbone' ? 1 : 0) + (t === 'dulldram' ? 1 : 0)

    + 1 * (p.fortunaterelic || 0) + 1 * (p.ashencloak || 0)
    + 1 * (p.sunkenreliquary || 0) + 1 * (p.hallowedgauntlet || 0) + 1 * (p.fortunateamulet || 0)
    + 1 * (p.fourleafrelic || 0) + 1 * (p.wishinglocket || 0)

    + 2 * (p.quarrysigil || 0) + 1 * (p.bloomrot || 0) + 1 * (p.stormcaller || 0) + 2 * (p.celestialfall || 0)
    + 2 * (p.packwhistle || 0) + 1 * (p.quarryhoundtag || 0)
    + (t === 'slatependant' ? 2 : 0) + (t === 'hollowstonecoin' ? 1 : 0) + (t === 'crumblingsigil' ? 1 : 0)

    + 1 * (p.shrinecandle || 0) + 2 * (p.eternaldevotion || 0)

    + 1 * (p.sparkfuse || 0) + 1 * (p.skeletonkeyring || 0) + 2 * (p.luckytoken || 0)
    + 1 * (p.jackpotcharm || 0) + 2 * (p.arcadecrown || 0)

      + 1 * (p.hcfwtrophy_challenge_hc_floor_nodamage || 0)
    + 1 * (p.hcfwtrophy_challenge_fw_speedkill || 0) + 1 * (p.hcfwtrophy_exploration_meet_flatlinewraith || 0) + 1 * (p.hcfwtrophy_exploration_meet_flatlineburrower || 0)
    + 1 * (p.hcfwtrophy_collection_hc_roster_t1 || 0)

    + 1 * (p.mgtrophy_exploration_floor11c || 0) + 1 * (p.mgtrophy_meet_saltheron || 0) + 1 * (p.mgtrophy_meet_crabmortar || 0)
    + 1 * (p.mgtrophy_meet_mudlobster || 0) + 1 * (p.mgtrophy_collection_roster_t1 || 0)

    + 1 * (p.obstrophy_exploration_floor4d || 0) + 1 * (p.obstrophy_meet_starshard || 0) + 1 * (p.obstrophy_meet_gravitymortar || 0)
    + 1 * (p.obstrophy_meet_brassaegis || 0) + 1 * (p.obstrophy_meet_astrariumwatcher || 0)

    + 1 * (p.ortrophy_exploration_floor6d || 0) + 1 * (p.ortrophy_meet_sparkcog || 0) + 1 * (p.ortrophy_meet_gearslinger || 0)
    + 1 * (p.ortrophy_meet_ironplate || 0) + 1 * (p.ortrophy_meet_heavygyro || 0)

      + 1 * (p.vbtrophy_meet_wreckspark || 0)
    + 1 * (p.vbtrophy_meet_voidslinger || 0) + 1 * (p.vbtrophy_collection_t2 || 0)

    + 1 * (p.vbtrophy2_exploration_floor9d || 0) + 1 * (p.vbtrophy2_meet_fadingnova || 0) + 1 * (p.vbtrophy2_meet_witherslinger || 0)
    + 1 * (p.vbtrophy2_meet_horizonplate || 0) + 1 * (p.vbtrophy2_meet_gravmortar || 0)

    - 1 * (p.blessedhalo || 0) - 1 * (p.forsakensignet || 0) - 1 * (p.crackedpendant || 0)

    + (t === 'giggleribbontag' ? 2 : 0) + (t === 'glowmotefeather' ? 2 : 0) + (t === 'hivemothercrown' ? 2 : 0)
    + (t === 'socketwrench' ? 2 : 0) + (t === 'hivequeenrelic' ? 1 : 0) + (t === 'crumblingember' ? 1 : 0)
    + (t === 'glowingcoalcharm' ? 1 : 0) + (t === 'juicejuicebox' ? 1 : 0) + (t === 'socketcharm' ? 1 : 0)

    + 1 * (p.mb_luckcharm || 0) + 2 * (p.mb_giltbean || 0)
    + 1 * (p.mb_clovercharm || 0) + 1 * (p.mb_luckypebble || 0)
    + (t === 'mbtr_dustyhorseshoe' ? 1 : 0) + (t === 'mbtr_batteredlocket' ? 1 : 0)
    + player.pillLuckBonus;
  const luckBonus = player.luck * 0.006;

  player.speed = player.baseSpeed * Util.clamp(1 + 0.15 * (p.downyfeather || 0) + 0.15 * (p.speedup || 0) + 0.10 * crown
    + (t === 'nbtr_hollowreed' ? 0.08 : 0) - (t === 'nbtr_frayedcord' ? 0.05 : 0)
    + (t === 'windsworntassel' ? 0.06 : 0) + (t === 'blastrunnerscoil' ? 0.05 : 0)
    + 0.15 * (p.sk8i_windlace || 0)

    + (t === 'orbitalspur' ? 0.1 : 0) + (t === 'driftsole' ? 0.08 : 0) + (t === 'lightsailscrap' ? 0.1 : 0)
    + (t === 'escapevelocitypin' ? 0.08 : 0) + (t === 'meteorheel' ? 0.08 : 0)
    + 0.08 * (p.freefallcloak || 0)
    + 0.08 * (p.driftboots || 0)
     + 0.08 * (p.nimblegait || 0) - 0.08 * (p.gildedhoof || 0)  - 0.10 * (p.witchbrew || 0)
    + 0.10 * (p.blessedhoof || 0) + 0.10 * (p.gildedwing || 0) - 0.08 * (p.demonhoof || 0) + 0.10 * (p.shadowstep || 0)
     + 0.05 * (p.undefeatedchampion || 0) + 0.10 * (p.pestcontrol || 0)
    + (t === 'mothwing' ? 0.12 : 0) - (t === 'rustybolt' ? 0.08 : 0) - (t === 'stackedcoin' ? 0.05 : 0)

    + (t === 'sk8t_windveil' ? 0.09 : 0) + (t === 'sk8t_leadenlocket' ? 0.14 : 0)
    - (t === 'sk8t_ironclasp' ? 0.10 : 0) - (t === 'sk8t_boggedgear' ? 0.05 : 0)
    - (t === 'sk8t_witchhazelcharm' ? 0.08 : 0) - (t === 'sk8t_twinnotch' ? 0.08 : 0)

    + 0.08 * (p.beastmasterswhistle || 0) + 0.12 * (p.menageriekeeperscloak || 0) + 0.1 * (p.championssash || 0)
    + 0.1 * (p.explorersboots || 0) + 0.15 * (p.wanderersendurance || 0) + 0.1 * (p.ironhoofgauntlet || 0)
     + 0.12 * (p.beastfriendsbond || 0) + 0.05 * (p.gauntletveteransmedal || 0)
    + 0.1 * (p.arenachampionsbelt || 0) + 0.1 * (p.swarmrepellent || 0) + 0.15 * (p.insecticidevial || 0)
    + 0.12 * (p.windsweptcloak || 0)

    + 0.15 * (p.gustwovenveil || 0) + (t === 'zephyrcharm' ? 0.10 : 0) - (t === 'scaledtalisman' ? 0.10 : 0)
    + 0.12 * (p.amberfragment || 0) + 0.08 * (p.sapphiretoken || 0) + 0.1 * (p.thunderfragment || 0)
    + 0.1 * (p.goldengauntlet || 0)
    + 0.08 * (p.velvetmedallion || 0) + 0.06 * (p.feralquill || 0) + 0.1 * (p.hollowwhistle || 0)
    + (t === 'astralquill' ? 0.1 : 0) + (t === 'tangledscroll' ? 0.1 : 0) + (t === 'coraltalisman' ? 0.1 : 0)
    + (t === 'windlacedcharm' ? 0.10 : 0) + (t === 'hurriedhoof' ? 0.08 : 0) + (t === 'restlessspur' ? 0.09 : 0)

    + (t === 'swiftbriar' ? 0.08 : 0) + (t === 'quicksilverspur' ? 0.10 : 0) + (t === 'breezyribbon' ? 0.07 : 0)
    + (t === 'fleetfootcharm' ? 0.09 : 0) + (t === 'galepin' ? 0.06 : 0) + (t === 'lightstepbead' ? 0.08 : 0)

    + 0.05 * (p.masterytrophy_meleekills_t2 || 0) + 0.05 * (p.masterytrophy_bombbarrels_t1 || 0) + 0.05 * (p.explorationtrophy_tallrock || 0)

    + (t === 'tailwindcharm' ? 0.10 : 0) + (t === 'lightfoottoken' ? 0.07 : 0) + (t === 'swiftmark' ? 0.09 : 0)
    - (t === 'ironpin' ? 0.08 : 0)

    + (t === 'slicksole' ? 0.12 : 0) + (t === 'runoffcurrent' ? 0.10 : 0) + (t === 'vinerunnersband' ? 0.14 : 0)
    + (t === 'wadingboot' ? 0.08 : 0)

    + (t === 'nimbleribbon' ? 0.1 : 0) + (t === 'dartingribbon' ? 0.1 : 0) + (t === 'fleetquill' ? 0.1 : 0)
    + (t === 'swiftlace' ? 0.1 : 0) + (t === 'skimmingwisp' ? 0.1 : 0) + (t === 'breezyknot' ? 0.14 : 0)
    + (t === 'glidingtrefoil' ? 0.08 : 0) + (t === 'serendipitysole' ? 0.06 : 0) + (t === 'crimsonribbon' ? 0.06 : 0)
    + (t === 'wardinganklet' ? 0.08 : 0) + (t === 'glidingclapper' ? 0.08 : 0) + (t === 'rapidwisp' ? 0.1 : 0)
    + (t === 'concussivelace' ? 0.1 : 0) + (t === 'longplume' ? 0.1 : 0) + (t === 'airylocket' ? 0.06 : 0)
    + (t === 'lightlattice' ? 0.08 : 0) + (t === 'reaperanklet' ? 0.08 : 0) + (t === 'clangingquill' ? 0.08 : 0)
    + (t === 'jarringlace' ? 0.08 : 0) + (t === 'adoringwisp' ? 0.08 : 0) + (t === 'frostbitplume' ? 0.06 : 0)
    + (t === 'giantanklet' ? 0.06 : 0) + (t === 'skimmingrift' ? 0.08 : 0) + (t === 'drainingquill' ? 0.08 : 0)

    + 0.08 * (p.splittingrelic || 0)
    + 0.08 * (p.runiccloak || 0) + 0.1 * (p.ancienttalisman || 0) + 0.1 * (p.deepgauntlet || 0)
    + 0.15 * (p.lopingreliquary || 0)
    + (t === 'stonewingcharm' ? 0.08 : 0) - (t === 'weatheredtalon' ? 0.06 : 0)
    + 0.05 * (p.pilgrimssandals || 0)
    + 0.05 * (p.brasslockpick || 0)

      + 0.05 * (p.hcfwtrophy_challenge_fw_floor_nodamage || 0)
    + 0.05 * (p.hcfwtrophy_exploration_floor13 || 0) + 0.05 * (p.hcfwtrophy_exploration_meet_zeroamplitude || 0) + 0.05 * (p.hcfwtrophy_exploration_meet_silencestalker || 0)
    + 0.05 * (p.hcfwtrophy_collection_fw_roster_t1 || 0)

    + 0.05 * (p.mgtrophy_challenge_floor_nodamage || 0) + 0.05 * (p.mgtrophy_exploration_meet_mangrove || 0) + 0.05 * (p.mgtrophy_meet_tidebloat || 0)
    + 0.05 * (p.mgtrophy_meet_mireloper || 0) + 0.05 * (p.mgtrophy_meet_shellbulk || 0) + 0.05 * (p.mgtrophy_collection_roster_t2 || 0)

    + 0.05 * (p.obstrophy_exploration_floor5d || 0) + 0.05 * (p.obstrophy_meet_brassbulwark || 0) + 0.05 * (p.obstrophy_meet_domewatcher || 0)
    + 0.05 * (p.obstrophy_meet_meteortusk || 0) + 0.05 * (p.obstrophy_collection_4d_t1 || 0)

    + 0.05 * (p.ortrophy_exploration_floor7d || 0) + 0.05 * (p.ortrophy_meet_brassplate || 0) + 0.05 * (p.ortrophy_meet_gyromortar || 0)
    + 0.05 * (p.ortrophy_meet_zenithram || 0) + 0.05 * (p.ortrophy_collection_6d_t1 || 0)

     + 0.05 * (p.vbtrophy_challenge_nodamage || 0) + 0.05 * (p.vbtrophy_meet_hullplate || 0)
    + 0.05 * (p.vbtrophy_meet_wreckmortar || 0)

    + 0.05 * (p.vbtrophy2_exploration_floor10d || 0) + 0.05 * (p.vbtrophy2_meet_darkplate || 0) + 0.05 * (p.vbtrophy2_meet_nullmortar || 0)
    + 0.05 * (p.vbtrophy2_meet_gravram || 0) + 0.05 * (p.vbtrophy2_collection_9d_t1 || 0)
    + (t === 'rootboundtalon' ? 0.05 : 0)
    + (t === 'splitscarcasing' ? 0.05 : 0)

    - 0.06 * (p.beckoningvestment || 0) - 0.06 * (p.feintingsigil || 0) - 0.05 * (p.haleribcage || 0)
    - 0.05 * (p.mastervaultkey || 0) - 0.08 * (p.sleetedcirclet || 0)

    - 0.10 * (p.brimstonevial || 0)
    - (player.activeItem && player.activeItem.id === 'thundercloud' ? 0.10 : 0)

    + (t === 'emberringcharm' ? 0.08 : 0) + (t === 'ribboncharm' ? 0.08 : 0) - (t === 'witherember' ? 0.06 : 0)
    + (t === 'spannerpin' ? 0.08 : 0) + (t === 'broodwingveil' ? 0.08 : 0) - (t === 'playfulpouncecharm' ? 0.06 : 0)
    - (t === 'scrapmetalvest' ? 0.06 : 0)

    + 0.10 * (p.mb_lightfoot || 0) + 0.05 * (p.mb_stormfeather || 0)
    + 0.08 * (p.mb_gustcloak || 0) + 0.07 * (p.mb_brisklegs || 0)
    - 0.08 * (p.mb_thunderclap || 0)
    - 0.06 * (p.mb_bulwarkplate || 0) - 0.06 * (p.mb_leadenboots || 0)
    + (t === 'mbtr_windedhorn' ? 0.07 : 0) - (t === 'mbtr_moltencuff' ? 0.06 : 0)
    + player.pillSpeedBonus
    + comboBonus(player, 'packBond', 'speedMult'), 0.25, 2.2);

  const flatSpeedBonus = 20*(p.blastcharm||0) + 20*(p.directhit||0) + 20*(p.venomfang||0) + 20*(p.directcharm||0) + 20*(p.directfear||0) + 20*(p.directstun||0) + 20*(p.hawkfeather||0) + 20*(p.stonehide||0) + 20*(p.loyaltybadge||0) + 20*(p.temperedsteel||0) + 20*sc.speed;
  player.speed = Math.min(player.speed + flatSpeedBonus, 700);
  player.meleeDamage = Math.max(0.5, player.baseMeleeDamage + (p.ironshoes || 0) + 1 * (p.damageup || 0) + crown
    + (t === 'nbtr_frayedcord' ? 0.6 : 0)

    + 0.8 * (p.trophy_charnelwarden || 0) + 0.6 * (p.trophy_mawsentinel || 0)

    + (t === 'detonationspike' ? 0.4 : 0) + (t === 'gravehuntersign' ? 0.5 : 0)
    + 2 * (p.warhorn || 0)

    + 1 * (p.sk8i_glassmarble || 0) + 1 * (p.sk8i_stormtusk || 0) + 1 * (p.sk8i_shatterfang || 0)
    + 1 * (p.sk8i_echobell || 0) + 1 * (p.sk8i_fragmentshard || 0)
    + 1 * (p.sk11i_hoofbrand || 0)

    + (t === 'collapsarcore' ? 2 : 0) + (t === 'starironshard' ? 1 : 0) + (t === 'novasplinter' ? 2 : 0)
    + (t === 'gravitywell' ? 1 : 0) + (t === 'solarflarechip' ? 1 : 0) + 2 * (p.singularityfragment || 0)
    + 1 * (p.starforgedhoofguard || 0) + 2 * (p.novaanvil || 0) + 1 * (p.coronalance || 0)
    + 1 * (p.protostarember || 0) + 1 * (p.meteoriteedge || 0)
    + (p.dragonfirecore || 0) + (t === 'scaledtalisman' ? 1 : 0)
    + 1 * (p.ironwill || 0) + 1 * (p.gildedhoof || 0) + 2 * (p.witheredapple || 0) - 1 * (p.spiderring || 0)
    + 1 * (p.sacredlight || 0) + 1 * (p.haloedcrown || 0) + 1 * (p.blackheart || 0) + 1 * (p.demonhoof || 0)
    + 2 * (p.hollowsoul || 0) + 1 * (p.cinderclaw || 0) + 2 * (p.wrathfulhorn || 0) + 1 * (p.cursedhalo || 0)
    + 1 * (p.cursedwanderer || 0) + 1 * (p.undefeatedchampion || 0) + 1 * (p.chosenofthelight || 0) + 2 * (p.soulseller || 0)
    + 1 * (p.swarmbreaker || 0) + 1 * (p.turretbuster || 0) + sc.damage + 2 * (p.siegebreaker || 0) + 1 * (p.chainreaction || 0)
    + (t === 'rustybolt' ? 1 : 0) + (t === 'gildedcharm' ? 1 : 0)

    + (t === 'sk8t_ironclasp' ? 1 : 0) - (t === 'sk8t_glasscannon' ? 1 : 0)

    + 1 * (p.chestwhisperer || 0) + 1 * (p.hoardersblessing || 0) + 1 * (p.rubblerunner || 0)
    + 1 * (p.blacklockboxkey || 0) + 2 * (p.devilsbargainring || 0) + 1 * (p.slayerssigil || 0)
    + 2 * (p.executionersmark || 0) + 1 * (p.midasfingertip || 0) + 1 * (p.graniteknuckles || 0)
    + 1 * (p.rubblekingscrown || 0) + 2 * (p.worldbreakergauntlet || 0) + 1 * (p.curatorspendant || 0)
    + 1 * (p.championssash || 0) + 1 * (p.overchargedbattery || 0) + 2 * (p.voltaiccore || 0)
    + 1 * (p.bruiserswraps || 0) + 2 * (p.ironhoofgauntlet || 0) + 1 * (p.hexbreakertalisman || 0)
    + 2 * (p.doomwalkerscloak || 0) + 1 * (p.gauntletveteransmedal || 0) + 2 * (p.arenachampionsbelt || 0)
    + 2 * (p.sombrasownseal || 0) + 1 * (p.insecticidevial || 0) + 2 * (p.sentrywreckersfist || 0)
    + 1 * (p.blastresistantvest || 0) + 2 * (p.detonationspecialistbadge || 0) + 1 * (p.embercharm || 0)
    + 1 * (p.goldencoin || 0) + 1 * (p.emeraldquill || 0) + 1 * (p.hollowtoken || 0)
    + 1 * (p.runicbauble || 0) + 1 * (p.goldenbrooch || 0) + 1 * (p.gildedtrinket || 0)
    + 1 * (p.polishedscroll || 0) + 1 * (p.palebrooch || 0) + 1 * (p.stormlocket || 0)
    + (t === 'wanderingtrinket' ? 1 : 0) + (t === 'stormprism' ? 1 : 0) + (t === 'crackedlocket' ? 1 : 0)
    + (t === 'cinderbrand' ? 1 : 0) + (t === 'stonefist' ? 1 : 0) + (t === 'jaggedtooth' ? 1 : 0)

    + (t === 'heavypommel' ? 1 : 0) + (t === 'chippedfang' ? 1 : 0) + (t === 'warscarredtoken' ? 1 : 0)
    + (t === 'boneknuckle' ? 1 : 0) + (t === 'sharpenedshard' ? 1 : 0) + (t === 'grudgestone' ? 1 : 0)

    + 1 * (p.masterytrophy_rangedkills_t1 || 0) + 1 * (p.masterytrophy_bombbarrels_t2 || 0) + 1 * (p.explorationtrophy_yellowfire || 0)

    + (t === 'ironpin' ? 1 : 0) + (t === 'grindstonechip' ? 1 : 0) + (t === 'battlefang' ? 1 : 0)

    + (t === 'rebarshank' ? 2 : 0) + (t === 'drainpipeclub' ? 1 : 0) + (t === 'machetetooth' ? 2 : 0)
    + (t === 'subwoofermagnet' ? 1 : 0) + (t === 'carnivalhorn' ? 1 : 0)

    + (t === 'heavywedge' ? 1 : 0) + (t === 'irontooth' ? 1 : 0) + (t === 'roughspur' ? 1 : 0)
    + (t === 'brutalrivet' ? 2 : 0) + (t === 'brutalcleat' ? 1 : 0) + (t === 'focusedwedge' ? 1 : 0)
    + (t === 'ogrehasp' ? 1 : 0) + (t === 'septicspur' ? 1 : 0) + (t === 'dotingrivet' ? 1 : 0)
    + (t === 'reapertooth' ? 1 : 0) + (t === 'whirringcleat' ? 1 : 0) + (t === 'gleamingknuckle' ? 1 : 0)
    + (t === 'mourningfang' ? 1 : 0)

    + 1 * (p.heavyamulet || 0) + 1 * (p.bluntsignet || 0) + 1 * (p.chippedamulet || 0)
    + 1 * (p.sunkentalisman || 0) + 1 * (p.ashenrune || 0) + 1 * (p.ogrelocket || 0)

    - 1 * (p.masterytrophy_rangedkills_t2 || 0)
    + player.pillDamageBonus + player.starDamageBonus
    + 1 * (p.fangguard || 0)
    + 1 * (p.meteorcrest || 0)
    + 1 * (p.votivecoin || 0)

    + 1 * (p.blastmaster || 0) + 1 * (p.mastervaultkey || 0) + 1 * (p.arcadecrown || 0)
    + (t === 'graniteperch' ? 2 : 0) + (t === 'weatheredtalon' ? 1 : 0) + (t === 'crumblingsigil' ? 1 : 0)

      + 1 * (p.hcfwtrophy_challenge_hc_onehearted || 0)
    + 1 * (p.hcfwtrophy_exploration_floor14 || 0) + 1 * (p.hcfwtrophy_exploration_meet_wobbler || 0) + 1 * (p.hcfwtrophy_exploration_meet_decrescendosplitter || 0)
    + 1 * (p.hcfwtrophy_collection_mainroute_sb || 0)

    + 1 * (p.mgtrophy_challenge_onehearted || 0) + 1 * (p.mgtrophy_meet_mudtuskram || 0) + 1 * (p.mgtrophy_meet_saltspitter || 0)
    + 1 * (p.mgtrophy_collection_originals || 0)
    + 1 * (p.barnaclecrown || 0) + 1 * (p.viperscoil || 0) + 1 * (p.tidalclock || 0) + 1 * (p.mangrovecanopyheart || 0)
    + (t === 'stillbrackwater' ? 1 : 0)
    + 1 * (p.lastchord || 0) + 1 * (p.zeroline || 0) + 1 * (p.metronomecharm || 0) + 1 * (p.cadencewatch || 0)
    + (t === 'splitscarcasing' ? 1 : 0) + (t === 'stilledchord' ? 1 : 0)

      + 1 * (p.obstrophy_challenge_floor_nodamage || 0)
    + 1 * (p.obstrophy_exploration_meet_astrolabe || 0) + 1 * (p.obstrophy_meet_comettusk || 0) + 1 * (p.obstrophy_meet_astrolabestalker || 0)
    + 1 * (p.obstrophy_meet_opticturret || 0) + 1 * (p.obstrophy_collection_4d_t2 || 0)

    + 1 * (p.starchartrelic || 0) + 1 * (p.stardriftanchor || 0) + 1 * (p.nebulacoreshard || 0) + 1 * (p.voidriftanchor || 0)
    + 1 * (p.brasschronometer || 0) + 1 * (p.astrolabechronometer || 0) + 1 * (p.lensarrayheart || 0) + 1 * (p.astrolabecoreheart || 0)
    + (t === 'stillorbit' ? 1 : 0)

      + 1 * (p.ortrophy_challenge_floor_nodamage || 0)
    + 1 * (p.ortrophy_exploration_meet_orrery || 0) + 1 * (p.ortrophy_meet_ringrammer || 0) + 1 * (p.ortrophy_meet_zenithhound || 0)
    + 1 * (p.ortrophy_meet_apexturret || 0) + 1 * (p.ortrophy_collection_6d_t2 || 0)

    + 1 * (p.gearclutchcore || 0) + 1 * (p.gearblinkanchor || 0) + 1 * (p.ringblinkanchor || 0)
    + 1 * (p.brassringchronometer || 0) + 1 * (p.apexchronometer || 0) + 0.5 * (p.gearworkheart || 0) + 1 * (p.orreryheart || 0)
    + (t === 'stillmechanism' ? 1 : 0)

     + 1 * (p.vbtrophy_exploration_floor8d || 0) + 1 * (p.vbtrophy_meet_driftram || 0)
    + 1 * (p.vbtrophy_meet_stardrift || 0)

    + 1 * (p.hullshardcore || 0) + 1 * (p.hullblinkanchor || 0) + 1 * (p.voidchronometer || 0) + 1 * (p.voidbetweenheart || 0)

      + 1 * (p.vbtrophy2_challenge_floor_nodamage || 0)
    + 1 * (p.vbtrophy2_exploration_meet_singularity || 0) + 1 * (p.vbtrophy2_meet_nullram || 0) + 1 * (p.vbtrophy2_meet_collapsehound || 0)
    + 1 * (p.vbtrophy2_meet_collapseturret || 0) + 1 * (p.vbtrophy2_collection_9d_t2 || 0)

    + 1 * (p.emberhuskcore || 0) + 1 * (p.nullblinkanchor || 0) + 1 * (p.horizonhuskcore || 0)
    + 1 * (p.eventblinkanchor || 0) + 1 * (p.emberchronometer || 0) + 1 * (p.eventchronometer || 0)
    + 1 * (p.lastlightheart || 0) + 1 * (p.eventhorizonheart || 0)
    + (t === 'collapsedmoment' ? 1 : 0)

    - 0.5 * (p.emberwick || 0) - 0.5 * (p.lopingreliquary || 0)

    - 1 * (p.secondwind || 0)

    + (t === 'cinderwisp' ? 2 : 0) + (t === 'plushpony' ? 2 : 0) + (t === 'witherember' ? 1 : 0)
    + (t === 'waxcombshard' ? 2 : 0) + (t === 'rivetplating' ? 2 : 0) + (t === 'playfulpouncecharm' ? 1 : 0)
    + (t === 'crumblingember' ? 1 : 0) + (t === 'scrapmetalvest' ? 1 : 0) + (t === 'hivequeenrelic' ? 1 : 0)
    + comboBonus(player, 'ecosystemSet', 'meleeDamage')

    + 1 * (p.mb_leadenboots || 0)
    + 0.5 * (p.mb_earthenband || 0) + 1 * (p.mb_cinderheart || 0)
    - 0.3 * (p.mb_glassheart || 0)
    - 1 * (p.mb_evasivecharm || 0) - 1 * (p.mb_reservestrength || 0)
    + (t === 'mbtr_moltencuff' ? 1 : 0) + (t === 'mbtr_pawedgrip' ? 0.6 : 0)
    + comboBonus(player, 'packBond', 'meleeDamage'));
  player.rangedDamage = Math.max(0.5, player.baseRangedDamage + (p.ironshoes || 0) + 1 * (p.damageup || 0) + crown
    - 0.4 * (p.nbat_cinderpayload || 0)

    + 0.6 * (p.trophy_thornmother || 0) + 0.6 * (p.trophy_lastdiver || 0)

    + (t === 'farshotquill' ? 0.5 : 0)
    + 2 * (p.warhorn || 0)

    + 1 * (p.sk8i_glassmarble || 0) + 1 * (p.sk8i_stormtusk || 0) + 1 * (p.sk8i_shatterfang || 0)
    + 1 * (p.sk8i_echobell || 0) + 1 * (p.sk8i_fragmentshard || 0)
    + 1 * (p.sk11i_hoofbrand || 0)

    + (t === 'collapsarcore' ? 2 : 0) + (t === 'starironshard' ? 1 : 0) + (t === 'novasplinter' ? 2 : 0)
    + (t === 'gravitywell' ? 1 : 0) + (t === 'solarflarechip' ? 1 : 0) + 2 * (p.singularityfragment || 0)
    + 1 * (p.starforgedhoofguard || 0) + 2 * (p.novaanvil || 0) + 1 * (p.coronalance || 0)
    + 1 * (p.protostarember || 0) + 1 * (p.meteoriteedge || 0)
    + (p.dragonfirecore || 0) + (t === 'scaledtalisman' ? 1 : 0)
    + 1 * (p.ironwill || 0) + 1 * (p.gildedhoof || 0) + 2 * (p.witheredapple || 0) - 1 * (p.spiderring || 0)
    + 1 * (p.sacredlight || 0) + 1 * (p.haloedcrown || 0) + 1 * (p.blackheart || 0) + 1 * (p.demonhoof || 0)
    + 2 * (p.hollowsoul || 0) + 1 * (p.cinderclaw || 0) + 2 * (p.wrathfulhorn || 0) + 1 * (p.cursedhalo || 0)
    + 1 * (p.cursedwanderer || 0) + 1 * (p.undefeatedchampion || 0) + 1 * (p.chosenofthelight || 0) + 2 * (p.soulseller || 0)
    + 1 * (p.swarmbreaker || 0) + 1 * (p.turretbuster || 0) + sc.damage + 2 * (p.siegebreaker || 0) + 1 * (p.chainreaction || 0)
    + (t === 'rustybolt' ? 1 : 0) + (t === 'gildedcharm' ? 1 : 0)

    + (t === 'sk8t_ironclasp' ? 1 : 0) - (t === 'sk8t_glasscannon' ? 1 : 0)

    + 1 * (p.chestwhisperer || 0) + 1 * (p.hoardersblessing || 0) + 1 * (p.rubblerunner || 0)
    + 1 * (p.blacklockboxkey || 0) + 2 * (p.devilsbargainring || 0) + 1 * (p.slayerssigil || 0)
    + 2 * (p.executionersmark || 0) + 1 * (p.midasfingertip || 0) + 1 * (p.graniteknuckles || 0)
    + 1 * (p.rubblekingscrown || 0) + 2 * (p.worldbreakergauntlet || 0) + 1 * (p.curatorspendant || 0)
    + 1 * (p.championssash || 0) + 1 * (p.overchargedbattery || 0) + 2 * (p.voltaiccore || 0)
    + 1 * (p.bruiserswraps || 0) + 2 * (p.ironhoofgauntlet || 0) + 1 * (p.hexbreakertalisman || 0)
    + 2 * (p.doomwalkerscloak || 0) + 1 * (p.gauntletveteransmedal || 0) + 2 * (p.arenachampionsbelt || 0)

    + 2 * (p.sombrasownseal || 0) + 1 * (p.insecticidevial || 0) + 2 * (p.sentrywreckersfist || 0)
    + 1 * (p.blastresistantvest || 0) + 2 * (p.detonationspecialistbadge || 0) + 1 * (p.embercharm || 0)
    + 1 * (p.goldencoin || 0) + 1 * (p.emeraldquill || 0) + 1 * (p.hollowtoken || 0)
    + 1 * (p.runicbauble || 0) + 1 * (p.goldenbrooch || 0) + 1 * (p.gildedtrinket || 0)
    + 1 * (p.polishedscroll || 0) + 1 * (p.palebrooch || 0) + 1 * (p.stormlocket || 0)
    + (t === 'wanderingtrinket' ? 1 : 0) + (t === 'stormprism' ? 1 : 0) + (t === 'crackedlocket' ? 1 : 0)
    + (t === 'cinderbrand' ? 1 : 0) + (t === 'stonefist' ? 1 : 0) + (t === 'jaggedtooth' ? 1 : 0)

    + (t === 'heavypommel' ? 1 : 0) + (t === 'chippedfang' ? 1 : 0) + (t === 'warscarredtoken' ? 1 : 0)
    + (t === 'boneknuckle' ? 1 : 0) + (t === 'sharpenedshard' ? 1 : 0) + (t === 'grudgestone' ? 1 : 0)

    + 1 * (p.masterytrophy_rangedkills_t1 || 0) + 1 * (p.masterytrophy_bombbarrels_t2 || 0) + 1 * (p.explorationtrophy_yellowfire || 0)

    + (t === 'ironpin' ? 1 : 0) + (t === 'grindstonechip' ? 1 : 0) + (t === 'battlefang' ? 1 : 0)

    + (t === 'rebarshank' ? 2 : 0) + (t === 'drainpipeclub' ? 1 : 0) + (t === 'machetetooth' ? 2 : 0)
    + (t === 'subwoofermagnet' ? 1 : 0) + (t === 'carnivalhorn' ? 1 : 0)

    + (t === 'heavywedge' ? 1 : 0) + (t === 'irontooth' ? 1 : 0) + (t === 'roughspur' ? 1 : 0)
    + (t === 'brutalrivet' ? 2 : 0) + (t === 'brutalcleat' ? 1 : 0) + (t === 'focusedwedge' ? 1 : 0)
    + (t === 'ogrehasp' ? 1 : 0) + (t === 'septicspur' ? 1 : 0) + (t === 'dotingrivet' ? 1 : 0)
    + (t === 'reapertooth' ? 1 : 0) + (t === 'whirringcleat' ? 1 : 0) + (t === 'gleamingknuckle' ? 1 : 0)
    + (t === 'mourningfang' ? 1 : 0)

    + 1 * (p.heavyamulet || 0) + 1 * (p.bluntsignet || 0) + 1 * (p.chippedamulet || 0)
    + 1 * (p.sunkentalisman || 0) + 1 * (p.ashenrune || 0) + 1 * (p.ogrelocket || 0)

    - 1 * (p.masterytrophy_rangedkills_t2 || 0)
    + player.pillDamageBonus + player.starDamageBonus
    + 1 * (p.quiverstring || 0)
    + 1 * (p.cometshard || 0) + 1 * (p.skyrend || 0) + 1 * (p.meteorcrest || 0)
    + 1 * (p.votivecoin || 0)

    + 1 * (p.blastmaster || 0) + 1 * (p.mastervaultkey || 0) + 1 * (p.arcadecrown || 0)
    + (t === 'graniteperch' ? 2 : 0) + (t === 'weatheredtalon' ? 1 : 0) + (t === 'crumblingsigil' ? 1 : 0)

      + 1 * (p.hcfwtrophy_challenge_fw_onehearted || 0)
    + 1 * (p.hcfwtrophy_exploration_meet_lastovertone || 0) + 1 * (p.hcfwtrophy_exploration_meet_subdrop || 0) + 1 * (p.hcfwtrophy_exploration_meet_polyrhythm || 0)

    + 1 * (p.mgtrophy_challenge_speedkill || 0) + 1 * (p.mgtrophy_meet_mudskipper || 0) + 1 * (p.mgtrophy_meet_bloatbladder || 0)
    + 1 * (p.barnaclecrown || 0) + 1 * (p.viperscoil || 0) + 1 * (p.tidalclock || 0) + 1 * (p.mangrovecanopyheart || 0)
    + (t === 'stillbrackwater' ? 1 : 0)
    + 1 * (p.lastchord || 0) + 1 * (p.zeroline || 0) + 1 * (p.metronomecharm || 0) + 1 * (p.cadencewatch || 0)
    + (t === 'splitscarcasing' ? 1 : 0) + (t === 'stilledchord' ? 1 : 0)

      + 1 * (p.obstrophy_challenge_onehearted || 0)
    + 1 * (p.obstrophy_meet_lensdrifter || 0) + 1 * (p.obstrophy_meet_spyglassturret || 0) + 1 * (p.obstrophy_meet_cometwisp || 0)
    + 1 * (p.obstrophy_meet_starhopper || 0) + 1 * (p.obstrophy_collection_5d_t1 || 0)

    + 1 * (p.starchartrelic || 0) + 1 * (p.stardriftanchor || 0) + 1 * (p.nebulacoreshard || 0) + 1 * (p.voidriftanchor || 0)
    + 1 * (p.brasschronometer || 0) + 1 * (p.astrolabechronometer || 0) + 1 * (p.lensarrayheart || 0) + 1 * (p.astrolabecoreheart || 0)
    + (t === 'stillorbit' ? 1 : 0)

      + 1 * (p.ortrophy_challenge_onehearted || 0)
    + 1 * (p.ortrophy_meet_gearhound || 0) + 1 * (p.ortrophy_meet_meridianturret || 0) + 1 * (p.ortrophy_meet_starcog || 0)
    + 1 * (p.ortrophy_meet_springcoil || 0) + 1 * (p.ortrophy_collection_7d_t1 || 0)

    + 1 * (p.gearclutchcore || 0) + 1 * (p.gearblinkanchor || 0) + 1 * (p.ringblinkanchor || 0)
    + 1 * (p.brassringchronometer || 0) + 1 * (p.apexchronometer || 0) + 0.5 * (p.gearworkheart || 0) + 1 * (p.orreryheart || 0)
    + (t === 'stillmechanism' ? 1 : 0)

     + 1 * (p.vbtrophy_meet_voidwisp || 0) + 1 * (p.vbtrophy_meet_silentturret || 0)
    + 1 * (p.vbtrophy_meet_hulkwatcher || 0)

    + 1 * (p.hullshardcore || 0) + 1 * (p.hullblinkanchor || 0) + 1 * (p.voidchronometer || 0) + 1 * (p.voidbetweenheart || 0)

      + 1 * (p.vbtrophy2_challenge_onehearted || 0)
    + 1 * (p.vbtrophy2_meet_starvedhound || 0) + 1 * (p.vbtrophy2_meet_lastlightturret || 0) + 1 * (p.vbtrophy2_meet_lastlightmoth || 0)
    + 1 * (p.vbtrophy2_meet_abyssleaper || 0) + 1 * (p.vbtrophy2_collection_10d_t1 || 0)

    + 1 * (p.emberhuskcore || 0) + 1 * (p.nullblinkanchor || 0) + 1 * (p.horizonhuskcore || 0)
    + 1 * (p.eventblinkanchor || 0) + 1 * (p.emberchronometer || 0) + 1 * (p.eventchronometer || 0)
    + 1 * (p.lastlightheart || 0) + 1 * (p.eventhorizonheart || 0)
    + (t === 'collapsedmoment' ? 1 : 0)

    - 0.5 * (p.emberwick || 0) - 0.5 * (p.lopingreliquary || 0)
    - 0.5 * (p.crackedrune || 0) - 0.5 * (p.asheneffigy || 0)

    - 1 * (p.secondwind || 0) - 0.5 * (p.multishot || 0)

    + (t === 'cinderwisp' ? 2 : 0) + (t === 'plushpony' ? 2 : 0) + (t === 'witherember' ? 1 : 0)
    + (t === 'waxcombshard' ? 2 : 0) + (t === 'rivetplating' ? 2 : 0) + (t === 'playfulpouncecharm' ? 1 : 0)
    + (t === 'crumblingember' ? 1 : 0) + (t === 'scrapmetalvest' ? 1 : 0) + (t === 'hivequeenrelic' ? 1 : 0)
    + comboBonus(player, 'ecosystemSet', 'rangedDamage')

    + 1.2 * (p.mb_heavyquiver || 0)
    + 0.8 * (p.mb_eaglequiver || 0) + 0.5 * (p.mb_sparrowquill || 0)
    + 0.4 * (p.mb_hunterspack || 0) + 0.4 * (p.mb_unicornsigil || 0) + 1 * (p.mb_cinderheart || 0)
    - 0.5 * (p.mb_serpentfang || 0) - 0.4 * (p.mb_powderbolt || 0) - 0.4 * (p.mb_splitshot || 0)
    - 0.4 * (p.mb_emberseal || 0) - 1 * (p.mb_reservestrength || 0)
    + (t === 'mbtr_weightedbolt' ? 0.6 : 0)
    + comboBonus(player, 'packBond', 'rangedDamage'));
  const rateDenom = Math.max(0.25, 1 + 0.15 * (p.firerateup || 0)
    + 0.15 * (p.sk8i_ticktock || 0)
    - 0.10 * (p.wrathfulhorn || 0) + 0.15 * (p.featherweight || 0)
    + (t === 'quicksilverdrop' ? 0.15 : 0)

     + 0.1 * (p.barragecore || 0) + 0.1 * (p.wanderersendurance || 0)
    + 0.1 * (p.quickstepcharm || 0) + (t === 'zephyrcharm' ? 0.10 : 0)
    + 0.1 * (p.sunkenglove || 0) + 0.08 * (p.wildcloak || 0) + 0.1 * (p.brightband || 0)
    + 0.1 * (p.palesigil || 0) + 0.1 * (p.crystalflask || 0) + 0.12 * (p.cursedfragment || 0)
    + (t === 'duskytrinket' ? 0.12 : 0) + (t === 'crystalwhistle' ? 0.1 : 0)
    + (t === 'radiantbadge' ? 0.08 : 0)
    + (t === 'hastyfuse' ? 0.06 : 0) + (t === 'swiftgear' ? 0.06 : 0)

    + (t === 'sk8t_hairspring' ? 0.06 : 0) + (t === 'sk8t_boggedgear' ? 0.05 : 0)

    + (t === 'oiledspring' ? 0.06 : 0) + (t === 'tickingcog' ? 0.05 : 0) + (t === 'rapidprimer' ? 0.08 : 0)
    + (t === 'nimbletrigger' ? 0.07 : 0) + (t === 'greasedhinge' ? 0.05 : 0)

    + 0.05 * (p.masterytrophy_rangedkills_t2 || 0) + 0.05 * (p.masterytrophy_swarmerdnb_t1 || 0) + 0.05 * (p.explorationtrophy_redfire || 0)

    + (t === 'slickcog' ? 0.06 : 0) + (t === 'snapspring' ? 0.07 : 0) + (t === 'primerpin' ? 0.05 : 0)

    + (t === 'rapidrunoff' ? 0.10 : 0) + (t === 'tremolochip' ? 0.06 : 0) + (t === 'hummingbirdplume' ? 0.10 : 0)

    + (t === 'clickingratchet' ? 0.08 : 0) + (t === 'snappytrigger' ? 0.05 : 0) + (t === 'quickratchet' ? 0.07 : 0)
    + (t === 'clickingescapement' ? 0.05 : 0) + (t === 'oiledlens' ? 0.04 : 0) + (t === 'leviathancog' ? 0.05 : 0)
    + (t === 'bulwarkcog' ? 0.05 : 0) + (t === 'exactinghinge' ? 0.05 : 0) + (t === 'distantdetent' ? 0.04 : 0)
    + (t === 'hummingsprocket' ? 0.05 : 0) + (t === 'fortunatepawl' ? 0.05 : 0) + (t === 'rapidwisp' ? 0.05 : 0)
    + (t === 'parchedgear' ? 0.05 : 0) + (t === 'whirringcleat' ? 0.05 : 0) + (t === 'concussiveescapement' ? 0.05 : 0)

    + 0.05 * (p.runicrelic || 0) + 0.05 * (p.ashentalisman || 0)
    + 0.05 * (p.woundcharm || 0) + 0.05 * (p.ashenrelic || 0) + 0.05 * (p.woveneffigy || 0)
    + 0.05 * (p.greasedreliquary || 0) + 0.05 * (p.runiccrown || 0)
    + 0.05 * (p.pennylocket || 0) + 0.08 * (p.crackedcirclet || 0) + 0.08 * (p.slickgauntlet || 0)
    + 0.1 * (p.whirringeffigy || 0)
    + (t === 'belfrycharm' ? 0.05 : 0)
    + 0.08 * (p.emberwick || 0)

    + (t === 'escapementgear' ? 0.06 : 0) + (t === 'siderealtick' ? 0.05 : 0) + (t === 'pulsarmetronome' ? 0.07 : 0)
    + (t === 'clockdrivepin' ? 0.05 : 0) + (t === 'spinuprotor' ? 0.06 : 0) + 0.1 * (p.pulsargovernor || 0)
    + 0.08 * (p.siderealmovement || 0) + 0.08 * (p.flywheelcore || 0) + 0.05 * (p.rapidescapement || 0)
    + 0.08 * (p.spinstabilizer || 0)

      + 0.03 * (p.hcfwtrophy_challenge_hc_speedkill || 0)
    + 0.03 * (p.hcfwtrophy_exploration_meet_hollowcantor || 0) + 0.03 * (p.hcfwtrophy_exploration_meet_deadaircoda || 0) + 0.03 * (p.hcfwtrophy_exploration_meet_tremorswarm || 0)
    + (t === 'cantorbell' ? 0.06 : 0)

    + 0.03 * (p.mgtrophy_meet_eelspitter || 0) + 0.03 * (p.mgtrophy_meet_siltboar || 0)

      + 0.03 * (p.obstrophy_challenge_speedkill || 0)
    + 0.03 * (p.obstrophy_meet_dustmote || 0) + 0.03 * (p.obstrophy_meet_astralhopper || 0) + 0.03 * (p.obstrophy_meet_quasarshard || 0)
    + 0.03 * (p.obstrophy_meet_novamortar || 0) + 0.03 * (p.obstrophy_collection_5d_t2 || 0)
    + (t === 'cometshadowveil' ? 0.08 : 0) + (t === 'eclipseveilcloak' ? 0.08 : 0)

      + 0.03 * (p.ortrophy_challenge_speedkill || 0)
    + 0.03 * (p.ortrophy_meet_cogmoth || 0) + 0.03 * (p.ortrophy_meet_cogspring || 0) + 0.03 * (p.ortrophy_meet_novagear || 0)
    + 0.03 * (p.ortrophy_meet_zenithslinger || 0) + 0.03 * (p.ortrophy_collection_7d_t2 || 0)
    + (t === 'shadowcogveil' ? 0.08 : 0) + (t === 'nightgearveil' ? 0.08 : 0)

     + 0.03 * (p.vbtrophy_meet_derelictmoth || 0) + 0.03 * (p.vbtrophy_meet_driftleaper || 0)
    + 0.03 * (p.vbtrophy_collection_t1 || 0)
    + (t === 'shadowhulkveil' ? 0.08 : 0)

      + 0.03 * (p.vbtrophy2_challenge_speedkill || 0)
    + 0.03 * (p.vbtrophy2_meet_dyingember || 0) + 0.03 * (p.vbtrophy2_meet_voidleaper || 0) + 0.03 * (p.vbtrophy2_meet_eventspark || 0)
    + 0.03 * (p.vbtrophy2_meet_eventslinger || 0) + 0.03 * (p.vbtrophy2_collection_10d_t2 || 0)
    + (t === 'hollowstalkerveil' ? 0.08 : 0) + (t === 'silentstalkerveil' ? 0.08 : 0)

    - 0.08 * (p.longeffigy || 0) - 0.06 * (p.numbingmantle || 0)

    - 0.10 * (p.radiantburst || 0)

    + (t === 'quickfusewick' ? 0.06 : 0) + (t === 'skiprope' ? 0.06 : 0) + (t === 'gearworkcharm' ? 0.06 : 0)

    + 0.15 * (p.mb_quickpulse || 0) + 0.10 * (p.mb_hummingheart || 0)
    + 0.12 * (p.mb_swiftbolt || 0) + 0.05 * (p.mb_hunterspack || 0)
    - 0.10 * (p.mb_snipersfocus || 0) - 0.10 * (p.mb_glacialtouch || 0) - 0.15 * (p.mb_heavyquiver || 0)
    - 0.10 * (p.mb_cinderheart || 0)
    - (t === 'mbtr_weightedbolt' ? 0.08 : 0)

    - 0.25 * (p.mb_talonshot || 0) - 0.40 * (p.martyrsvow || 0) - 0.50 * (p.nbat_berserkersbrand || 0)
    + player.pillFireRateBonus);
  const rateMult = Util.clamp(1 / rateDenom, 0.35, 3);
  player.meleeCooldown = player.meleeCooldownBase * rateMult;
  player.fireCooldown = player.fireCooldownBase * rateMult;

  const flatFireRate = 0.02*(p.spectraltoken||0) + 0.02*(p.loyalpatron||0) + 0.02*(p.familiarfriend||0) + 0.02*(p.vaultcracker||0) + 0.02*(p.mastervaultkeeper||0) + 0.02*(p.gauntletrunner||0) + 0.02*(p.dealmaker||0) + 0.02*(p.barrelroller||0) + 0.02*(p.quarrymanscharm||0) + 0.02*(p.frequentbuyercard||0) + 0.02*(p.overflowingpurse||0) + 0.02*(p.misersvault||0) + 0.02*(p.fusemastersglove||0) + 0.02*(p.trinketcase||0) + 0.02*(p.frequentflyercoin||0) + 0.02*(p.longbowstring||0) + 0.02*(p.crittercharm||0) + 0.02*(p.blastproofgloves||0) + 0.02*(p.gildedring||0) + 0.02*(p.coralgauntlet||0) + 0.02*sc.fireRate;
  if (flatFireRate > 0) {
    const effRate = (1 / player.fireCooldown) + flatFireRate;
    player.fireCooldown = Math.max(0.1, 1 / effRate);
  }

  const rangeBonusTiles = sc.range + (p.rangeup || 0) + (p.tidecallersscale || 0) + player.pillRangeBonus
    + (player.starRangeBonus || 0)
    + 1 * (p.sk8i_farstep || 0)

    + 1*(p.brokenwatch||0) + 1*(p.goldenclover||0) + 1*(p.quickfuse||0) + 1*(p.nightowlfeather||0) + 1*(p.swiftrecovery||0) + 1*(p.fortuneshell||0) + 1*(p.directglass||0)
    + 1 * (p.solarfeather || 0)  + 1 * (p.sapphiretiara || 0)
      + (t === 'ambercoin' ? 1 : 0)
    + (t === 'polishedbadge' ? 1 : 0) + (t === 'crackedseal' ? 1 : 0)
    + (t === 'longshotlens' ? 1 : 0) + (t === 'farsightedcharm' ? 1 : 0)

    + (t === 'farcastprism' ? 1 : 0) + (t === 'hawkseyebead' ? 1 : 0) + (t === 'longreachrod' ? 1 : 0)

    + 1 * (p.masterytrophy_critslanded_t1 || 0) + 1 * (p.masterytrophy_swarmerdnb_t2 || 0) + 1 * (p.explorationtrophy_spikedrock || 0)

    + (t === 'longglass' ? 1 : 0) + (t === 'outreachglass' ? 1 : 0) + (t === 'horizonspan' ? 1 : 0)
    + (t === 'auspiciousspyring' ? 1 : 0) + (t === 'distantdetent' ? 1 : 0) + (t === 'horizonveil' ? 1 : 0)
    + (t === 'overlooktoken' ? 1 : 0) + (t === 'longplume' ? 1 : 0)

    + 1 * (p.overlookcrown || 0) + 1 * (p.gildedeffigy || 0) + 1 * (p.wovensignet || 0)
    + 1 * (p.hallowedbracer || 0) + 1 * (p.runiccloak || 0) + 1 * (p.scavengedtalisman || 0)
    + 1 * (p.longeffigy || 0)
    + 1 * (p.devotedrelic || 0)
    + (t === 'spyglasslens' ? 1 : 0) + (t === 'longsightbead' ? 1 : 0)

    + (t === 'sk8t_farcastbead' ? 1 : 0) + (t === 'sk8t_narrowscope' ? 1 : 0)

    + 1 * (p.mb_longsight || 0) + 0.5 * (p.mb_periscope || 0)
    - 1 * (p.masterytrophy_meleekills_t2 || 0);
  const rangeScale = player.attackType === 'melee' ? 0.25 : 1;
  const farseeingBonus = (t === 'farseeingcharm' && player.attackType !== 'melee') ? 1 : 0;
  const eagleEyeBonus = 0.5 * (p.eagleeye || 0);

  player.rangeTiles = Util.clamp(player.baseRangeTiles + rangeBonusTiles * rangeScale + farseeingBonus + eagleEyeBonus, 0.25, 12);
  player.meleeRange = player.rangeTiles * TILE * (t === 'bentnail' ? 1.2 : 1);
  player.boltSpeed = player.def.boltSpeed || 340;

  if (p.prismveil) player.boltSpeed = Math.max(120, player.boltSpeed - 40 * p.prismveil);

  player.bossDamageBonus = Math.min(1, 0.15 * (p.voidcharm || 0) + 0.08 * (p.bossbane || 0) - 0.10 * (p.stonewall || 0) + (t === 'voidshard' ? 0.10 : 0)
    + (t === 'nbtr_charredknuckle' ? 0.06 : 0)
    + 0.03 * (p.trophy_mbmarrowcolossus || 0)

    + (t === 'giantslayerbead' ? 0.08 : 0) + (t === 'supernovaseal' ? 0.1 : 0) + (t === 'titanfallmark' ? 0.06 : 0)
    + (t === 'collapsesigil' ? 0.08 : 0) + (t === 'starbreakerpin' ? 0.06 : 0) + 0.12 * (p.starbreakerdrill || 0)
    + 0.1 * (p.titanfallcharge || 0) + 0.08 * (p.collapsecatalyst || 0) + 0.12 * (p.giantsbanealloy || 0)

    + 0.12 * (p.voidwhisper || 0) + 0.10 * (p.damnedsoul || 0)
    + 0.1 * (p.giantslayersbelt || 0) + 0.15 * (p.trophyrack || 0) + 0.08 * (p.sombrasownseal || 0)     + 0.05 * (p.radiantglove || 0) + 0.08 * (p.gildedseal || 0)
      + (t === 'wanderingfragment' ? 0.05 : 0)
    + (t === 'vividscroll' ? 0.1 : 0) + (t === 'radiantlantern' ? 0.08 : 0)
    + 0.08 * (p.huntersfocus || 0)
    + (t === 'giantsbane' ? 0.10 : 0) + (t === 'dragonslayerscoin' ? 0.08 : 0)

    + (t === 'titanbanetooth' ? 0.10 : 0) + (t === 'colossusmark' ? 0.08 : 0) + (t === 'monsterhuntertag' ? 0.06 : 0)
    + (t === 'behemothsigil' ? 0.08 : 0) + (t === 'ogresgrudge' ? 0.05 : 0)

    + 0.05 * (p.masterytrophy_critslanded_t2 || 0) + 0.05 * (p.masterytrophy_activeitemuses_t1 || 0) + 0.05 * (p.explorationtrophy_tintedrock || 0)

    + (t === 'titanmark' ? 0.10 : 0) + (t === 'hulkbanetoken' ? 0.06 : 0)

    + (t === 'leviathanbane' ? 0.1 : 0) + (t === 'behemothtag' ? 0.08 : 0) + (t === 'ogretag' ? 0.08 : 0)
    + (t === 'colossussigil' ? 0.1 : 0) + (t === 'leviathancog' ? 0.06 : 0) + (t === 'titanbloom' ? 0.06 : 0)
    + (t === 'redoubtmark' ? 0.05 : 0) + (t === 'frostbittag' ? 0.06 : 0) + (t === 'ogrehasp' ? 0.06 : 0)
    + (t === 'dreadtag' ? 0.05 : 0) + (t === 'colossusstub' ? 0.05 : 0) + (t === 'giantanklet' ? 0.06 : 0)

    + 0.05 * (p.leviathanpendant || 0) + 0.05 * (p.sunkentalisman || 0) + 0.05 * (p.ogrelocket || 0)
    + 0.05 * (p.titanlocket || 0) + 0.08 * (p.wovenvestment || 0) + 0.08 * (p.runicrune || 0)
    + 0.15 * (p.ancientcloak || 0) + 0.1 * (p.lopingreliquary || 0) + 0.15 * (p.monarchbracer || 0)
    + (t === 'drenchedsigil' ? 0.12 : 0) + (t === 'amazonbrand' ? 0.10 : 0) + (t === 'kirksignet' ? 0.15 : 0)
    + (t === 'lastbarritual' ? 0.05 : 0)

    + 0.08 * (p.mb_giantslayer || 0)
    + 0.05 * (p.mb_battlecrown || 0) + (t === 'mbtr_cinderchain' ? 0.08 : 0)
    + (t === 'combweaversigil' ? 0.06 : 0));

  player.bossDamageTakenMult = Math.max(0.25, 1 - 0.25 * (p.stonewall || 0) - (t === 'bulwarkshard' ? 0.15 : 0)

    - 0.05 * (p.trophy_barnaclecolossus || 0)

    - (t === 'redoubtslab' ? 0.08 : 0) - (t === 'redoubtrampart' ? 0.1 : 0) - (t === 'wardingrampart' ? 0.12 : 0)
    - (t === 'bulwarkcog' ? 0.12 : 0) - (t === 'wardinganklet' ? 0.08 : 0) - (t === 'redoubtmark' ? 0.08 : 0)
    - (t === 'crimsonchunk' ? 0.06 : 0) - (t === 'bulwarkknot' ? 0.08 : 0) - (t === 'anchoredchit' ? 0.08 : 0)
    - (t === 'bracedwishbone' ? 0.12 : 0) - (t === 'blastwideplate' ? 0.06 : 0)

    - 0.08 * (p.hallowedamulet || 0) - 0.08 * (p.wovencloak || 0) - 0.08 * (p.forsakentalisman || 0)
    - 0.12 * (p.ashengauntlet || 0)
    - (t === 'stormgrate' ? 0.12 : 0) - (t === 'barkplate' ? 0.10 : 0)

    + 0.10 * (p.blastmaster || 0) + 0.12 * (p.ancientcloak || 0)

    + 0.10 * (p.masterytrophy_critslanded_t2 || 0)

    - 0.08 * (p.mb_stonehide || 0) - 0.12 * (p.mb_bulwarkplate || 0)
    - 0.08 * (p.mb_battlecrown || 0)
    - (t === 'mbtr_tarnishedring' ? 0.08 : 0));
  player.spikedBarding = (p.spikedbard || 0) > 0 || t === 'thornedvine';

  player.lifestealChance = Math.min(0.4, 0.08 * (p.vampfang || 0) + 0.08 * (p.crystalfang || 0) + 0.06 * (p.bloodpact || 0) + (t === 'gildedfang' ? 0.05 : 0)

    + ((p.blackheart && p.bloodpact) ? 0.05 : 0)

    + 0.04 * (p.trophy_choirdrowned || 0)
    + 0.06 * (p.sk8i_bloodmarble || 0)
    + 0.06 * (p.sk11i_lifewell || 0)
    + (t === 'sk8t_hungryfangcharm' ? 0.05 : 0)

    + (t === 'siphonprism' ? 0.06 : 0) + (t === 'emberdrinker' ? 0.05 : 0) + (t === 'vitalarc' ? 0.05 : 0)
    + (t === 'redshifttooth' ? 0.06 : 0) + (t === 'sanguinestar' ? 0.05 : 0) + 0.08 * (p.siphonarray || 0)
    + 0.06 * (p.vitalcondenser || 0) + 0.06 * (p.redshiftfang || 0) + 0.05 * (p.emberdrinkervessel || 0)
     + 0.06 * (p.quietorb || 0)
     + 0.05 * (p.rustedwhistle || 0) + (t === 'astraltalisman' ? 0.06 : 0)
    + (t === 'lunarband' ? 0.06 : 0) + (t === 'radiantanklet' ? 0.06 : 0)
    + 0.06 * (p.bloodstoneamulet || 0)
    + (t === 'hungrymaw' ? 0.05 : 0) + (t === 'thirstyroot' ? 0.05 : 0)

    + (t === 'crimsonleech' ? 0.05 : 0) + (t === 'sanguinebead' ? 0.04 : 0)
    + (t === 'vampiricthorn' ? 0.06 : 0) + (t === 'redthirstpin' ? 0.04 : 0)

    + 0.04 * (p.masterytrophy_bombsplaced_t1 || 0) + 0.04 * (p.masterytrophy_activeitemuses_t2 || 0) + 0.04 * (p.explorationtrophy_turretn || 0)

    + (t === 'bloodthorn' ? 0.05 : 0) + (t === 'leechbead' ? 0.04 : 0)

    + (t === 'thirstyfang' ? 0.05 : 0) + (t === 'leechingfang' ? 0.06 : 0) + (t === 'parchedsipper' ? 0.05 : 0)
    + (t === 'parchedfang' ? 0.06 : 0) + (t === 'dreadfang' ? 0.03 : 0) + (t === 'biliousbarb' ? 0.03 : 0)
    + (t === 'crimsonribbon' ? 0.06 : 0) + (t === 'parchedgear' ? 0.05 : 0) + (t === 'crimsonchunk' ? 0.04 : 0)
    + (t === 'adoringcoil' ? 0.03 : 0) + (t === 'crimsonposy' ? 0.04 : 0) + (t === 'drainingquill' ? 0.05 : 0)

    + 0.04 * (p.gildedcrown || 0) + 0.04 * (p.wovenvestment || 0) + 0.05 * (p.thirstycirclet || 0)
    + 0.05 * (p.wovenpendant || 0) + 0.05 * (p.sunkengauntlet || 0) + 0.04 * (p.forsakentalisman || 0)
    + (t === 'leechcoil' ? 0.06 : 0) + (t === 'bloodorchid' ? 0.05 : 0)
    + (t === 'royaljellycharm' ? 0.05 : 0)

    + 0.06 * (p.mb_hungrymaw || 0) + 0.04 * (p.mb_pocketflask || 0)
    + (t === 'mbtr_faintember' ? 0.04 : 0)

    + 0.01*sc.lifestealChance + 0.01*(p.sapphirelocket||0) + 0.01*(p.feraltalisman||0) + 0.01*(p.rustedcharm||0) + 0.01*(p.jadelantern||0) + 0.01*(p.moltenscroll||0));

  player.critChance = Math.min(0.75, 0.10 * (p.stormbarrel || 0) + 0.08 * (p.boxer || 0) + 0.05 * (p.gamblerscoin || 0)  + luckBonus
    + (t === 'nbtr_glasslens' ? 0.05 : 0)
    + 0.05 * (p.trophy_dunesovereign || 0)
    + (t === 'keeneyeshard' ? 0.04 : 0)
    + 0.05 * (p.sk8i_gamblerbead || 0)
    + 0.06 * (p.sk11i_ashencrown || 0)

    + (t === 'parallaxlens' ? 0.06 : 0) + (t === 'crosshaircluster' ? 0.05 : 0) + (t === 'sightingbead' ? 0.06 : 0)
    + (t === 'apexreticle' ? 0.05 : 0) + (t === 'transitmark' ? 0.05 : 0)
    + 0.05 * (p.apexcalibration || 0)
    + 0.05 * (p.starsightmonocle || 0)
    + 0.05 * (p.faithfulbell || 0)

    + (t === 'sk8t_deadeyeclasp' ? 0.06 : 0) + (t === 'sk8t_glasscannon' ? 0.08 : 0) - (t === 'sk8t_narrowscope' ? 0.05 : 0)
    + 0.05 * (p.haloedcrown || 0) + 0.05 * (p.graceofthedawn || 0) + 0.10 * (p.souldrain || 0) + 0.05 * (p.bloodoffering || 0)
    + (t === 'crackedlens' ? 0.08 : 0) + (t === 'moltencore' ? 0.05 : 0)

    + 0.05 * (p.cartographerseye || 0) + 0.05 * (p.assassinsedge || 0) + 0.08 * (p.executionersfocus || 0)
    + 0.1 * (p.deathsprecisionblade || 0) + 0.05 * (p.voltaiccore || 0) + 0.05 * (p.deadeyelens || 0)
    + 0.08 * (p.velvetcirclet || 0) + 0.06 * (p.jadequill || 0)
     + 0.05 * (p.sacredbauble || 0) + 0.05 * (p.etchedhoofguard || 0)
    + 0.05 * (p.frostedband || 0) + (t === 'frostedsigil' ? 0.08 : 0) + (t === 'frozenband' ? 0.05 : 0)
    + (t === 'forgottenboots' ? 0.06 : 0)
    + 0.08 * (p.radianthalofragment || 0) + 0.05 * (p.keeneye || 0)
    + (t === 'precisionring' ? 0.06 : 0) + (t === 'honedblade' ? 0.06 : 0)

    + (t === 'keenedge' ? 0.06 : 0) + (t === 'splittingpin' ? 0.05 : 0) + (t === 'weakpointmap' ? 0.07 : 0)
    + (t === 'focusinglens' ? 0.05 : 0) + (t === 'hairtriggerpin' ? 0.08 : 0)

    + 0.05 * (p.masterytrophy_bombsplaced_t2 || 0) + 0.05 * (p.masterytrophy_itemscollected_t1 || 0) + 0.05 * (p.explorationtrophy_turrete || 0)

    + (t === 'sharpsight' ? 0.06 : 0) + (t === 'flawpin' ? 0.05 : 0) + (t === 'truestrikebead' ? 0.07 : 0)

    + (t === 'crackedmanhole' ? 0.08 : 0) + (t === 'piranhafang' ? 0.10 : 0) + (t === 'glassgrit' ? 0.06 : 0)

    + (t === 'exactingsight' ? 0.08 : 0) + (t === 'sharpedge' ? 0.05 : 0) + (t === 'keenfacet' ? 0.08 : 0)
    + (t === 'exactingfacet' ? 0.07 : 0) + (t === 'hairlinesplinter' ? 0.07 : 0) + (t === 'oiledlens' ? 0.05 : 0)
    + (t === 'exactinghinge' ? 0.07 : 0) + (t === 'focusedwedge' ? 0.06 : 0) + (t === 'fondedge' ? 0.04 : 0)
    + (t === 'scavengedsight' ? 0.05 : 0)

    + 0.05 * (p.runicpendant || 0)
    + 0.05 * (p.woundcharm || 0) + 0.05 * (p.wovencloak || 0) + 0.06 * (p.sharpvestment || 0)
    + (t === 'spinecactusbarb' ? 0.08 : 0)
    + (t === 'crocshadefang' ? 0.06 : 0)
    + 0.05 * (p.keenmark || 0) + 0.03 * (p.quarryhoundtag || 0)
    + (t === 'nightperchring' ? 0.05 : 0)
    + 0.06 * (p.jackpotcharm || 0)
    + (t === 'shatteredlensfragment' ? 0.06 : 0)

    - 0.05 * (p.deepgauntlet || 0) - 0.04 * (p.forsakenlocket || 0)
    - 0.04 * (p.whirringeffigy || 0) - 0.06 * (p.monarchbracer || 0)

    - 0.05 * (p.luckyclover || 0)

    + (t === 'daisychaincrown' ? 0.05 : 0) + (t === 'sootedhalo' ? 0.05 : 0) + (t === 'preciseaimgauge' ? 0.05 : 0)
    + comboBonus(player, 'twinFangs', 'critChance')

    + 0.05 * (p.mb_keeneye || 0) + 0.08 * (p.mb_snipersfocus || 0)
    + 0.06 * (p.mb_glassheart || 0) + 0.03 * (p.mb_moonsigil || 0)
    + (t === 'mbtr_gleamingscale' ? 0.05 : 0) - (t === 'mbtr_batteredlocket' ? 0.03 : 0)

    + 0.01*sc.critChance + 0.01*(p.goldenmedallion||0) + 0.01*(p.radiantwhistle||0) + 0.01*(p.duskygauntlet||0) + 0.01*(p.braidedbadge||0) + 0.01*(p.ambershard||0));
  player.revealMap = (p.nightlens || 0) > 0 || player.eyeUsed || t === 'foxfirelantern' || (p.mb_scoutslens || 0) > 0;
  player.hasSecondWind = (p.secondwind || 0) > 0 || t === 'emberphylactery' || (p.mb_reservestrength || 0) > 0;

  player.onKillHealChance = (player.def.lifedrinkChance || 0) + (t === 'thirstfang' ? 0.06 : 0)
    + (t === 'nbtr_bramblewrap' ? 0.05 : 0)
    + 0.05 * (p.sk8i_healcharm || 0)
    + 0.06 * (p.sk11i_healcrest || 0)

    + 0.08 * (p.soulcollectorurn || 0) + 0.06 * (p.reclamationcell || 0) + 0.06 * (p.cinderharvester || 0)
    + 0.05 * (p.stardustreaper || 0)
    + 0.06 * (p.blessedhalo || 0)

    + (t === 'wakewreath' ? 0.05 : 0) + (t === 'carrionfeather' ? 0.05 : 0) + (t === 'scavengedration' ? 0.05 : 0)
    + (t === 'roaringtally' ? 0.04 : 0) + (t === 'titanbloom' ? 0.04 : 0) + (t === 'reaperanklet' ? 0.05 : 0)
    + (t === 'reapertooth' ? 0.05 : 0) + (t === 'scavengedsight' ? 0.04 : 0) + (t === 'mourningfang' ? 0.05 : 0)

     + 0.04 * (p.crackedgauntlet || 0) + 0.04 * (p.weatheredeffigy || 0)
    + 0.04 * (p.reaperreliquary || 0) + 0.04 * (p.wovensignet || 0) + 0.04 * (p.sunkenidol || 0)
    + 0.04 * (p.runicrune || 0) + 0.05 * (p.sunkensigil || 0) + 0.05 * (p.scavengedtalisman || 0)
    + 0.06 * (p.crackedcloak || 0)
    + (t === 'carrionbloom' ? 0.06 : 0) + (t === 'vulturecharm' ? 0.05 : 0)
    + 0.08 * (p.lastwaveformcore || 0)

    + 0.05 * (p.mb_reapersboon || 0);

  player.venomChance = Math.min(0.35, (p.venom ? 0.12 * p.venom + luckBonus : 0)  + 0.06 * (p.plaguebreath || 0) + (t === 'emberdust' ? 0.05 : 0)
    + 0.05 * (p.nbat_venomcask || 0)
    + 0.04 * (p.trophy_reefwraith || 0)
    + (t === 'hexbanechain' ? 0.04 : 0)
    + 0.05 * (p.sk8i_venomthorn || 0)
    + 0.06 * (p.sk11i_witheredfang || 0)
    + (t === 'sk8t_direstingpin' ? 0.04 : 0)

    + (t === 'ionbloomvial' ? 0.05 : 0) + 0.06 * (p.ionbloomcanister || 0)
     + 0.06 * (p.hollowcompass || 0)
    + 0.06 * (p.roaringcoin || 0) + 0.05 * (p.ancientring || 0) + (t === 'vividseal' ? 0.05 : 0)
    + (t === 'mysticfeather' ? 0.04 : 0) + (t === 'twilightorb' ? 0.05 : 0)
    + 0.06 * (p.venomouskiss || 0) + (t === 'venomvial' ? 0.05 : 0)
    + (t === 'blightedthorn' ? 0.05 : 0) + (t === 'toxicbead' ? 0.04 : 0) + (t === 'seepingvial' ? 0.05 : 0)

    + 0.04 * (p.masterytrophy_shotsfired_t1 || 0) + 0.04 * (p.masterytrophy_itemscollected_t2 || 0) + 0.04 * (p.explorationtrophy_turrets || 0)

    + (t === 'blightbead' ? 0.05 : 0)

    + (t === 'tainteddrop' ? 0.06 : 0) + (t === 'septicfang' ? 0.05 : 0) + (t === 'blightedampule' ? 0.07 : 0)
    + (t === 'acridtrefoil' ? 0.06 : 0) + (t === 'biliousbarb' ? 0.04 : 0) + (t === 'septicspur' ? 0.07 : 0)
    + (t === 'bilioustoken' ? 0.04 : 0) + (t === 'acridveil' ? 0.04 : 0)

    + 0.04 * (p.ashentalisman || 0)
    + 0.04 * (p.weatheredreliquary || 0) + 0.04 * (p.forsakenamulet || 0) + 0.04 * (p.sunkenmantle || 0)
    + 0.04 * (p.ashencrown || 0) + 0.06 * (p.ancientmantle || 0)
    + (t === 'sewergasvial' ? 0.06 : 0)

    + 0.04 * (p.plaguebud || 0) + 0.05 * (p.witherpetal || 0) + 0.05 * (p.plaguebloom || 0)
    + 0.06 * (p.rotcrown || 0) + 0.03 * (p.ecosystemtotem || 0)
    + (t === 'chippedgargle' ? 0.04 : 0)

    + (t === 'pigtailbow' ? 0.04 : 0) + (t === 'embercoal' ? 0.04 : 0) + (t === 'waxsealcharm' ? 0.04 : 0)
    + (t === 'copperwiring' ? 0.04 : 0)

    + 0.05 * (p.mb_toxinvial || 0) + 0.08 * (p.mb_serpentfang || 0) + 0.06 * (p.mb_snakeoil || 0)
    + 0.03 * (p.mb_alchemistmix || 0) + (t === 'mbtr_briarwreath' ? 0.05 : 0)

    + 0.01*sc.venomChance + 0.01*(p.stormwhistle||0) + 0.01*(p.obsidianwisp||0) + 0.01*(p.ambersigil||0) + 0.01*(p.duskyboots||0) + 0.01*(p.roaringanklet||0));
  player.stunChance = Math.min(0.2, (p.hardhitter ? 0.10 * p.hardhitter + luckBonus : 0)  + 0.05 * (p.directmalice || 0) + (t === 'frostedpetal' ? 0.05 : 0)
    + 0.04 * (p.trophy_siltwarden || 0)
    + 0.06 * (p.sk11i_hexbead || 0)

    + (t === 'concussionwave' ? 0.05 : 0) + 0.06 * (p.shockfrontemitter || 0)
     + 0.06 * (p.whisperingidol || 0)
    + 0.05 * (p.coralinsignia || 0) + 0.05 * (p.gleaminghoofguard || 0) + (t === 'emeraldchain' ? 0.04 : 0)
    + (t === 'thundercompass' ? 0.06 : 0) + (t === 'copperbadge' ? 0.05 : 0)
    + 0.06 * (p.shockcollar || 0) + (t === 'stunbadge' ? 0.05 : 0)
    + (t === 'concussivebell' ? 0.05 : 0) + (t === 'ringingchime' ? 0.04 : 0) + (t === 'stunningclasp' ? 0.04 : 0)

    + 0.04 * (p.masterytrophy_shotsfired_t2 || 0) + 0.04 * (p.masterytrophy_trinketsequipped_t1 || 0) + 0.04 * (p.explorationtrophy_turretw || 0)

    + (t === 'knellchime' ? 0.05 : 0)

    + (t === 'concussiveslug' ? 0.06 : 0) + (t === 'leadenchime' ? 0.05 : 0) + (t === 'ringinghammer' ? 0.05 : 0)
    + (t === 'glidingclapper' ? 0.04 : 0) + (t === 'concussivelace' ? 0.06 : 0) + (t === 'clangingquill' ? 0.04 : 0)
    + (t === 'jarringlace' ? 0.04 : 0) + (t === 'tollingstub' ? 0.04 : 0) + (t === 'dulldram' ? 0.04 : 0)
    + (t === 'tollingribbon' ? 0.04 : 0) + (t === 'clangingchip' ? 0.04 : 0) + (t === 'concussiveescapement' ? 0.06 : 0)

    + 0.04 * (p.weatheredidol || 0) + 0.04 * (p.tollinglocket || 0) + 0.04 * (p.hallowedrelic || 0)
    + 0.05 * (p.feintingsigil || 0) + 0.06 * (p.leadenbracer || 0)
    + (t === 'floodstunner' ? 0.06 : 0)
    + (t === 'cracklecharm' ? 0.04 : 0)
    + (t === 'flatlinedcoil' ? 0.06 : 0)
    + (t === 'brackishvariant' ? 0.06 : 0)
    + (t === 'astralbeaconchit' ? 0.06 : 0)
    + (t === 'meridiansummonschit' ? 0.06 : 0) + (t === 'zenithsummonschit' ? 0.06 : 0)
    + (t === 'voidsummonschit' ? 0.06 : 0)
    + (t === 'nullsummonschit' ? 0.06 : 0) + (t === 'eventsummonschit' ? 0.06 : 0)

    + (t === 'smolderingtag' ? 0.04 : 0) + (t === 'friendshipbracelet' ? 0.04 : 0) + (t === 'hivemindtoken' ? 0.04 : 0)
    + (t === 'boltcutter' ? 0.04 : 0)

    + 0.05 * (p.mb_concussivehoof || 0) + 0.07 * (p.mb_thunderclap || 0) + 0.05 * (p.mb_moltenshard || 0)
    + 0.05 * (p.mb_beartrap || 0) + 0.03 * (p.mb_alchemistmix || 0) + (t === 'mbtr_thornbangle' ? 0.05 : 0)

    + 0.01*sc.stunChance + 0.01*(p.obsidiantalisman||0) + 0.01*(p.roaringrune||0) + 0.01*(p.radiantquill||0) + 0.01*(p.mysticgauntlet||0) + 0.01*(p.polishedcloak||0));
  player.charmChance = Math.min(0.25, (player.def.innateCharmChance || 0)
    + 0.05 * (p.sk8i_charmreed || 0)
    + (p.flirtatious ? 0.10 * p.flirtatious + luckBonus : 0)  + 0.06 * (p.envyshard || 0) + (t === 'lovecharm' ? 0.05 : 0)

    + (t === 'sirensignal' ? 0.05 : 0)
      + 0.05 * (p.mysticcloak || 0)
    + 0.05 * (p.emeraldfeather || 0) + 0.04 * (p.ancienttrinket || 0) + (t === 'jadewisp' ? 0.04 : 0)
    + (t === 'emberbauble' ? 0.05 : 0) + (t === 'radiantring' ? 0.05 : 0)
    + 0.06 * (p.mesmerizingveil || 0) + (t === 'charmedlocket' ? 0.05 : 0)
    + (t === 'sweettalkpin' ? 0.05 : 0) + (t === 'doeeyedcharm' ? 0.04 : 0) + (t === 'honeyedtoken' ? 0.04 : 0)

    + 0.04 * (p.masterytrophy_obstaclesdestroyed_t1 || 0) + 0.04 * (p.masterytrophy_trinketsequipped_t2 || 0) + 0.04 * (p.explorationtrophy_turretplus || 0)

    + (t === 'sirenpin' ? 0.05 : 0)

    + (t === 'adoringpetal' ? 0.05 : 0) + (t === 'velvetposy' ? 0.06 : 0) + (t === 'fondribbon' ? 0.06 : 0)
    + (t === 'rosykeg' ? 0.04 : 0) + (t === 'dotingvoucher' ? 0.04 : 0) + (t === 'roaringposy' ? 0.04 : 0)
    + (t === 'sweethem' ? 0.04 : 0) + (t === 'airylocket' ? 0.04 : 0) + (t === 'adoringwisp' ? 0.07 : 0)
    + (t === 'dotingrivet' ? 0.06 : 0) + (t === 'adoringcoil' ? 0.04 : 0) + (t === 'crimsonposy' ? 0.04 : 0)
    + (t === 'fondedge' ? 0.04 : 0) + (t === 'tollingribbon' ? 0.04 : 0)

    + 0.04 * (p.ashensigil || 0) + 0.04 * (p.fondsignet || 0) + 0.04 * (p.reaperreliquary || 0)
    + 0.05 * (p.runicamulet || 0)
    + (t === 'sambaflower' ? 0.06 : 0)

    + (t === 'candyheartlocket' ? 0.05 : 0) + (t === 'hivenestcharm' ? 0.05 : 0)

    + 0.05 * (p.mb_sweettalker || 0) + 0.05 * (p.mb_hexedbell || 0) + (t === 'mbtr_stillwaterdrop' ? 0.05 : 0)

    + 0.01*sc.charmChance + 0.01*(p.forgottenemblem||0) + 0.01*(p.widecirclet||0) + 0.01*(p.weatheredgauntlet||0) + 0.01*(p.scatteringeffigy||0) + 0.01*(p.wispinggauntlet||0));
  player.freezeChance = Math.min(0.25, (player.def.innateFreezeChance || 0)
    + 0.05 * (p.nbat_freezingtotem || 0)
    + 0.05 * (p.sk8i_frostspindle || 0)
    + (p.coldheart ? 0.10 * p.coldheart + luckBonus : 0) + 0.05 * (p.frostbite || 0) + (t === 'staticcharm' ? 0.06 : 0)

    + (t === 'absolutezerobead' ? 0.06 : 0) + 0.06 * (p.cryogenicround || 0)
    + 0.06 * (p.frozenthorn || 0)     + 0.05 * (p.braidedinsignia || 0) + 0.06 * (p.stormseal || 0)
      + (t === 'silvermirror' ? 0.06 : 0)
    + (t === 'coralrune' ? 0.06 : 0) + (t === 'silveranklet' ? 0.05 : 0)
    + 0.06 * (p.frostboundcloak || 0) + (t === 'frostneedle' ? 0.06 : 0) + (t === 'rimefrostcharm' ? 0.05 : 0)
    + (t === 'hoarfrostbead' ? 0.05 : 0) + (t === 'chillsplinter' ? 0.04 : 0) + (t === 'glacialpin' ? 0.04 : 0)
    + (t === 'sk8t_rimeclasp' ? 0.04 : 0)

    + 0.04 * (p.masterytrophy_obstaclesdestroyed_t2 || 0) + 0.04 * (p.masterytrophy_familiarscollected_t1 || 0) + 0.04 * (p.explorationtrophy_turretx || 0)

    + (t === 'rimebead' ? 0.05 : 0)

    + (t === 'rimedbead' ? 0.05 : 0) + (t === 'rimedlattice' ? 0.05 : 0) + (t === 'frostbitflake' ? 0.06 : 0)
    + (t === 'lightlattice' ? 0.04 : 0) + (t === 'frostbittag' ? 0.04 : 0) + (t === 'whisperingnail' ? 0.04 : 0)
    + (t === 'frostbitplume' ? 0.05 : 0) + (t === 'hagglersplinter' ? 0.04 : 0)

    + 0.04 * (p.gildedcrown || 0) + 0.06 * (p.numbingmantle || 0) + 0.08 * (p.sleetedcirclet || 0)
    + 0.08 * (p.crackedpendant || 0)
    + (t === 'meltwaterbead' ? 0.06 : 0)

    + (t === 'flickerband' ? 0.05 : 0) + (t === 'brightringtag' ? 0.05 : 0) + (t === 'glitterdust' ? 0.05 : 0)
    + (t === 'royalnectarvial' ? 0.05 : 0)

    + 0.05 * (p.mb_frostbite || 0) + 0.07 * (p.mb_glacialtouch || 0) + 0.05 * (p.mb_frostbrand || 0)
    + 0.03 * (p.mb_stormlantern || 0) + (t === 'mbtr_frostedcoin' ? 0.05 : 0)

    + 0.01*sc.freezeChance + 0.01*(p.thundercloak||0) + 0.01*(p.goldenboots||0) + 0.01*(p.shadowsigil||0) + 0.01*(p.weatheredquill||0) + 0.01*(p.amberhorseshoe||0));
  player.fearChance = Math.min(0.3, (p.terrifying ? 0.12 * p.terrifying + luckBonus : 0)  + 0.06 * (p.despairtoken || 0) + (t === 'spectralveil' ? 0.05 : 0)
    + 0.04 * (p.trophy_drownedbellringer || 0)
    + 0.06 * (p.sk11i_duskveil || 0)

    + (t === 'darkmatterdread' ? 0.05 : 0)
      + 0.04 * (p.paleinsignia || 0)
    + 0.04 * (p.ironprism || 0) + (t === 'twilightamulet' ? 0.06 : 0) + (t === 'obsidianamulet' ? 0.04 : 0)
    + 0.06 * (p.dreadcloak || 0) + (t === 'dreadfulmask' ? 0.05 : 0)
    + (t === 'grimwhisper' ? 0.05 : 0) + (t === 'hollowmask' ? 0.04 : 0) + (t === 'shudderstone' ? 0.04 : 0)

    + 0.04 * (p.masterytrophy_enemiesfrozen_t1 || 0) + 0.04 * (p.masterytrophy_familiarscollected_t2 || 0) + 0.04 * (p.explorationtrophy_turrettarget || 0)

    + (t === 'dreadbead' ? 0.05 : 0)

    + (t === 'keeningrattle' ? 0.05 : 0) + (t === 'shudderingmask' ? 0.05 : 0) + (t === 'pallidwail' ? 0.06 : 0)
    + (t === 'dreadfang' ? 0.04 : 0) + (t === 'whisperingfleck' ? 0.04 : 0) + (t === 'dreadtag' ? 0.04 : 0)
    + (t === 'whisperingnail' ? 0.04 : 0)

    + 0.04 * (p.crackedamulet || 0)  + 0.04 * (p.sunkenmantle || 0)
    + 0.04 * (p.howlingreliquary || 0) + 0.04 * (p.titanlocket || 0) + 0.05 * (p.shudderinglocket || 0)
    + 0.05 * (p.grislycloak || 0) + 0.05 * (p.longeffigy || 0)
    + (t === 'howlermask' ? 0.06 : 0)
    + (t === 'gargoylewhisper' ? 0.05 : 0)

    + (t === 'hollowflamewick' ? 0.05 : 0) + (t === 'lollipoptrinket' ? 0.05 : 0)

    + 0.05 * (p.mb_direhowl || 0) + 0.05 * (p.mb_widowsveil || 0) + 0.05 * (p.mb_direwolfpelt || 0)
    + 0.03 * (p.mb_stormlantern || 0) + (t === 'mbtr_shudderingveil' ? 0.05 : 0)

    + 0.01*sc.fearChance + 0.01*(p.pallidcirclet||0) + 0.01*(p.ancientrune||0) + 0.01*(p.pullingsignet||0) + 0.01*(p.hallowedlocket||0) + 0.01*(p.viciousrune||0));

  player.vulnerableChance = Math.min(0.3, (player.def.innateVulnerableChance || 0)
    + 0.06 * (p.huntersmark || 0) + 0.04 * (p.quarrysigil || 0) + 0.06 * (p.wardenseye || 0)
    + 0.08 * (p.branderstag || 0) + 0.07 * (p.snareglyph || 0)

    + (t === 'targetinglattice' ? 0.06 : 0)
    + 0.05 * (p.predatorseye || 0) + 0.03 * (p.ecosystemtotem || 0)
    + (t === 'duskstonemark' ? 0.05 : 0) + (t === 'stonefeathertag' ? 0.05 : 0)

    + (t === 'innocenteyes' ? 0.05 : 0) + (t === 'broodcallbell' ? 0.05 : 0) + (t === 'turretbatterypack' ? 0.05 : 0)

    + 0.05 * (p.mb_markinghex || 0) + (t === 'mbtr_saltedrope' ? 0.05 : 0));

  applySynergyComboFlag(player, 'rotAndRuin');

  player.magnetRadius = Math.min(220, (p.coinmagnet ? 55 + 15 * (p.coinmagnet - 1) : 0)  + (t === 'brokencompass' ? 40 : 0)
    + (t === 'nbtr_packratcharm' ? 40 : 0)
    + 15 * (p.trophy_undertowreaver || 0)
    + (t === 'driftinglodestone' ? 18 : 0)
    + 25 * (p.sk8i_pullstone || 0)
    + 25 * (p.sk11i_pulltotem || 0)
    + (t === 'sk8t_lodestonecharm' ? 30 : 0)

    + (t === 'tidalpull' ? 30 : 0) + (t === 'accretionring' ? 25 : 0) + (t === 'gravitonbead' ? 20 : 0)
    + (t === 'orbitcapture' ? 30 : 0) + (t === 'perigeecharm' ? 20 : 0) + 30 * (p.accretiondisc || 0)
    + 40 * (p.gravitonnet || 0) + 20 * (p.tidallock || 0) + 30 * (p.salvagetractor || 0)
    + 20 * (p.offeringbowl || 0)
    + 20 * (p.solartrinket || 0) + 25 * (p.etchedseal || 0)
     + (t === 'rustedvial' ? 25 : 0) + (t === 'feralboots' ? 30 : 0)
    + (t === 'ivorycompass' ? 25 : 0)
    + 30 * (p.junkyardmagnet || 0) + (t === 'pullstone' ? 40 : 0)
    + (t === 'draweringot' ? 40 : 0) + (t === 'lodestonechip' ? 25 : 0)

    + 20 * (p.masterytrophy_enemiesfrozen_t2 || 0) + 20 * (p.masterytrophy_roomscleared_t1 || 0) + 20 * (p.explorationtrophy_bombbarrel || 0)

    + (t === 'pullbead' ? 25 : 0)

    + (t === 'hummingstone' ? 30 : 0) + (t === 'graspingcoil' ? 30 : 0) + (t === 'graspingstone' ? 30 : 0)
    + (t === 'ruinouschip' ? 25 : 0) + (t === 'hummingsprocket' ? 35 : 0) + (t === 'fourleafstone' ? 25 : 0)
    + (t === 'rendingwhorl' ? 20 : 0) + (t === 'clangingchip' ? 25 : 0) + (t === 'graspingcasing' ? 20 : 0)

     + 25 * (p.beckoningcirclet || 0) + 25 * (p.runiccrown || 0)
    + 25 * (p.lodeeffigy || 0) + 30 * (p.hallowedpendant || 0) + 30 * (p.forsakensignet || 0)
    + 30 * (p.beckoningvestment || 0) + 30 * (p.pullingidol || 0)
    + (t === 'lodedrainmagnet' ? 40 : 0) + (t === 'siphonhose' ? 30 : 0)
    + (t === 'eaveperchmark' ? 20 : 0)

    + (t === 'cottoncandytuft' ? 20 : 0) + (t === 'driftingembertrail' ? 20 : 0) + (t === 'combcell' ? 20 : 0)
    + (t === 'toolbeltcharm' ? 20 : 0)

    + 25 * (p.mb_scavengedhook || 0)
    + 25 * (p.mb_ratcatcher || 0) + 20 * (p.mb_tidalcharm || 0) + (t === 'mbtr_hookedchain' ? 25 : 0));

  player.bombRadiusMult = Math.min(2.5, 1 + 0.25 * (p.bombrangeup || 0)  + 0.15 * (p.moonlitpetal || 0)
    + 0.12 * (p.nbat_powderhorn || 0)
    + 0.10 * (p.sk8i_bombshell || 0)
    + 0.12 * (p.sk11i_bombward || 0)

    + (t === 'impactorfuse' ? 0.15 : 0) + (t === 'cratercharm' ? 0.1 : 0) + (t === 'airburstcap' ? 0.12 : 0)
    + (t === 'shockfrontchip' ? 0.1 : 0) + (t === 'ejectapebble' ? 0.1 : 0)
    + 0.10 * (p.sanctifiedwax || 0)
     + (t === 'sootyfeather' ? 0.10 : 0)

     + 0.25 * (p.rubblerunner || 0)
    + 0.15 * (p.graniteknuckles || 0) + 0.2 * (p.demolitionistsbadge || 0) + 0.3 * (p.rubblekingscrown || 0)
    + 0.3 * (p.worldbreakergauntlet || 0) + 0.2 * (p.blastresistantvest || 0)
    + 0.2 * (p.wanderingchain || 0) + 0.2 * (p.sacredtoken || 0) + 0.1 * (p.jadecrown || 0)
    + 0.2 * (p.forgottenrune || 0) + 0.15 * (p.blessedbell || 0) + (t === 'fadedgauntlet' ? 0.1 : 0)
    + (t === 'coralcrown' ? 0.2 : 0) + (t === 'forgottensigil' ? 0.1 : 0)
    + 0.3 * (p.detonationspecialistbadge || 0) + 0.2 * (p.bouldershoulder || 0) + 0.10 * (p.dragonfirecore || 0)
    + (t === 'cinderkeg' ? 0.15 : 0)
    + (t === 'sk8t_cinderpouch' ? 0.12 : 0)

    + 0.12 * (p.cherrybomb || 0) + 0.10 * (p.sparkfuse || 0) + 0.20 * (p.demolitionrig || 0) + 0.20 * (p.blastmaster || 0)

    + (t === 'powderhorn' ? 0.15 : 0) + (t === 'fusedcasing' ? 0.10 : 0) + (t === 'blastwidener' ? 0.12 : 0)

    + 0.1 * (p.masterytrophy_turretsdestroyed_t1 || 0) + 0.1 * (p.masterytrophy_roomscleared_t2 || 0) + 0.1 * (p.explorationtrophy_pushablebombbarrel || 0)

    + (t === 'kegchip' ? 0.12 : 0)

    + (t === 'fumingkeg' ? 0.15 : 0) + (t === 'scatteringhorn' ? 0.2 : 0) + (t === 'blastwidewick' ? 0.1 : 0)
    + (t === 'rosykeg' ? 0.1 : 0) + (t === 'roaringtally' ? 0.08 : 0) + (t === 'roaringposy' ? 0.08 : 0)
    + (t === 'blastwideplate' ? 0.08 : 0) + (t === 'graspingcasing' ? 0.1 : 0)

    + 0.1 * (p.runicpendant || 0)  + 0.1 * (p.weatheredcharm || 0)
     + 0.15 * (p.scatteringrelic || 0) + 0.2 * (p.sleetedcirclet || 0)
    + (t === 'methanepocket' ? 0.20 : 0) + (t === 'brazilnutcharge' ? 0.15 : 0) + (t === 'sludgecharge' ? 0.25 : 0)

    - 0.15 * (p.masterytrophy_bombsplaced_t2 || 0)

    + (t === 'pressuregauge' ? 0.10 : 0)
    + 0.12 * (p.trophy_ventmatriarch || 0)

    + (t === 'fuseloopcharm' ? 0.10 : 0) + (t === 'shrapnelband' ? 0.08 : 0) + (t === 'emberkegtoken' ? 0.06 : 0)

    + 0.15 * (p.mb_widefuse || 0));

  player.bombDamageMult = 1 + 0.20 * (p.cracklingfuse || 0) + 0.35 * (p.ironpowderkeg || 0)
    + 0.12 * (p.volatilecatalyst || 0) + 0.10 * (p.detonatorscoil || 0)
    + 0.10 * (p.nbat_powderhorn || 0)
    + 0.15 * (p.trophy_ashencolossus || 0)

    + (t === 'cinderfusewick' ? 0.15 : 0) + (t === 'fuseloopcharm' ? 0.12 : 0) + (t === 'shrapnelband' ? 0.10 : 0)
    + (t === 'powderscar' ? 0.18 : 0) + (t === 'detonationspike' ? 0.12 : 0) + (t === 'blastrunnerscoil' ? 0.10 : 0)
    + (t === 'sootybarrelchip' ? 0.14 : 0) + (t === 'emberkegtoken' ? 0.10 : 0)

    + 0.15 * (p.mb_hotpowder || 0) + 0.10 * (p.mb_ironbarrel || 0) + (t === 'mbtr_gnarledtwig' ? 0.10 : 0);

  player.tearFlags.pierce = (p.piercingshot || 0)  + (p.spiderring || 0) + (t === 'ironfilings' ? 1 : 0)
    + (p.sk8i_hawkloupe || 0)
    + (p.sk11i_direarrow || 0)
    + 1 * (p.whisperingband || 0)
    + 1 * (p.sacredsash || 0) + (t === 'ancienthoofguard' ? 1 : 0) + (t === 'moltencoin' ? 1 : 0)
    + (t === 'crackedcoin' ? 1 : 0) + (t === 'piercingneedle' ? 1 : 0)
    + (t === 'sk8t_awlspike' ? 1 : 0)
    + (p.endlessquiver || 0) + (p.barragecore || 0)
    + (t === 'awlneedle' ? 1 : 0)

    + (t === 'threadingbodkin' ? 1 : 0)

    + (p.threadingcrown || 0) + (p.boringpendant || 0) + (p.hallowedsignet || 0)
    + (p.asheneffigy || 0)
    + (t === 'rustedharpoon' ? 1 : 0)

    + 1 * (p.mb_needlebolt || 0);

  player.tearFlags.homing = (p.haloguidance || 0) + (p.hexedtracker || 0) + (p.deadeyelens || 0) + (t === 'lodestarsight' ? 1 : 0)
    + (p.nbat_ropedgrapple || 0)

    + (t === 'trackingwhisker' ? 1 : 0)
    + (t === 'trackerbeetle' ? 1 : 0)

    + 1 * (p.mb_trackingrune || 0);
  player.tearFlags.spectral = (p.prismveil || 0) + (p.wraithrounds || 0) + (t === 'ghostquill' ? 1 : 0)
    + (p.nbat_hollowlens || 0)

    + (t === 'mistypane' ? 1 : 0)
    + (t === 'mistbolt' ? 1 : 0)

    + 1 * (p.mb_ghostbolt || 0) + (t === 'mbtr_wispcatcher' ? 1 : 0);
  player.tearFlags.explosive = (p.radiantburst || 0) + (p.brimstonevial || 0) + (t === 'blastcapseed' ? 1 : 0)
    + (p.nbat_cinderpayload || 0)

    + (t === 'fulminatenut' ? 1 : 0)

    + (p.blastcapreliquary || 0) + (p.ashenreliquary || 0) + (p.crackedrune || 0)
    + (p.poppingtalisman || 0)
    + (t === 'seedpodshell' ? 1 : 0)

    + 1 * (p.mb_powderbolt || 0) + 1 * (p.mb_emberseal || 0);

  player.tearFlags.sizeMult = 1;
  player.tearFlags.shape = null;

  player.tearFlags.chainLightning = 0;
  player.tearFlags.splitOnHit = 0;
  player.tearFlags.knockbackPulse = 0;

  player.tearFlags.tearShield = 0;
  player.tearFlags.pullPulse = 0;
  player.tearFlags.chaosStatus = 0;
  player.tearFlags.creepOnHit = 0;
  let tearShapePriority = -1;
  for (const it of ITEM_LIST) {
    if (!it.tearEffect) continue;
    const teCount = p[it.id] || 0;
    if (teCount <= 0) continue;
    const te = it.tearEffect;
    if (te.flag === 'sizeMult') {
      player.tearFlags.sizeMult += (te.amount || 0) * teCount;
    } else if (te.flag === 'shape') {

      const pri = SHAPE_PRIORITY[te.shape] || 0;
      if (pri > tearShapePriority) { player.tearFlags.shape = te.shape; tearShapePriority = pri; }
    } else {
      player.tearFlags[te.flag] = (player.tearFlags[te.flag] || 0) + (te.amount != null ? te.amount : 1) * teCount;
    }
  }
  player.tearFlags.sizeMult = Util.clamp(player.tearFlags.sizeMult, 0.5, 2.5);

  player.tearFlags.tearShield = Util.clamp(player.tearFlags.tearShield, 0, 0.75);

  for (const it of ITEM_LIST) {
    if (!it.grantAttack) continue;
    if ((p[it.id] || 0) <= 0) continue;
    const flags = Array.isArray(it.grantAttack) ? it.grantAttack : [it.grantAttack];
    for (const f of flags) player[f] = true;

    if (player.crystalVolley && !(player.crystalShardCount > 0)) {
      player.crystalShardCount = 3;
      player.crystalVolleySpacing = player.crystalVolleySpacing || CRYSTAL_VOLLEY_SPACING_DEFAULT;
    }
    if (player.charged && !(player.chargeTime > 0)) player.chargeTime = 0.5;
  }

  player.multishotExtra = Math.min(4, (p.multishot || 0) + (p.doublebarrel || 0) + (t === 'silverbell' ? 1 : 0)

    + 2 * (p.mb_talonshot || 0) + 3 * (p.martyrsvow || 0) + 4 * (p.nbat_berserkersbrand || 0)
    + (p.sk8i_doubleshot || 0)
    + (t === 'sk8t_twinnotch' ? 1 : 0)

    + (t === 'twinnedchime' ? 1 : 0)
    + (t === 'tripleoutfall' ? 1 : 0)

    + 1 * (p.mb_twinbolt || 0) + 1 * (p.mb_splitshot || 0));

  player.dodgeChance = Math.min(0.6, Math.max(0,
    0.10 * (p.guardianhalo || 0)  + 0.06 * (p.wingedgrace || 0) + 0.05 * (p.gildedwing || 0)
    + (t === 'nbtr_downysoot' ? 0.04 : 0)
    + 0.03 * (p.trophy_bellcaster || 0)
    + (t === 'stalwartbuckle' ? 0.03 : 0)
    + 0.05 * (p.sk8i_swiftdodge || 0)

    + (t === 'phaseveil' ? 0.06 : 0) + (t === 'eventshoreveil' ? 0.05 : 0) + (t === 'umbralshroud' ? 0.06 : 0)
    + (t === 'slipstreamsash' ? 0.05 : 0) + (t === 'nulltrace' ? 0.05 : 0) + 0.08 * (p.phaseshiftmantle || 0)
    + 0.06 * (p.umbralcloak || 0) + 0.08 * (p.eventhorizonveil || 0) + 0.05 * (p.vacuumshroud || 0)
    + 0.06 * (p.nebulaveil || 0)
    + (t === 'crackedhoofprint' ? 0.05 : 0) + (t === 'goldenfeather' ? 0.05 : 0)

     + 0.08 * (p.charmbracelet || 0) + 0.08 * (p.doomwalkerscloak || 0)
    + 0.08 * (p.antiturretplating || 0) + 0.08 * (p.sentrywreckersfist || 0) + 0.06 * (p.hardenedscales || 0)
    + 0.05 * (p.moonkissedpelt || 0) + (t === 'nimbleanklet' ? 0.05 : 0)
    + (t === 'sk8t_eelskinwrap' ? 0.05 : 0)
    + (t === 'duskveil' ? 0.05 : 0)

    + (t === 'ghostingcloak' ? 0.06 : 0) + (t === 'fainthem' ? 0.05 : 0) + (t === 'shiftingveil' ? 0.07 : 0)
    + (t === 'horizonveil' ? 0.04 : 0) + (t === 'sweethem' ? 0.04 : 0) + (t === 'acridveil' ? 0.04 : 0)

      + 0.04 * (p.ghostingcharm || 0)
    + 0.05 * (p.sunkenidol || 0) + 0.06 * (p.forsakenlocket || 0) + 0.06 * (p.feintingsigil || 0)
    + 0.06 * (p.monarchbracer || 0)
    + (t === 'eelskinwrap' ? 0.06 : 0) + (t === 'mistcloak' ? 0.05 : 0) + (t === 'leafveil' ? 0.07 : 0)

    - 0.04 * (p.crackedcloak || 0) - 0.04 * (p.hallowedpendant || 0)

    - (player.activeItem && player.activeItem.id === 'blinkcrystal' ? 0.06 : 0)
    + (t === 'rooststonebead' ? 0.08 : 0) + (t === 'hollowstonecoin' ? 0.04 : 0)

    + (t === 'drakeflamecinder' ? 0.08 : 0) + (t === 'sugarspun' ? 0.08 : 0) + (t === 'queensveil' ? 0.08 : 0)
    + (t === 'weldedbrace' ? 0.08 : 0) + (t === 'glowingcoalcharm' ? 0.04 : 0) + (t === 'juicejuicebox' ? 0.04 : 0)
    + (t === 'socketcharm' ? 0.04 : 0)

    + 0.04 * (p.mb_featherstep || 0) + 0.06 * (p.mb_evasivecharm || 0)
    + 0.03 * (p.mb_brawlersgrit || 0) + (t === 'mbtr_hollowedbone' ? 0.05 : 0)
  ));

  applySynergyComboFlag(player, 'marksmansEye');

  player.critMultiplier = Math.min(4, 2 + 0.5 * (p.razorfocus || 0) + 0.3 * (p.razorwing || 0) + (t === 'steadyhand' ? 0.5 : 0)
    + 0.25 * (p.nbat_twinstrike || 0) + (t === 'nbtr_glimmerscale' ? 0.15 : 0)
    + 0.2 * (p.trophy_pressurewraith || 0)
    + 0.3 * (p.sk8i_sharpwhet || 0)
    + (t === 'sk8t_ricochetcoil' ? 0.4 : 0)

    + (t === 'killshotcalibrator' ? 0.5 : 0) + (t === 'penetratorcore' ? 0.3 : 0)
    + 0.2 * (p.executionersfocus || 0) + 0.4 * (p.deathsprecisionblade || 0)

    + (t === 'splittingrift' ? 0.4 : 0) + (t === 'deeprift' ? 0.3 : 0) + (t === 'ruinouschip' ? 0.3 : 0)
    + (t === 'viciouschit' ? 0.3 : 0) + (t === 'rendingwhorl' ? 0.2 : 0) + (t === 'skimmingrift' ? 0.2 : 0)

    + 0.2 * (p.heavyamulet || 0)  + 0.2 * (p.splittingrelic || 0)
    + 0.4 * (p.deepgauntlet || 0)
    + (t === 'bassdropcore' ? 0.5 : 0) + (t === 'talonpick' ? 0.3 : 0)

    + (t === 'droneflight' ? 0.3 : 0) + (t === 'calibratedlens' ? 0.3 : 0)
    + comboBonus(player, 'marksmansEye', 'critMultiplier')

    + 0.25 * (p.mb_deadlyaim || 0) + (t === 'mbtr_snappedbrand' ? 0.18 : 0));
  player.canFly = player.def.canFly || (p.borrowedwings || 0) > 0 || t === 'kitestring' || (p.mb_lightwing || 0) > 0;

  player.dealDiscount = Math.min(1, (t === 'pawnbrokerschit' ? 0.5 : 0)
    + 0.05 * (p.trophy_lightlessmarshal || 0)

    + (t === 'signedcontract' ? 0.5 : 0)

    + 0.5 * (p.hallowedbracer || 0)
    + (t === 'drownedcontract' ? 0.5 : 0)

    + 0.15 * (p.mb_haggler || 0));

  player.shopDiscountBonus = Math.min(0.5, 0
    + (t === 'nbtr_pennywhistle' ? 0.08 : 0)
    + 0.05 * (p.sk11i_coinpurse || 0)

    + (t === 'bartertoken' ? 0.05 : 0) + (t === 'freightmanifest' ? 0.05 : 0)

     + 0.1 * (p.vipmembershipcard || 0)
    + 0.1 * (p.merchantsbestfriendbadge || 0) + 0.05 * (p.masterkeyring || 0) + 0.05 * (p.discountcharm || 0)
    + (t === 'sk8t_hagglerspurse' ? 0.08 : 0)
    + (t === 'hagglerstag' ? 0.1 : 0)

    + (t === 'pennychit' ? 0.08 : 0) + (t === 'thriftledger' ? 0.1 : 0) + (t === 'dotingvoucher' ? 0.06 : 0)
    + (t === 'tollingstub' ? 0.06 : 0) + (t === 'colossusstub' ? 0.06 : 0) + (t === 'anchoredchit' ? 0.06 : 0)
    + (t === 'hagglersplinter' ? 0.06 : 0)

    + 0.05 * (p.ashensigil || 0) + 0.05 * (p.ashensignet || 0) + 0.05 * (p.couponcloak || 0)
    + 0.05 * (p.weatheredcrown || 0) + 0.08 * (p.couponvestment || 0) + 0.08 * (p.pennylocket || 0)
    + 0.05 * (p.runicamulet || 0) + 0.05 * (p.sunkensigil || 0)
    + (t === 'scavengerstoken' ? 0.10 : 0) + (t === 'barterbead' ? 0.08 : 0)
    + 0.05 * (p.tithepurse || 0)
    + 0.05 * (p.vaultcrackerskit || 0)
    + (t === 'threadbarepurse' ? 0.05 : 0)
    + (t === 'emptycreel' ? 0.05 : 0)
    + (t === 'emptylenscase' ? 0.05 : 0)
    + (t === 'emptygearbox' ? 0.05 : 0)
    + (t === 'hollowdriftpouch' ? 0.05 : 0)
    + (t === 'emptyeventpurse' ? 0.05 : 0)

    + (t === 'blueprintledger' ? 0.05 : 0) + (t === 'waxwingcharm' ? 0.05 : 0)

    + 0.05 * (p.mb_merchantsfriend || 0) + 0.05 * (p.mb_dogeared || 0) + (t === 'mbtr_copperclasp' ? 0.06 : 0));

  player.curseImmune = (p.holywater || 0) > 0 || t === 'blessedcenser' || (p.mb_wardedcharm || 0) > 0;

  player.attackLayers = [];
  for (const it of ITEM_LIST) {
    if (!it.attackLayer) continue;
    const count = p[it.id] || 0;
    if (count > 0) player.attackLayers.push(Object.assign({ itemId: it.id, count }, it.attackLayer));
  }

  applySkillTreeStatBonuses(player);

  applyItemComboSynergies(player);

  let winningStatus = null, winningChance = 0;
  for (const field of STATUS_EXCLUSIVITY_FIELDS) {
    const v = player[field] || 0;
    if (v > winningChance) { winningChance = v; winningStatus = field; }
  }
  player.primedStatus = winningStatus;
  player.tearColor = winningStatus ? STATUS_TEAR_COLORS[winningStatus] : null;
}

const STATUS_TEAR_COLORS = {
  freezeChance: '#8fe8ff',
  stunChance: '#ffe066',
  vulnerableChance: '#ff5c5c',
  charmChance: '#ff9edb',
  fearChance: '#b28dff',
  venomChance: '#7cff6b'
};

const STATUS_EXCLUSIVITY_FIELDS = ['freezeChance', 'stunChance', 'vulnerableChance', 'charmChance', 'fearChance', 'venomChance'];

function rollTearStatus(player) {
  const hits = [];
  for (const field of STATUS_EXCLUSIVITY_FIELDS) {
    const chance = player[field] || 0;
    if (chance > 0 && RNG.random() < chance) hits.push(field);
  }
  return hits;
}

const STATUS_CHANCE_CAPS = {"venomChance":0.35,"stunChance":0.2,"charmChance":0.25,"freezeChance":0.25,"fearChance":0.3,"vulnerableChance":0.3};

const STATUS_GRANTING_ITEMS = {
  venomChance: { items: ["venom","plaguebreath","nbat_venomcask","trophy_reefwraith","sk8i_venomthorn","sk11i_witheredfang","ionbloomcanister","hollowcompass","roaringcoin","ancientring","venomouskiss","masterytrophy_shotsfired_t1","masterytrophy_itemscollected_t2","explorationtrophy_turrets","ashentalisman","weatheredreliquary","forsakenamulet","sunkenmantle","ashencrown","ancientmantle","plaguebud","witherpetal","plaguebloom","rotcrown","ecosystemtotem","mb_toxinvial","mb_serpentfang","mb_snakeoil","mb_alchemistmix","stormwhistle","obsidianwisp","ambersigil","duskyboots","roaringanklet"], trinkets: ["emberdust","hexbanechain","sk8t_direstingpin","ionbloomvial","vividseal","mysticfeather","twilightorb","venomvial","blightedthorn","toxicbead","seepingvial","blightbead","tainteddrop","septicfang","blightedampule","acridtrefoil","biliousbarb","septicspur","bilioustoken","acridveil","sewergasvial","chippedgargle","pigtailbow","embercoal","waxsealcharm","copperwiring","mbtr_briarwreath"] },
  stunChance: { items: ["hardhitter","directmalice","trophy_siltwarden","sk11i_hexbead","shockfrontemitter","whisperingidol","coralinsignia","gleaminghoofguard","shockcollar","masterytrophy_shotsfired_t2","masterytrophy_trinketsequipped_t1","explorationtrophy_turretw","weatheredidol","tollinglocket","hallowedrelic","feintingsigil","leadenbracer","mb_concussivehoof","mb_thunderclap","mb_moltenshard","mb_beartrap","mb_alchemistmix","obsidiantalisman","roaringrune","radiantquill","mysticgauntlet","polishedcloak"], trinkets: ["frostedpetal","concussionwave","emeraldchain","thundercompass","copperbadge","stunbadge","concussivebell","ringingchime","stunningclasp","knellchime","concussiveslug","leadenchime","ringinghammer","glidingclapper","concussivelace","clangingquill","jarringlace","tollingstub","dulldram","tollingribbon","clangingchip","concussiveescapement","floodstunner","cracklecharm","flatlinedcoil","brackishvariant","astralbeaconchit","meridiansummonschit","zenithsummonschit","voidsummonschit","nullsummonschit","eventsummonschit","smolderingtag","friendshipbracelet","hivemindtoken","boltcutter","mbtr_thornbangle"] },
  charmChance: { items: ["sk8i_charmreed","flirtatious","envyshard","mysticcloak","emeraldfeather","ancienttrinket","mesmerizingveil","masterytrophy_obstaclesdestroyed_t1","masterytrophy_trinketsequipped_t2","explorationtrophy_turretplus","ashensigil","fondsignet","reaperreliquary","runicamulet","mb_sweettalker","mb_hexedbell","forgottenemblem","widecirclet","weatheredgauntlet","scatteringeffigy","wispinggauntlet"], trinkets: ["lovecharm","sirensignal","jadewisp","emberbauble","radiantring","charmedlocket","sweettalkpin","doeeyedcharm","honeyedtoken","sirenpin","adoringpetal","velvetposy","fondribbon","rosykeg","dotingvoucher","roaringposy","sweethem","airylocket","adoringwisp","dotingrivet","adoringcoil","crimsonposy","fondedge","tollingribbon","sambaflower","candyheartlocket","hivenestcharm","mbtr_stillwaterdrop"] },
  freezeChance: { items: ["nbat_freezingtotem","sk8i_frostspindle","coldheart","frostbite","cryogenicround","frozenthorn","braidedinsignia","stormseal","frostboundcloak","masterytrophy_obstaclesdestroyed_t2","masterytrophy_familiarscollected_t1","explorationtrophy_turretx","gildedcrown","numbingmantle","sleetedcirclet","crackedpendant","mb_frostbite","mb_glacialtouch","mb_frostbrand","mb_stormlantern","thundercloak","goldenboots","shadowsigil","weatheredquill","amberhorseshoe"], trinkets: ["staticcharm","absolutezerobead","silvermirror","coralrune","silveranklet","frostneedle","rimefrostcharm","hoarfrostbead","chillsplinter","glacialpin","sk8t_rimeclasp","rimebead","rimedbead","rimedlattice","frostbitflake","lightlattice","frostbittag","whisperingnail","frostbitplume","hagglersplinter","meltwaterbead","flickerband","brightringtag","glitterdust","royalnectarvial","mbtr_frostedcoin"] },
  fearChance: { items: ["terrifying","despairtoken","trophy_drownedbellringer","sk11i_duskveil","paleinsignia","ironprism","dreadcloak","masterytrophy_enemiesfrozen_t1","masterytrophy_familiarscollected_t2","explorationtrophy_turrettarget","crackedamulet","sunkenmantle","howlingreliquary","titanlocket","shudderinglocket","grislycloak","longeffigy","mb_direhowl","mb_widowsveil","mb_direwolfpelt","mb_stormlantern","pallidcirclet","ancientrune","pullingsignet","hallowedlocket","viciousrune"], trinkets: ["spectralveil","darkmatterdread","twilightamulet","obsidianamulet","dreadfulmask","grimwhisper","hollowmask","shudderstone","dreadbead","keeningrattle","shudderingmask","pallidwail","dreadfang","whisperingfleck","dreadtag","whisperingnail","howlermask","gargoylewhisper","hollowflamewick","lollipoptrinket","mbtr_shudderingveil"] },
  vulnerableChance: { items: ["huntersmark","quarrysigil","wardenseye","branderstag","snareglyph","predatorseye","ecosystemtotem","mb_markinghex"], trinkets: ["targetinglattice","duskstonemark","stonefeathertag","innocenteyes","broodcallbell","turretbatterypack","mbtr_saltedrope"] },
};
