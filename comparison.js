/* global TextDecoder: true */
const
    cmp = ( a, b ) => a < b? -1 : Number( b < a ),
    unchanged = x => x,
    cmpK = ( k, a, b ) => {
        const end = a[k];
        let c = cmp( end, b[k] );
        if( c ) return c;
        for( let i = 0; i < end; i++ )
            if( ( c = Comparison.compare( a[i], b[i] ) ) )
                return c;
        return 0;
    },

    PLAIN = [ undefined, Object ],
    PLAINPROTO = [ null, Object.prototype ],
    RE_SRC = new RegExp().source,
    GENERATORS = [ "Generator", "AsyncGenerator" ],
    GENFUNCTIONS = [ "GeneratorFunction", "AsyncGeneratorFunction" ],
    ASYNC = [ "AsyncGenerator", "AsyncGeneratorFunction", "AsyncFunction" ],
    S = Object.create( null );
for( const x of [ "function", "number", "object", "priority", "precedence", "string" ] ) S[x] = Symbol(x);

const
    Comparison = {

        /* === Core parameters === */
        // Values for type "undefined"
        NULL: [ undefined, null, NaN ],
        // Class that makes sense to have their own type instead of "instance" type
        CLASSES: [ Date, Error, Map, Promise, RegExp, Set, WeakSet, WeakMap ],
        // Default order by type. I choosed complexity
        PRIORITY: [ "undefined", "boolean", "integer", "float", "infinite", "string", "text", "set", "array", "plain", "map", "date", "binary", "instance", "symbol", "regexp", "error", "generator", "arrow", "generatorfunction", "class", "function", "promise", "weakset", "weakmap" ],
        // Only first convertible order may be important
        PRECENDENCE: [ "set", "map", "text", "string", "float", "integer", "infinite", "boolean", "plain", "array", "date", "binary", "instance", "symbol", "regexp", "error", "generator", "undefined", "arrow", "generatorfunction", "class", "function", "promise", "weakset", "weakmap" ],

        /* === Core methods === */

        define( cls, options={} ){
            /* Usage:   Comparison.define( MyClass )   */
            if( Comparison.type( cls ) !== "class" )
                throw new SyntaxError( "Not a class" );
            const name = cls.name.toLowerCase();
            if( !name )
                throw new SyntaxError( "Class has no name" );
            if( this.CLASSES.includes( cls ) )
                return false;
            this.CLASSES.push( cls );
            this.PRIORITY.splice( options.priority || this.PRIORITY.indexOf( "instance" ), 0, name );
            this.PRECENDENCE.splice( options.precedence || this.PRECENDENCE.indexOf( "instance" ), 0, name );

            if( options.convert )
                this.CONVERT[ name ] = options.convert;
            if( options.compare )
                this.COMPARE[ name ] = options.compare;
            if( options.empty )
                this.CONVERT[ "undefined" ][ name ] = options.empty;

            return true;
        },

        type( x ){
            /* Usage:   Comparison.type( error )   */
            if( this.NULL.includes( x ) ) return "undefined";
            const
                type = typeof x,
                method = S[ type ];
            return method && ( method in this )? this[ method ]( x ) : type;
        },

        convert( type, x, xtype ){
            /* Usage:   Comparison.convert( "date", [ 2018, 3, 12, 15, 32 ] )   */
            if( x === undefined ) x = null;
            let value;
            try{
                value = this.CONVERT[ type ][ xtype || Comparison.type( x ) ]( x );
            }catch(e){ /**/ }
            return value;
        },

        compare( a, b, n=0 ){
            /* Usage:   [...].sort( Comparison.compare )   */
            if( a === b ) return 0;
            let value,
                comparator,
                [ as, bs ] = [ a, b ].map( x => this.type( x ) );
            if( as == bs )
                comparator = this.COMPARE[ as ];
            else{
                // Default value is type priority
                n = this[ S.priority ]( as, bs );
                // Precedence reorders parameters, then compare( [...], new Set(...) ) == compare( new Set(...), [...] )
                const pcd = this[ S.precedence ]( as, bs );
                if( pcd == bs )
                    [ a, b ] = [ b, a ],
                    [ as, bs ] = [ bs, as ];

                let converted,
                    [ ac, bc ] = [ as, bs ].map( x => this.COMPARE[ x ] );
                if( ac && ( ( converted = this.convert( as, b, bs ) ) !== undefined ) )
                    comparator = ac,
                    b = converted;
                else if( bc && ( ( converted = this.convert( bs, a, as ) ) !== undefined ) )
                    comparator = bc,
                    a = converted;
            }
            if( comparator )
                try{
                    value = comparator( a, b );
                    if( value !== undefined ) return value;
                }catch(e){ /**/ }
            return n;
        },
        equal( a, b ){
            return !this.compare( a, b, 1 );
        },

        isAsync: x => !x? false : ( x instanceof Promise? true : ASYNC.includes( x[ Symbol.toStringTag ] ) ),
        isEmpty( x ){
            const type = this.type( x );
            if( type == "undefined" ) return true;
            return this.convert( "undefined", x, type ) === null;
        },

        /* === Utils === */
        string2binary: x => Uint16Array.from( x.split("").map( x => x.charCodeAt(0) ) ),
        binary2string: x => new TextDecoder().decode(x),

        keys( x, options={} ){
            if( options.visible )
                return Object.keys( x ).sort();
            else if( options.nosymbols )
                return Object.getOwnPropertyNames( x ).sort();
            else
                return Object.getOwnPropertyNames( x ).sort().concat( Object.getOwnPropertySymbols( x ) );
        },
        plain( x, options, src, result ){
            if( !options ) options = {};
            if( !src ) src = x, result = Object.create( null );
            if(
                ( typeof x !== "object" ) ||
                PLAINPROTO.includes(x) ||
                ( x === options.proto )
            ) return result;
            for( const k of this.keys( x, options ) ){
                if( k in result ) continue;
                const v = src[k];
                if( options.noundefined && ( v === undefined ) ) continue;
                else if( options.nomethods && ( typeof v == "function" ) ) continue;
                result[k] = v;
            }
            return this.plain( Object.getPrototypeOf(x), options, src, result );
        },
        entries( x, options={} ){
            const plain = this.plain( x, options );
            return this.keys( plain, options ).map( x => [ x, plain[x] ] );
        },
        properties( x, options={} ){
            return this.keys( this.plain( x, options ), options );
        },

        /* === Internals === */
        SYMBOLS: S,

        [ S.object ](x){
            let cls = this.CLASSES.find( c => x instanceof c );
            if( cls ) return cls.name.toLowerCase();
            if( ArrayBuffer.isView(x) ) return "binary";
            if( Array.isArray( x ) ) return "array";
            if( GENERATORS.includes( x[ Symbol.toStringTag ] ) ) return "generator";
            if( PLAIN.includes( x.constructor ) ) return "plain";
            return "instance";
        },
        [ S.function ](x){
            const props = Object.keys( Object.getOwnPropertyDescriptors(x) );
            if( GENFUNCTIONS.includes( x[ Symbol.toStringTag ] ) ) return "generatorfunction";
            if( props.includes("caller") ) return "function";
            if( props.includes("prototype") ) return "class";
            return "arrow";
        },
        [ S.number ]: x => isFinite(x)? ( String(x).includes(".")? "float" : "integer" ) : "infinite",
        [ S.string ]: x => x.includes("\n")? "text" : "string",

        [ S.priority ]( a, b ){
            if( a == b ) return 0;
            let [ i, j ] = [ a, b ].map( x => this.PRIORITY.indexOf(x) );
            // Improvements not listed
            if( i == -1 ) i = j+1;
            if( j == -1 ) j = i +1;
            return cmp( i, j );
        },
        [ S.precedence ]( a, b ){
            if( a == b ) return a;
            let [ i, j ] = [ a, b ].map( x => this.PRECENDENCE.indexOf(x) );
            // Improvements not listed
            if( i == -1 ) i = j+1;
            if( j == -1 ) j = i +1;
            return i > j? a : b;
        }
    };


