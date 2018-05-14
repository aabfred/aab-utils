# aab-utils
a@b framework - Utils

Aim:
* implement base features for both browser & nodeJS
* port browser features to nodeJS to enhance hybrid development

## Browser use
As this module implements features directly to **global**, you should declare it in browser before loading libraries.

On window context:

    window.global = window;

On worker context:

    self.global = self;

## aab-utils/headersparser
This script will implement **HeadersParser** class in **global**.

There's no use to implement any message headers declared in IANA, because no script requires all of them, and syntax may differ with protocol. HeadersParser simply deals with syntax ( URL encoded tokens, quoted strings ... ) and offers an easy way to declare parsing rules.

    const parser = new HeadersParser({
        "content-type": { parse: [ "keyattrs", ";", "mime" ], cas: "lower" },
        "content-length": { key: "length", parse: "number" },
        "content-encoding": { key: "encodings", parse: [ "list", "," ] },
        "content-language": { key: "languages", parse: [ "list", "," ] },
    });
    ...
    const content = parser.parse( headers );

In example above, we've declared a parser that can be used later to compute some headers into content variable. **key** is not defined on **content-type** because we want resulting object to be assigned to result.

    parser.parse({
        "content-type": 'multipart/form-data; charset="UTF-8"; boundary=---------------------------974767299852498929531610575',
        "content-length": "68137",
        "content-encoding": "deflate, gzip",
        "content-language": "de-DE, en-CA"
    })

... will produce:

    {
        charset: 'utf-8',
        boundary: '---------------------------974767299852498929531610575',
        mime: 'multipart/form-data',
        length: 68137,
        encodings: [ 'deflate', 'gzip' ],
        languages: [ 'de-DE', 'en-CA' ]
    }

### Common use
#### new HeadersParser( conf )
Entries in conf parameter are treated with **HeadersParser.prototype.set( name, options )**.

#### HeadersParser.prototype.set( name, options={} )
Options may contain:
* cas = [ "upper" | "lower" ] case
* key = object key for resulting value
* multi = may have multiple declarations ( as Set-Cookie header )
* parse = method to parse value

**parse** parameter may be:
* a string or symbol pointing to any parser method ( "decode" by default if not parse )
* a function
* true = don't parse anything
* an array as [ parser method, ...arguments ]
* an object to map resulting values

Anyway, **parse** parameter will be stored as a function called like this:

    item.parse.call( parser, text optionnaly altered with cas param )

### Methods for parse parameter
#### HeadersParser.prototype.decode( text )
Default method when Boolean( parse parameter ) returns false.

Returns a string using **split( keep=true )**, so spaces will be converted to single space and tokens will be converted by decodeURIComponent and optionnaly quoted.

    { "user-agent": {} }

#### HeadersParser.prototype.number( text )
Returns a number.

    { "content-length": { parse: "number" } }

#### HeadersParser.prototype.date( text )
Returns a date.

    { "date": { parse: "date" } }

#### HeadersParser.prototype.list( sep, text )
Groups elements in arrays

    { "content-encoding": { parse: [ "list", "," ] } }

**sep** may be an array

    { "accept": { parse: [ "list", [ ",", ";" ] ] } }

#### HeadersParser.prototype.attrs( sep, text )
Returns an object.

    { "cookie": { parse: [ "attrs", "," ] } }

#### HeadersParser.prototype.keyattrs( sep, name, text )
Returns an object providing a name for the first value.

    { "content-type": { parse: [ "keyattrs", ";", "mime" ] } }

#### HeadersParser.prototype.map( map, text )
Returns a mapped value ( used when parse is an object ).

    { "x-dns-prefectch-control": { cas: "lower", parse: { "on": true, "off": false } } }

### Further methods & properties
#### HeadersParser.prototype.split( keep, text )
If keep is true, elements will keep spaces converted to single space, quoted for quoted strings, and will be quoted on tokens converted by decodeURIComponent when value contains spaces.


This method splits text into and array of elements using **HeadersParser.SPLITS** predefined methods.

#### HeadersParser.prototype.nextString( index, text )
Returns next quoted string or token ( with keep = false )

#### HeadersParser.SPLITS
Array of methods used by split method:
* delimiters ( one character per element in **,/:;=?@\\** )
* tokens ( with decodeURIComponent )
* quoted strings
* comments ( parenthesis )
* brackets
* curly brackets
* tags ( less & more brackets )

#### HeadersParser.quote( text )
Adds quotes escaping inner quotes

#### HeadersParser.unquote( text )
Removes quotes unescaping inner quotes

#### HeadersParser.unchanged( text )
Returns text
