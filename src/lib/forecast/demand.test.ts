import test from "node:test";import assert from "node:assert/strict";import {forecastDemand} from "./demand.ts";
test("projeta tendência crescente de forma interpretável",()=>{const result=forecastDemand([2,3,4,5,6,7,8,10]);assert.ok(result);assert.ok(result.forecast7>result.current);assert.equal(result.confidence,"high");assert.ok(result.forecast30)});
test("não inventa previsão sem dados",()=>{assert.equal(forecastDemand([1,1,1]),null);assert.equal(forecastDemand([0,1,0,1]),null)});
