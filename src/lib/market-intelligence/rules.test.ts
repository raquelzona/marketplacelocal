import assert from "node:assert/strict";
import test from "node:test";
import { buildRecommendation, classifyGap, confidenceForVolume, growthPercentage, trendLabel } from "./rules.ts";

test("calcula crescimento positivo e negativo",()=>{assert.equal(growthPercentage(15,10),50);assert.equal(growthPercentage(5,10),-50)});
test("trata ausência de período anterior sem divisão por zero",()=>{assert.equal(growthPercentage(5,0),null);assert.equal(trendLabel(5,0),"Novo sinal")});
test("detecta demanda alta com oferta baixa",()=>{assert.equal(classifyGap(8,2,4),"high_demand_low_supply")});
test("não recomenda com dados abaixo do limiar",()=>{assert.equal(confidenceForVolume(2),null);assert.equal(buildRecommendation({label:"Teste",demand:2,previousDemand:0,supply:0,kind:"high_demand_low_supply",dimension:"product"}),null)});
test("classifica confiança por volume",()=>{assert.equal(confidenceForVolume(3),"low");assert.equal(confidenceForVolume(10),"medium");assert.equal(confidenceForVolume(20),"high")});
