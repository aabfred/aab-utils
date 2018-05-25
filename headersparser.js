const
    TOKEN = "!#$%&'*+-.^_`|~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    SPACE = " \t\r\n",
    DELIMITERS = ",/:;=?@\\",
    LAST = "\x7f",

    headers2pairs = {
        object: x => Object.entries(x),
        pairs: x => x,
        raw: x => {
            const pairs = [];
            for( let i=0; i<x.length; i+=2 )
                pairs.push( x.slice( i, i+2 ) );
            return pairs;
        }
    },
    unchanged = x => x,
    quote = x => `"${ x.replace(/"/g, '\\"') }"`,
    unquote = x => x.slice( 1, -1 ).replace(/\\"/g, '"'),
    
    brackets = ( start, end, idx, txt, parts ) => {
        let i = idx;
        if( txt[i++] !== start ) return;
        let n=1;
        while( n && ( i < txt.length ) ){
            switch( txt[i] ){
                case end: n--; break;
                case start: n++; break;
                case "\\": i++; break;
            }
            i++;
        }
        parts.push( txt.slice( idx, i ) );
        return i;
    },
    space = ( idx, txt, parts ) => {
        let i = idx;
        while( ( i < txt.length ) && SPACE.includes( txt[i] ) ) ++i;
        if( parts && ( i > idx ) ) parts.push(" ");
        return i;
    },
    token = ( idx, txt, parts, keep ) => {
        let v, i = idx;
        while( ( i < txt.length ) && (
            TOKEN.includes( v = txt[i] ) ||
            ( v > LAST )
        )) ++i;
        if( i == idx ) return;
        v = decodeURIComponent( txt.slice( idx, i ) );
        parts.push( keep && v.includes(" ")? quote(v) : v );
        return i;
    },
    delimiter = ( idx, txt, parts ) => {
        const c = txt[idx];
        if( !DELIMITERS.includes( c ) ) return;
        parts.push( c );
        return idx + 1;
    },
    quotes = ( idx, txt, parts, keep ) => {
        const
            a = [],
            i = brackets( '"', '"', idx, txt, a );
        if( !i ) return;
        parts.push( keep? a[0] : unquote(a[0]) );
        return i;
    },

    list = ( seps, parts ) => {
        if( !Array.isArray(seps) ) seps = [ seps ];
        let sep, s=0;
        [ sep, ...seps ] = seps;
        const result = [];
        for( let e = 0; e < parts.length; e++ ){
            if( parts[e] !== sep ) continue;
            result.push( parts.slice( s, e ) );
            s = e + 1;
        }
        if( s < parts.length ) result.push( parts.slice( s ) );
        return seps.length? result.map( list.bind( null, seps ) ) : result;
    },
    attrs = (o, [k, op, v]) => {
        if( op == "=" ) o[k] = v;
        else if( !op && !v ) o[k] = true;
        else throw new SyntaxError(`attrs: op should be "=", found "${ op }"`);
        return o;
    };


class HeadersParser {

    constructor( conf ){
        this.HEADERS = [];
        if( conf )
            for( const [ name, options ] of Object.entries( conf ) )
                this.set( name, options );
    }
    set( header, options={} ){
        let { key, multi, parse, cas } = options;
        const conf = { header };
        if( key ) conf.key = key;
        if( multi ) conf.multi = multi;
        if( cas == "upper" ) conf.cas = "toUpperCase";
        if( cas == "lower" ) conf.cas = "toLowerCase";
        if( !parse ) parse = "decode";
        switch( typeof parse ){
            case "string":
            case "symbol":
                if( parse in this )
                    conf.parse = this[ parse ].bind( this );
                else
                    throw new SyntaxError(`parser[${ parse }] isn't defined`);
                break;
            case "function":
                conf.parse = parse;
                break;
            case "boolean":
                conf.parse = unchanged;
                break;
            case "object":
                if( Array.isArray( parse ) ) conf.parse = this[ parse[0] ].bind( this, ...parse.slice(1) );
                else conf.parse = this.map.bind( this, parse );
                break;
            default:
                throw new SyntaxError(`parse with type ${ typeof parse } isn't supported`);
        }
        this.HEADERS.push( conf );
        return this;
    }

    parse( headers, type ){
        if( !type ) type = Array.isArray( headers )? "pairs" : "object";
        const
            result = {},
            pairs = headers2pairs[ type ]( headers );
        for( const conf of this.HEADERS ){
            const
                { header, key } = conf,
                value = this.parseOne( conf, pairs.reduce( (a,[k,v]) => k == header? a.concat(v) : a, [] ) );
            if( value !== undefined ){
                if( key ) result[ key ] = value;
                else Object.assign( result, value );
            }
        }
        return result;
    }
    parseOne( conf, values ){
        if( !values.length ) return;
        const { multi, parse, cas } = conf;
        if( cas ) values = values.map( x => x[cas]() );
        return multi?
            values.map( parse.bind( this ) ) :
            parse.call( this, values[0] );
    }

    nextString( idx, txt ){
        const parts = [];
        let i = token( idx, txt, parts );
        if( !i ) i = quotes( idx, txt, parts );
        if( i ) return { index: i, text: parts[0] };
    }

    split( keep, txt ){
        const parts = [];
        let i=0;
        while( i < txt.length ){
            i = space( i, txt, keep && parts );
            if( i == txt.length ) break;
            let n;
            for( const b of this.constructor.SPLITS )
                if( ( n = b.call( this, i, txt, parts, keep ) ) ) break;
            if( !n ) throw Object.assign( new SyntaxError(`No a regular header value: "${ txt }" ${ parts }`), { code: "EPARSE" });
            i = n;
        }
        return parts;
    }
    decode( txt ){
        const parts = this.split( true, txt );
        return (parts.length == 1) && (parts[0][0] == '"')? unquote(parts[0]) : parts.join("");
    }
    number( txt ){
        return Number( txt.replace(/[\s"]+/, "") );
    }
    date( txt ){
        return new Date( txt.trim().replace(/"+/, "") );
    }
    map( map, txt ){
        return map[ this.decode( txt ) ];
    }
    list( sep, txt ){
        return list( sep, this.split( false, txt ) ).map( x => x.join("") );
    }
    attrs( sep, txt ){
        return list( sep, txt ).reduce( attrs, Object.create( null ) );
    }
    keyattrs( sep, name, txt ){
        const
            l = list( sep, this.split( false, txt ) ),
            value = l.shift().join(""),
            atrs = l.reduce( attrs, Object.create( null ) );
        atrs[ name ] = value;
        return atrs;
    }
    
}
HeadersParser.TOKEN = TOKEN;
HeadersParser.SPACE = SPACE;
HeadersParser.DELIMITERS = DELIMITERS;
HeadersParser.LAST = LAST;
HeadersParser.quote = quote;
HeadersParser.unquote = unquote;
HeadersParser.unchanged = unchanged;
HeadersParser.SPLITS = [
    delimiter,
    token,
    quotes,
    brackets.bind( null, "(", ")" ),
    brackets.bind( null, "[", "]" ),
    brackets.bind( null, "{", "}" ),
    brackets.bind( null, "<", ">" )
];

global.HeadersParser = HeadersParser;
