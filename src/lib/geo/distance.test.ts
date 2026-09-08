import test from "node:test";import assert from "node:assert/strict";import {distanceKm,formatDistance,sortByDistance} from "./distance.ts";
test("calcula e formata distância com Haversine",()=>{const km=distanceKm({latitude:-23.5505,longitude:-46.6333},{latitude:-23.5614,longitude:-46.6565});assert.ok(km&&km>2&&km<3);assert.match(formatDistance(km)??"",/km$/)});
test("ordena coordenadas e deixa fallback por último",()=>{assert.deepEqual(sortByDistance([{id:1,distanceKm:null},{id:2,distanceKm:1.2},{id:3,distanceKm:.4}]).map(x=>x.id),[3,2,1])});
test("coordenada inválida usa fallback",()=>{assert.equal(distanceKm({latitude:100,longitude:0},{latitude:0,longitude:0}),null)});
