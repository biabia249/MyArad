import test from 'node:test';
import assert from 'node:assert/strict';
import {itineraryLabel,itineraryBreakdown} from '../src/features/city/route-presentation.ts';
test('driving and cycling never get the walking label when route numbers are absent',()=>{
 assert.equal(itineraryLabel({legs:[{mode:'CAR',route:'',duration:300}]},true),'Mașină');
 assert.equal(itineraryLabel({legs:[{mode:'BICYCLE',route:'',duration:600}]},true),'Bicicletă');
 assert.equal(itineraryLabel({legs:[{mode:'WALK',route:'',duration:90}]},true),'Pe jos');
 assert.equal(itineraryLabel({legs:[{mode:'WALK',route:'',duration:100},{mode:'TRAM',route:'3',duration:900},{mode:'WALK',route:'',duration:80}]},true),'Tramvai 3');
 assert.deepEqual(itineraryBreakdown({legs:[{mode:'WALK',duration:100},{mode:'CAR',duration:300},{mode:'WALK',duration:80}]}),[{mode:'WALK',duration:180},{mode:'CAR',duration:300}]);
});

import {pickModeItinerary} from '../src/features/city/route-presentation.ts';
test('all-mode choices reject pedestrian fallbacks for transit/car and prefer earliest arrival',()=>{
 const walk={endTime:100,legs:[{mode:'WALK',duration:100}]};
 const car={endTime:80,legs:[{mode:'CAR',duration:80}]};
 const tram={endTime:120,legs:[{mode:'WALK',duration:20},{mode:'TRAM',route:'3',duration:70}]};
 const later={endTime:200,legs:[{mode:'BUS',route:'46',duration:50}]};
 assert.equal(pickModeItinerary([walk],'transit'),undefined);
 assert.equal(pickModeItinerary([walk],'driving'),undefined);
 assert.equal(pickModeItinerary([walk,car],'driving'),car);
 assert.equal(pickModeItinerary([later,tram,walk],'transit'),tram);
 assert.equal(pickModeItinerary([walk,car],'walking'),walk);
});