/* === Converters === */
Comparison.CONVERT = {
    array: {
        binary: x => [ ...x ],
        date: x => isFinite(x)? x.toJSON().slice(0,-1).split(/[-T:.]/).map( Number ) : undefined,
        map: x => [ ...x ],
        plain: x => Comparison.entries(x),
        set: x => [ ...x ],
        text: x => x.split( /\r?\n/ )
    },
    binary: {
        array: x => Uint16Array.from( x ),
        string: Comparison.string2binary,
        text: Comparison.string2binary
    },
    boolean: {
        infinite: () => false,
        integer: x => !x? false :( x === 1? true : undefined ),
        string: x => x === "false"? false :( x === "true"? true : undefined ),
        "undefined": () => false
    },
    date: {
        array: x => {
            if( x.every( n => typeof n == "number" ) && x.length && ( x.length < 8 ) )
                return new Date( Date.UTC( ...x ) );
        },
        integer: x => new Date(x),
        plain: x => {
            for( const k of [ "year", "month", "day", "hours", "minutes", "seconds", "milliseconds" ] )
                if( ( k in x ) && ( typeof x[k] !== "number" ) ) return;
            const { year, month, day, hours, minutes, seconds, milliseconds } = x;
            if(
                !year || ( year < 1000 ) || ( year > 2200 ) ||
                !month || ( month < 1 ) || ( month > 12 ) ||
                !day || ( day < 1 ) || ( day > 31 )
            ) return;
            const d = new Date(0);
            d.setUTCFullYear( year );
            d.setUTCMonth( month -1 );
            d.setUTCDate( day );
            if( hours ) d.setUTCHours( hours );
            if( minutes ) d.setUTCMinutes( minutes );
            if( seconds ) d.setUTCSeconds( seconds );
            if( milliseconds ) d.setUTCMilliseconds( milliseconds );
            return d;
        },
        string: x => {
            x = x.toLowerCase();
            if( x == "now" ) return new Date();
            const d = new Date( x.match(/\s(z|gmt)$/)? x : x + " z" );
            if( isFinite(d) ) return d;
        }
    },
    float: {
        set: x => x.size,
        "undefined": () => NaN
    },
    map: {
        array: x => new Map( x ),
        plain: x => new Map( Comparison.entries( x ) )
    },
    plain: {
        array: Comparison.plain,
        date: x => isFinite(x)? {
            year: x.getUTCFullYear(),
            month: x.getUTCMonth() +1,
            day: x.getUTCDate(),
            hours: x.getUTCHours(),
            minutes: x.getUTCMinutes(),
            seconds: x.getUTCSeconds(),
            milliseconds: x.getUTCMilliseconds()
        } : undefined,
        map: x => x.entries().reduce( ( o, [k,v] ) => { o[k] = v; return o; }, Object.create(null) )
    },
    set: {
        array: x => new Set(x)
    },
    string: {
        binary: Comparison.binary2string,
        "undefined": () => "",
    },
    "undefined": {
        array: x => x.length? undefined : null,
        binary: x => x.byteLength? undefined : null,
        blob: x => x.size? undefined : null,
        date: x => isFinite(x)? undefined : null,
        map: x => x.size? undefined : null,
        plain: x => Comparison.properties( x ).length? undefined : null,
        regexp: x => x.source == RE_SRC? null : undefined,
        set: x => x.size? undefined : null,
        string: x => x? undefined : null
    }
};

