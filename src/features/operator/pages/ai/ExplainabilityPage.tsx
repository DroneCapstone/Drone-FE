import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { OperatorPanel } from '../../components/OperatorPanel';
import { AiPageShell } from './AiPageShell';

export function ExplainabilityPage() {
  const [tab, setTab] = useState('Feature importance');
  return <AiPageShell active="/operator/ai/explainability"><div className="inner-tabs">{['SHAP','Feature importance','Global explanation','Local explanation'].map((item)=><button className={tab===item?'active':''} onClick={()=>setTab(item)} key={item}>{item}</button>)}</div><div className="ai-grid">
    <OperatorPanel title="Why this prediction?" eyebrow={tab.toUpperCase()}><p className="panel-intro">The model expects 28.6% energy consumption. These factors had the strongest impact on the result.</p><div className="feature-bars">{[['Payload weight',82,'increase'],['Headwind',64,'increase'],['Route distance',58,'increase'],['Battery health',43,'decrease'],['Cruise altitude',31,'increase']].map(([label,value,direction])=><div key={String(label)}><span>{label}<small>{direction==='increase'?'+':'−'}{Math.round(Number(value)/7)}%</small></span><div><i className={direction==='decrease'?'decrease':''} style={{width:`${value}%`}}/></div></div>)}</div></OperatorPanel>
    <OperatorPanel title="Model reasoning"><div className="reasoning-block"><p>The <strong>4.8 kg payload</strong> and moderate coastal headwind increase expected energy use. Healthy battery cells and a direct route offset part of that demand.</p></div><div className="explanation-callout"><strong>Key takeaway</strong><p>Reducing payload by 0.8 kg would lower predicted consumption by approximately 3.1%.</p><NavLink to="/operator/ai/simulation">Test this scenario</NavLink></div></OperatorPanel>
  </div></AiPageShell>;
}
