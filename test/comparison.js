/* global Comparison: true */
require( "../node" );
require( "../comparison" );

const
    assert = require("assert"),
    { inspect } = require("util");

function eqT( method, value, ...args ){
    return it( `Comparison.${ method }(${ inspect(args, { depth: 1 }).slice(1,-1) }) = ${ inspect( value, { depth: 1 }) }`, () => assert[ typeof value == "object"? "deepEqual" : "equal" ]( Comparison[method]( ...args ), value ) );
}

describe("Comparison", () => {

    class Record extends Array{}
    eqT(
        "type", "class",
        Record
    );

    const
        datearr = [ 2018, 2, 2, 18, 32, 45 ],
        date = new Date( Date.UTC( ...datearr ) );
    eqT(
        "convert", date,
        "date", datearr
    );
    eqT(
        "compare", 0,
        date, datearr
    );
    eqT(
        "equal", true,
        date, datearr
    );

    eqT(
        "isAsync", true,
        async function* f(){}
    );

    eqT(
        "isEmpty", true,
        []
    );

    const
        a = { [ Symbol.for("test") ]: 0, a: 1 },
        b = Object.create( a ),
        c = Object.create( b );
    b.b = 2;
    c.c = 3;
    eqT(
        "keys", [ "a", Symbol.for("test") ],
        a
    );
    eqT(
        "properties", [ "a", "b", "c", Symbol.for("test") ],
        c
    );
    eqT(
        "entries", [ ["a", 1], ["b", 2], ["c", 3], [Symbol.for("test"), 0] ],
        c
    );
    eqT(
        "plain", {a:1, b:2, c:3, [Symbol.for("test")]: 0},
        c
    );

    const record = new Record();
    eqT(
        "define", true,
        Record
    );
    eqT(
        "type", "record",
        record
    );
    

});
