/* global HeadersWriter: true */
require( "../node" );
require( "../comparison" );
require( "../headerswriter" );

const
    assert = require("assert"),
    { inspect } = require("util"),
    headers = {
        "content-type": 'multipart/form-data; charset="utf-8"; boundary=---------------------------974767299852498929531610575',
        "content-length": "68137",
        "content-encoding": "deflate, gzip",
        "content-language": "de-DE, en-CA"
    },
    writer = new HeadersWriter({
        "content-type": { parse: [ "keyattrs", ";", "mime" ] },
        "content-length": { key: "length", parse: "number" },
        "content-encoding": { key: "encodings", parse: [ "list", "," ] },
        "content-language": { key: "languages", parse: [ "list", "," ] },
    });

function eqW( key, value, ...args ){
    const result = writer.write( headers, ...args )[key];
    return it(
        `write(${ inspect( args, { depth: 2 }).slice(1,-1) })\n\t${key} = ${ inspect( value, { depth: 1 }) }`,
        () => assert[ typeof value == "object"? "deepEqual" : "equal" ]( value, result )
    );
}

describe("HeadersWriter", () => {
    eqW( "content-type", "multipart/form-data; boundary=---------------------------974767299852498929531610575; charset=iso-8859-15", { charset: "iso-8859-15" } );
    eqW( "content-type", "text/plain; charset=utf-16", { charset: "utf-16", mime: "text/plain" }, true );
    eqW( "content-length", "423", { length: 423 } );
    eqW( "content-encoding", "br, deflate, gzip", { encodings: "br" } );
    eqW( "content-encoding", "identity", { encodings: "identity" }, true );
    eqW( "content-language", "fr, fr-FR", { languages: [ "fr", "fr-FR" ] }, true );
});
