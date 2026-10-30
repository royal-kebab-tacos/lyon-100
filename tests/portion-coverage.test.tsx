import {it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {PortionCoverage} from '../src/components/PortionCoverage'
import type {Segment} from '../src/types'
const segment={lengthMeters:10} as Segment
it('shows the remaining fraction without treating a 95% completed street as full coverage',()=>{
 const html=renderToStaticMarkup(<PortionCoverage segment={segment} ranges={[[0,.96]]}/> )
 expect(html).toContain('9,6 m parcourus');expect(html).toContain('0,4 m restants')
 expect(html).toContain('ne valide pas toute sa surface')
})
it('does not display a positive tiny remainder as zero and identifies exclusions',()=>{
 expect(renderToStaticMarkup(<PortionCoverage segment={segment} ranges={[[0,.999]]}/>)).toContain('moins de 0,1 m restants')
 const excluded=renderToStaticMarkup(<PortionCoverage segment={segment} excluded/>)
 expect(excluded).toContain('Exclue de votre objectif');expect(excluded).not.toContain('m restants')
})
