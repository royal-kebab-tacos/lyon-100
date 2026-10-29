import {it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {ReliefProfile} from '../src/components/ReliefProfile'
it('discloses unknown terrain and draws gaps instead of connecting across it',()=>{
 const html=renderToStaticMarkup(<ReliefProfile relief={{up:15,down:10,knownMeters:50,totalMeters:100,profile:[{meters:0,elevation:100},{meters:25,elevation:115},{meters:50,elevation:null},{meters:75,elevation:110},{meters:100,elevation:105}]}}/>)
 expect(html).toContain('50 %');expect(html).toContain('Profil incomplet');expect(html.match(/fill="none"/g)).toHaveLength(2)
 const unknown=renderToStaticMarkup(<ReliefProfile relief={{up:0,down:0,knownMeters:0,totalMeters:100,profile:[{meters:0,elevation:null}]}}/>)
 expect(unknown).toContain('Relief indisponible');expect(unknown).not.toContain('D+')
})
