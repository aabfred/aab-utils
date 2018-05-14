/*global HeadersParser:true*/
const assert = require("assert");

function eqR( r, key, value ){
    const val = ( typeof value == "string" ) && value.includes('"')? "'"+ value + "'" : JSON.stringify(value);
    return it( `${key} = ${ val }`, () => assert[ typeof value == "object"? "deepEqual" : "equal" ]( r[key], value ) );
}


require("../headersparser");
describe("HeadersParser", () => {
    const
        parser = new HeadersParser({
            "content-type": { parse: [ "keyattrs", ";", "mime" ] },
            "content-length": { key: "length", parse: "number" },
            "content-encoding": { key: "encodings", parse: [ "list", "," ] },
            "content-language": { key: "languages", parse: [ "list", "," ] },
        }),
        r = parser.parse({
            "content-type": 'multipart/form-data; charset="utf-8"; boundary=---------------------------974767299852498929531610575',
            "content-length": "68137",
            "content-encoding": "deflate, gzip",
            "content-language": "de-DE, en-CA"
        });
    eqR( r, "mime", "multipart/form-data" );
    eqR( r, "charset", "utf-8" );
    eqR( r, "boundary", "---------------------------974767299852498929531610575" );
    eqR( r, "length", 68137 );
    eqR( r, "encodings", [ "deflate", "gzip" ] );
    eqR( r, "languages", [ "de-DE", "en-CA" ] );
});