// Clone converters on similar types ( number & string )
for( const x of [ "boolean", "date", "string" ] )
    Comparison.CONVERT.float[ x ] = Number;
for( const x of [ "infinite", "number" ] )
    Comparison.CONVERT[x] = Object.assign( {}, Comparison.CONVERT.float );
for( const x of [ "float", "infinite", "number" ] )
    for( const k of [ "float", "infinite", "number" ] )
        if( x !== k ) Comparison.CONVERT[x][k] = unchanged;

for( const x of [ "boolean", "date", "float", "infinite", "integer" ] )
    Comparison.CONVERT.string[ x ] = String;
Comparison.CONVERT.text = Object.assign( {}, Comparison.CONVERT.string );
for( const x of [ "string", "text" ] )
    for( const k of [ "string", "text" ] )
        if( x !== k ) Comparison.CONVERT[x][k] = unchanged;


/* === Comparators === */
Comparison.COMPARE = {
    array: cmpK.bind( null, "length" ),
    binary: cmpK.bind( null, "byteLength" ),
    blob: ( a, b ) => Comparison.COMPARE.binary( ...[ a, b ].map( Comparison.CONVERT.binary.blob ) ),
    map: ( a, b ) => {
        let c = cmp( a.size, b.size );
        if( c ) return c;
        [ a, b ] = [ a, b ].map( x => [ ...x ] );
        for( const e of a ){
            const i = b.findIndex( x => Comparison.equal( e[0], x[0] ) && Comparison.equal( e[1], x[1] ) );
            if( i == -1 ) return;
            b.splice( i, 1 );
        }
        return 0;
    },
    plain: ( a, b ) => {
        return Comparison.COMPARE.array( ...[ a, b ].map( x => Comparison.entries( x ).sort( ( c, d ) => cmp( c[0], d[0] ) ) ) );
    },
    set: ( a, b ) => {
        let c = cmp( a.size, b.size );
        if( c ) return c;
        [ a, b ] = [ a, b ].map( x => [ ...x ] );
        for( const e of a ){
            const i = b.findIndex( x => Comparison.equal( e, x ) );
            if( i == -1 ) return;
            b.splice( i, 1 );
        }
        return 0;
    },
    symbol: ( a, b ) => {
        const [ as, bs ] = [ a, b ].map( x => String(x).slice(7, -1) );
        if( as !== bs ) return cmp( as, bs );
        const
            s = Symbol.for( as ),
            index = [ a, b ].findIndex( x => x === s );
        if( index !== -1 )
            return index? 1 : -1;
    },
    "undefined": () => 0
};
for( const x of [ "boolean", "date", "float", "infinite", "integer", "string", "text" ] )
    Comparison.COMPARE[ x ] = cmp;


// Browser only
for( const x of [ "Blob", "Element", "EventTarget" ] )
    if( x in global ) Comparison.define( global[x] );

if( "Blob" in global ){
    Comparison.toBlob = x => new global.Blob(x);
    Comparison.CONVERT.blob = {
        array: Comparison.toBlob,
        binary: Comparison.toBlob,
        string: Comparison.toBlob,
        text: Comparison.toBlob
    };

    // FileReaderSync ( workers only ) provides new converters
    if( "FileReaderSync" in global ){
        Comparison.CONVERT.binary.blob = x => new global.FileReaderSync().readAsArrayBuffer(x);
        Comparison.CONVERT.string.blob = x => new global.FileReaderSync().readAsBinaryString(x);
        Comparison.CONVERT.text.blob = x => new global.FileReaderSync().readAsText(x);
    }
}

// Global registration
const cmpG = {};
for( const [ k, v ] of Object.entries( Comparison ) )
    cmpG[k] = typeof v == "function"? v.bind( Comparison ) : v;
global.Comparison = cmpG;
