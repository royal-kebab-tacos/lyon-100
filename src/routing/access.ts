import type { Tags } from './types'
const allowed=new Set(['yes','designated','permissive'])
const highways=new Set(['residential','living_street','pedestrian','unclassified','tertiary','secondary','primary','service','footway','path','steps','cycleway','track'])
/** Conservative initial walking profile, separate from the exploration score.
 * Unknown/conditional permissions and separately mapped sidepaths are not routed
 * as carriageways. Never use the score's use_sidepath exception here. */
export function walkingDirections(t:Tags):{forward:boolean;backward:boolean}|null {
 if(blockedWalkingNode(t)||!highways.has(t.highway)||t.area==='yes'||t.foot==='use_sidepath'||t.informal==='yes'||t.construction||t.proposed||t.motorroad==='yes')return null
 if(t.sidewalk==='separate'||t['sidewalk:both']==='separate'||t['sidewalk:left']==='separate'&&t['sidewalk:right']==='separate')return null
 if(Object.keys(t).some(k=>/^(foot|access|oneway)(:.*)?:conditional$/.test(k))||t.opening_hours||t.seasonal==='yes')return null
 if(t.highway==='cycleway'&&!allowed.has(t.foot))return null
 if(t.highway==='track'&&!['grade1','grade2'].includes(t.tracktype))return null
 const access=t.foot??t.access
 if(access!==undefined&&!allowed.has(access))return null
 if(t.highway==='service'&&(!allowed.has(access)||['parking_aisle','driveway','drive-through','emergency_access'].includes(t.service)))return null
 if(['bad','horrible','very_horrible','impassable'].includes(t.smoothness)||t.sac_scale&&t.sac_scale!=='hiking')return null
 const one=t['oneway:foot']
 if(one!==undefined&&!['yes','1','true','no','0','false','-1'].includes(one))return null
 // Generic oneway on walking paths is ambiguous: omit until inspected.
 if(one===undefined&&['footway','path','steps','pedestrian'].includes(t.highway)&&t.oneway&&!['no','0','false'].includes(t.oneway))return null
 const direction=(key:string)=>t[key]===undefined||allowed.has(t[key])
 const forward=one!=='-1'&&direction('foot:forward'),backward=!['yes','1','true'].includes(one)&&direction('foot:backward')
 return forward||backward?{forward,backward}:null
}
export function blockedWalkingNode(t:Tags):boolean {
 if(t.locked==='yes'||t.opening_hours||t.seasonal==='yes'||Object.keys(t).some(k=>/^(foot|access)(:.*)?:conditional$/.test(k)))return true
 const access=t.foot??t.access
 if(access!==undefined)return !allowed.has(access)
 // Unknown barriers fail closed; bollards and kerbs do not normally obstruct a runner (not a wheelchair profile).
 return Boolean(t.barrier&&!['no','entrance','bollard','kerb'].includes(t.barrier))
}
