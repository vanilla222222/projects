// Single-site alternatives describe possible partial conversion. They do not
// establish that the listed site reacts faster or can be isolated selectively.
function reactionSiteAlternatives(ctx, mode) {
  const reducing = mode === 'reduction';
  const reagent = reducing ? ctx.get('borohydride') : ctx.get('pcc') || ctx.get('dmp');
  if (!reagent || ctx.has('strongAcid') || ctx.has('hydroxide') || ctx.has('alanate')) return [];
  if (!reducing && (ctx.has('H2O') || ctx.protic || !ctx.conditions.solvents.includes('dcm'))) return [];
  return ctx.substrates.flatMap(s => {
    if (s.graph.atoms.some(a => a.charge || !['C','O','H','D','F','Cl','Br','I'].includes(a.element))) return [];
    const sites = reducing ? s.info.carbonyls.filter(c => ['aldehyde','ketone'].includes(c.kind)).map(c => ({c:c.c,o:c.o}))
      : s.info.alcohols.filter(a => a.degree <= 2 && rxHydrogens(s.graph,a.c) > 0 && rxNeighbors(s.graph,a.c).filter(n => n.atom.element === 'O').length === 1).map(a => ({c:a.c,o:a.o}));
    if (sites.length < 2 || sites.length > 6 || reducing && s.info.carbonyls.some(c => !['aldehyde','ketone'].includes(c.kind))) return [];
    const outcomes = [];
    sites.forEach(site => {
      const g = rxCloneGraph(s.graph); rxSetOrder(g,site.c,site.o,reducing?1:2); rxsDrop(g,site.c);
      const carbonIndex = s.graph.atoms.findIndex(a => a.id === site.c) + 1;
      const id = 'site-'+mode+'-'+carbonIndex;
      const outcome = rxOutcome(id,(reducing?'Reduce carbonyl':'Oxidize alcohol')+' at carbon '+carbonIndex+' — partial-conversion alternative',
        reducing?'Reduction site alternative':'Oxidation site alternative',g,
        'Only the indicated site is edited to expose a possible partial-conversion product. The other susceptible sites remain available to react.',
        {score:1,consumes:[rxUse(s,1)],warnings:['Competing sites can give mixtures and further conversion. This enumeration supplies no site preference, product ratio, yield or experimentally selective conditions.',
          'Reagent equivalents are not converted into a guarantee of mono-functionalization. Newly formed stereocentres are unspecified.']});
      outcome.site = {atomId:site.c,atomIndex:carbonIndex,substrateSmiles:s.compound.smiles,element:'C',label:'Carbon '+carbonIndex};
      outcome.partialConversion = true;
      if (!outcomes.some(previous => previous.products.some(a => outcome.products.some(b => moleculeSame(a.isomericSmiles||a.smiles,b.isomericSmiles||b.smiles))))) outcomes.push(outcome);
    });
    return outcomes;
  });
}
RX_RULES.push(
 {id:'site-resolved-oxidation',name:'Partial polyol oxidation site alternatives',run:ctx=>reactionSiteAlternatives(ctx,'oxidation'),catalog:{family:'Site alternatives',scope:'Two to six primary/secondary alcohol sites on a neutral C/O/halogen skeleton; PCC or DMP in dry DCM without strong acid/base.',assumptions:['Each alternative represents only one edited site at partial conversion; bulk oxidation remains a separate prediction.'],limitations:['No kinetic selectivity, limiting-equivalent guarantee, product ratio or isolation prediction; competing functional groups require review.'],references:[{title:'McMurry, OpenStax Organic Chemistry 17.7: Oxidation of Alcohols',url:'https://openstax.org/books/organic-chemistry/pages/17-7-oxidation-of-alcohols',kind:'teaching'}]}},
 {id:'site-resolved-reduction',name:'Partial polycarbonyl reduction site alternatives',run:ctx=>reactionSiteAlternatives(ctx,'reduction'),catalog:{family:'Site alternatives',scope:'Two to six aldehyde/ketone sites on a neutral C/O/halogen skeleton with NaBH4, without strong acid/base or LiAlH4.',assumptions:['Each alternative represents a possible one-site partial reduction with no assigned preference.'],limitations:['NaBH4 can reduce multiple carbonyls; one reagent equivalent does not imply one-site selectivity. No stereo-, chemo- or kinetic selectivity is established.'],references:[{title:'McMurry, OpenStax Organic Chemistry 17.4: Alcohols from Carbonyl Compounds',url:'https://openstax.org/books/organic-chemistry/pages/17-4-alcohols-from-carbonyl-compounds-reduction',kind:'teaching'}]}}
);
