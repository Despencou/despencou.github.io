const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse,matchesCoupon}=require('../coupon-parser.js');
const offer={kind:'offer',store:'Mercado Livre',url:'https://meli.la/example'};
test('recognizes plain or instructed coupon lines and optional ticket emoji',()=>{
 for(const line of ['🎟️Cupom: VALEMAIS','Use o cupom: VALEMAIS','🎟️ Cupom: VALEMAIS','Cupom：VALEMAIS','Cupom:\nVALEMAIS']){
  assert.equal(matchesCoupon({...offer,description:line},'valemais','Mercado Livre'),true,line);
 }
});
test('does not match partial coupon codes or a different store',()=>{
 const item={...offer,code:'FULL1510'};
 assert.equal(matchesCoupon(item,'FULL15','Mercado Livre'),false);
 assert.equal(matchesCoupon(item,'FULL1510','Shopee'),false);
 assert.equal(matchesCoupon({...item,kind:'coupon'},'FULL1510','Mercado Livre'),false);
});
test('matches any explicitly posted alternative code',()=>{
 const item={...offer,description:'Use o cupom: PRIMEIRO ou SEGUNDO'};
 assert.equal(matchesCoupon(item,'SEGUNDO','Mercado Livre'),true);
});
test('instructions and coupon redemption links do not invent coupon codes',()=>{
 assert.equal(matchesCoupon({...offer,description:'🎟️Resgate o cupom na página do produto (próximo ao preço), desconto na finalização.'},'Resgate','Mercado Livre'),false);
 const item={...offer,description:'Resgate o cupom\nhttps://meli.la/coupon\nhttps://meli.la/product'};
 assert.equal(parse(item).codes.length,0);assert.equal(parse(item).hasCoupon,true);
});
test('historical ended offers retain their coupon association',()=>{
 assert.equal(matchesCoupon({...offer,ended:true,code:'FULL1510'},'FULL1510','Mercado Livre'),true);
});

test('accepts link.amazon offers and preserves product-page coupon instructions',()=>{
 const {safeRetailer}=require('../coupon-parser.js');
 const url='https://link.amazon/B0hi1MX9O';
 assert.equal(safeRetailer(url),true);
 assert.equal(safeRetailer('https://link.amazon.evil.test/product'),false);
 const coupon=parse({kind:'offer',store:'Amazon',url,description:'Garrafa Térmica Stanley Quick Flip 710ml\nPor R$ 109 em 3x\n🎟️Resgate o cupom na página do produto (próximo ao preço), desconto na finalização.\n'+url});
 assert.equal(coupon.productUrl,url);
 assert.equal(coupon.hasCoupon,true);
 assert.equal(coupon.instructions.length,1);
 assert.deepEqual(coupon.codes,[]);
});
