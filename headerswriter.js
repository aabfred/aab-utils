/* global HeadersParser, Comparison: true */
const
    { TOKEN, DELIMITERS, SPACE, LAST, quote, unchanged } = HeadersParser,
    { equal } = Comparison,
    isArray = Array.isArray,
    invred = (o,[k,v]) => {
        o[v] = k;
        return o;
    },
    invmap = x => Object.entries( x ).reduce( invred, Object.create( null ) ),
    itmerge = ( dest, values ) => {
        const result = dest.slice();
        for( const value of values )
            if( !dest.some( x => equal( x, value ) ) )
                result.push( value );
        return result;
    },
    NULL = [ undefined, null, NaN, Infinity, -Infinity ],
    S = Object.create( null );

for( const x of [ "multi", "single" ] ) S[x] = Symbol(x);


class HeadersWriter extends HeadersParser {

    writeMethod( x ){
        return typeof x == "string"? "_" + x : x;
    }
    writeDefault( name ){
        return { header: name, key: name, parse: this.decode.bind( this ), write: this._decode.bind( this ) };
    }

    set( header, options={} ){
        let { write, parse } = options;
        super.set( header, options );
        const conf = this.HEADERS.slice(-1)[0];
        if( !write ) write = parse || "decode";
        let m;
        switch( typeof write ){
            case "string":
            case "symbol":
                m = this.writeMethod( write );
                if( m in this )
                    conf.write = this[ m ].bind( this );
                else
                    throw new SyntaxError(`writer[${ write }] isn't defined`);
                break;
            case "function":
                conf.write = write;
                break;
            case "boolean":
                conf.write = unchanged;
                break;
            case "object":
                if( isArray( write ) ) conf.write = this[ this.writeMethod( write[0] ) ].bind( this, ...write.slice(1) );
                else conf.write = this._map.bind( this, options.write? write : invmap( write ) );
                break;
            default:
                throw new SyntaxError(`write with type ${ typeof write } isn't supported`);
        }
        return this;
    }

    write( headers, name, value, replace ){
        if( typeof name == "string" ) value = { [ name ]: value };
        else [ value, replace ] = [ name, value ];
        const
            old = this.parse( headers ),
            rest = Object.assign( Object.create( null ), value );
        let main;
        for( const conf of this.HEADERS ){
            const { key } = conf;
            if( !key ){
                main = conf;
                continue;
            }
            let itold = old[ key ];
            delete old[ key ];
            if( !( key in value ) ) continue;
            let itval = value[ key ];
            delete rest[ key ];
            this.writeOne( headers, conf, replace, itval, itold );
        }
        if( main && Object.keys( rest ).length )
            this.writeOne( headers, main, replace, rest, old );
        return headers;
    }
    writeOne( headers, conf, replace, value, old ){
        const { header, multi } = conf;
        if( NULL.includes( value ) )
            delete headers[ header ];
        else
            headers[ header ] = multi?
                this[ S.multi ]( multi, replace, conf, isArray( value )? value : [ value ], old, headers[ header ] ) :
                this[ S.single ]( conf, value, replace? undefined : old );
    }
    [ S.multi ]( multi, replace, conf, value, old, lines=[] ){
        if( old )
            for( let i=0; i < old.length; i++ ){
                const
                    it = old[ i ],
                    k = it[ multi ],
                    idx = value.findIndex( x => x[ multi ] == k );
                if( idx !== -1 )
                    lines[ i ] = this[ S.single ]( conf, value.splice( idx, 1 )[0], replace? undefined : it );
            }
        for( const it of value )
            lines.push( this[ S.single ]( conf, it ) );
        return lines;
    }
    [ S.single ]( conf, value, old ){
        const { write, cas } = conf;
        value = write.call( this, value, old );
        return cas? value[cas]() : value;
    }

    old( value, old ){
        if( old ){
            if( [ undefined, Object ].includes( old.constructor ) ){
                value = Object.assign( old, typeof value == "object"? value : { [ value ]: true } );
                for( const k of Object.keys( value ).filter( x => NULL.includes( value[x] ) ) )
                    delete value[k];
            }else if( isArray( old ) ){
                if( !isArray( value ) ) value = [ value ];
                value = itmerge( old, value );
            }
        }
        return value;
    }
    render( value ){
        value = String( value );
        if( !value.length ) return value;
        if( DELIMITERS.includes( value ) ) return value;
        if( SPACE.includes( value ) ) return " ";
        let quoted, unicode,
            n = 0;
        while( !unicode && ( n < value.length ) ){
            const c = value[n++];
            if( c > LAST ) unicode = true;
            else if( !TOKEN.includes(c) ) quoted = true;
        }
        if( unicode ) return encodeURIComponent( value );
        else if( quoted ) return quote( value );
        return value;
    }
    flatten( seps, parts, sort ){
        if( !Array.isArray(seps) ) seps = [ seps ];
        if( seps.length == 1 )
            parts = parts.map( this.render );
        else
            parts = parts.map( this.flatten.bind( this, seps.slice(1) ) );
        if( sort === true ) parts = parts.sort();
        return parts.join( seps[0] );
    }

    _split( keep, value, old ){
        value = this.old( value, old );
        if( isArray( value ) ){
            const len = value.length;
            if( keep || ( len > 1 ) ) return value.map( this._split.bind( this, keep ) );
            if( !len ) return;
            value = value[0];
        }
        return this.render( value );
    }
    _decode( value ){
        value = this._split( true, value );
        return isArray( value )? value.join(" ") : value;
    }
    _number( value ){
        return String( value );
    }
    _date( value ){
        return String( value );
    }
    _map( map, value ){
        return map[ String( value ) ];
    }
    _list( sep, value, old ){
        if( !isArray( value ) ) value = [ value ];
        if( !isArray( sep ) ) sep = [ sep ];
        value = this.old( value, old );
        return this.flatten( sep.map( x => x + " "), value, true );
    }
    _attrs( sep, value, old ){
        if( typeof value == "string" ) value = { [ value ]: true };
        value = this.old( value, old );
        return this.flatten(
            [ sep + " ", "=" ],
            Object.entries( value ).map( ([k,v]) => v === true? [ k ] : [ k, v ] ),
            true
        );
    }
    _keyattrs( sep, name, value, old ){
        if( typeof value == "string" ) value = { [ name ]: value };
        value = this.old( value, old );
        let args = Object.keys( value ).sort();
        args.splice( args.indexOf( name ), 1 );
        for( let i=0; i<args.length; i++ ){
            const
                k = args[i],
                v = value[ k ];
            if( v !== true ) args[i] = [ k, v ];
        }
        return this.split( false, value[ name ] ).map( this.render ).join("") +
            sep + " " +
            this.flatten( [ sep + " ", "=" ], args );
    }

}
HeadersWriter.SYMBOLS = S;

global.HeadersWriter = HeadersWriter;
