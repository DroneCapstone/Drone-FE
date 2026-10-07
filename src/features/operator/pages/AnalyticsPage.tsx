import { useState } from 'react';
import { ActionButton } from '../../../components/ui/ActionButton';
import { AreaChart } from '../components/AreaChart';
import { MetricCard } from '../components/MetricCard';
import { MissionTable } from '../components/MissionTable';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';
import { useMissionListQuery } from '../hooks/useMissionQueries';

export function AnalyticsPage() {
  const [tab, setTab] = useState('Operational KPI');
  const { data: missions = [] } = useMissionListQuery();
  return <><PageHeader section="analytics" action={<><ActionButton variant="secondary">Export CSV</ActionButton><ActionButton variant="secondary">Sep 01 — Sep 15</ActionButton></>}/><div className="inner-tabs analytics-tabs">{['Operational KPI','Energy trend','Route comparison','Historical analysis'].map((item)=><button className={tab===item?'active':''} onClick={()=>setTab(item)} key={item}>{item}</button>)}</div><div className="metric-grid"><MetricCard label="On-time completion" value="94.8%" delta="+3.2%" note="Target 92%"/><MetricCard label="Avg. turnaround" value="18m 24s" delta="−8.4%" note="2m faster than target"/><MetricCard label="Energy / km" value="1.42 Wh" delta="−4.1%" note="Fleet-wide average"/><MetricCard label="Incident rate" value="0.7%" delta="−0.3%" note="9 incidents / 1,284 flights"/></div><div className="analytics-grid"><OperatorPanel title={tab} eyebrow="PERFORMANCE TREND" action={<div className="chart-key"><span><i/>Current</span><span><i/>Target</span></div>}><div className="chart-summary"><strong>{tab==='Energy trend'?'1.42 Wh':'94.8%'}</strong><span>fleet average</span></div><AreaChart orange variant={tab==='Energy trend'?'energy':'performance'} unit={tab==='Energy trend'?'Wh / km':'percent'} yLabels={tab==='Energy trend'?['1.8','1.6','1.4','1.2']:['100','95','90','85']} pointLabel={`${tab} at Sep 13`}/><div className="chart-labels"><span>Sep 01</span><span>Sep 04</span><span>Sep 07</span><span>Sep 10</span><span>Sep 13</span><span>Sep 15</span></div></OperatorPanel><OperatorPanel title="Route performance" eyebrow="TOP 5 ROUTES"><div className="rank-list">{[['R-04 Coastal','96.2%'],['R-17 Express','93.8%'],['R-08 Urban','91.4%'],['R-02 River','89.7%'],['R-12 North','84.5%']].map((row,index)=><span key={row[0]}><b>{index+1}</b><span><strong>{row[0]}</strong><i><em style={{width:row[1]}}/></i></span><strong>{row[1]}</strong></span>)}</div></OperatorPanel></div><OperatorPanel title="Fleet performance detail" className="flush-panel"><MissionTable compact items={missions}/></OperatorPanel></>;
}
