"""Paired scaffold-cluster uncertainty; no tuning on the evaluation set."""
import math
import numpy as np
from sklearn.metrics import roc_auc_score

def mcnemar_exact(model_correct, passive_correct):
 a=np.asarray(model_correct,dtype=bool);b=np.asarray(passive_correct,dtype=bool)
 assert a.shape==b.shape and a.ndim==1
 win=int(np.sum(a&~b));loss=int(np.sum(~a&b));n=win+loss
 p=min(1.0,2*sum(math.comb(n,k) for k in range(min(win,loss)+1))/2**n) if n else 1.0
 return dict(bothCorrect=int(np.sum(a&b)),modelOnlyCorrect=win,passiveOnlyCorrect=loss,bothWrong=int(np.sum(~a&~b)),discordant=n,pValue=p,method='Exact two-sided binomial McNemar',scope='Marginal correctness comparison; not a test of balanced accuracy. Compound pairs are treated as independent, so shared scaffolds limit inferential interpretation. Read the paired scaffold bootstrap delta interval.')

def paired_scaffold_intervals(rows,seed=20261041,resamples=2000):
 assert rows and resamples>=100
 y=np.asarray([r['observed'] for r in rows]);a=np.asarray([r['modelPrediction'] for r in rows]);b=np.asarray([r['passivePrediction'] for r in rows]);p=np.asarray([r['modelProbability'] for r in rows]);assert set(y)=={0,1};assert set(a)<= {0,1} and set(b)<= {0,1}
 groups=sorted({r['scaffold'] for r in rows});ids=np.asarray([groups.index(r['scaffold']) for r in rows]);g=len(groups)
 # Resample entire scaffold groups with replacement; use identical multiplicities
 # for both models. Each sampled group's compounds all remain together.
 rng=np.random.default_rng(seed);weights=rng.multinomial(g,np.full(g,1/g),size=resamples)
 def summed(values):return weights@np.bincount(ids,weights=np.asarray(values,dtype=float),minlength=g)
 pos=summed(y==1);neg=summed(y==0);valid=(pos>0)&(neg>0);n=pos+neg
 def metrics(pred):
  tp=summed((pred==1)&(y==1));tn=summed((pred==0)&(y==0))
  with np.errstate(divide='ignore',invalid='ignore'):
   sensitivity=tp/pos;specificity=tn/neg
   return dict(balancedAccuracy=(sensitivity+specificity)/2,accuracy=(tp+tn)/n,sensitivity=sensitivity,specificity=specificity)
 aa=metrics(a);bb=metrics(b);aa['brier']=summed((p-y)**2)/n
 aa['rocAuc']=np.asarray([roc_auc_score(y,p,sample_weight=w[ids]) if ok else np.nan for w,ok in zip(weights,valid)])
 def intervals(values):return {k:dict(lower=float(np.quantile(v[valid],.025)),upper=float(np.quantile(v[valid],.975))) for k,v in values.items()}
 def ba(pred):return float((np.mean(pred[y==1]==1)+np.mean(pred[y==0]==0))/2)
 delta=aa['balancedAccuracy']-bb['balancedAccuracy'];ci=np.quantile(delta[valid],[.025,.975]);
 return dict(n=len(rows),scaffolds=g,bootstrap=dict(method='Paired scaffold-cluster percentile bootstrap',confidenceLevel=.95,seed=seed,resamples=resamples,validResamples=int(valid.sum()),discardedSingleClassResamples=int((~valid).sum()),scope='Conditional on the fixed split, fitted model, calibration, threshold and applicability rule. Does not include retraining, split-selection or external-population uncertainty.'),model=intervals(aa),passive=intervals(bb),deltaBalancedAccuracy=dict(estimate=ba(a)-ba(b),lower=float(ci[0]),upper=float(ci[1])),mcnemar=mcnemar_exact(a==y,b==y))
