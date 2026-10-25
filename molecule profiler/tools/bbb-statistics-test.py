import importlib.util,math,json,hashlib
from pathlib import Path
from scipy.stats import binomtest
root=Path(__file__).resolve().parents[1];spec=importlib.util.spec_from_file_location('stats',root/'tools/bbb-statistics.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
for win,loss in [(0,0),(0,10),(1,9),(5,5),(21,11)]:
 r=s.mcnemar_exact([True]*win+[False]*loss,[False]*win+[True]*loss);expected=binomtest(win,win+loss,.5).pvalue if win+loss else 1
 assert math.isclose(r['pValue'],expected,abs_tol=1e-14)
rows=[dict(scaffold=str(y),observed=y,modelPrediction=y,passivePrediction=y,modelProbability=float(y)) for y in [0,0,1,1]]
r=s.paired_scaffold_intervals(rows,resamples=200);assert r['deltaBalancedAccuracy']==dict(estimate=0.,lower=0.,upper=0.);assert r['mcnemar']['pValue']==1.;assert r['bootstrap']['discardedSingleClassResamples']>0
for name in ['model','passive']:assert r[name]['balancedAccuracy']==dict(lower=1.,upper=1.)
report=json.loads((root/'validation/bbb-research-model.json').read_text());pairs=json.loads((root/'validation/bbb-heldout-predictions.json').read_text())
assert report['statisticsCodeSha256']==hashlib.sha256((root/'tools/bbb-statistics.py').read_bytes()).hexdigest();assert report['pairedPredictionsSha256']==hashlib.sha256((root/'validation/bbb-heldout-predictions.json').read_bytes()).hexdigest()
assert len(pairs['rows'])==report['fullTest']['n'];assert pairs['threshold']==report['threshold']
for key,subset in [('fullMatched',[r for r in pairs['rows'] if r['passiveStatus']=='scored']),('applicableMatched',[r for r in pairs['rows'] if r['passiveStatus']=='scored' and r['applicable']])]:
 out=report['uncertainty'][key];assert out['n']==len(subset);assert out['scaffolds']==len({r['scaffold'] for r in subset});assert out['mcnemar']==s.mcnemar_exact([r['modelPrediction']==r['observed'] for r in subset],[r['passivePrediction']==r['observed'] for r in subset]);assert out['bootstrap']['validResamples']>=1900
 ci=out['deltaBalancedAccuracy'];assert ci['lower']<=ci['upper'];assert out['model']['brier']['lower']<=out['model']['brier']['upper']
print('BBB statistics: exact-binomial parity, paired zero-difference fixture, scaffold resampling, single-class handling and pinned held-out rows passed')
