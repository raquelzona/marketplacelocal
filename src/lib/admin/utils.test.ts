import test from "node:test";import assert from "node:assert/strict";import {cleanSearch,missingMerchantFields,normalizePage,pageRange} from "./utils.ts";
test("normaliza paginação",()=>{assert.equal(normalizePage("3"),3);assert.equal(normalizePage("-1"),1);assert.deepEqual(pageRange(2),{from:20,to:39})});
test("higieniza busca e detecta cadastro incompleto",()=>{assert.equal(cleanSearch(" Loja; DROP "),"Loja DROP");assert.deepEqual(missingMerchantFields({nome_fantasia:"Loja",endereco:"Rua",cidade:"X",bairro:"Y",categoria:"Pet",telefone:"1",email:""}),["email"])});
