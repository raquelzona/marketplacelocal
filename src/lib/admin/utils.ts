export const PAGE_SIZE=20;
export function normalizePage(value?:string){const page=Number(value);return Number.isInteger(page)&&page>0?page:1}
export function pageRange(page:number,size=PAGE_SIZE){return {from:(page-1)*size,to:page*size-1}}
export function cleanSearch(value?:string){return (value??"").replace(/[^\p{L}\p{N}\s@._-]/gu,"").trim().slice(0,80)}
export function missingMerchantFields(merchant:Record<string,unknown>){return ["nome_fantasia","endereco","cidade","bairro","categoria","telefone","email"].filter(field=>!String(merchant[field]??"").trim())}
