/*global DOMException:true*/
require("../dom");

const
    { randomBytes } = require("crypto"),
    crypto = {
        // crypto ( XXX subtle )
        getRandomValues( typedArray ){
            if( !(typedArray instanceof Uint8Array) )
                throw new TypeError( "Failed to execute 'getRandomValues' on 'Crypto': parameter 1 is not of type 'ArrayBufferView'." );
            const len = typedArray.length;
            if( len > 65536 )
                throw new DOMException( `Failed to execute 'getRandomValues' on 'Crypto': The ArrayBufferView's byte length (${ len }) exceeds the number of bytes of entropy available via this API (65536).`, "QuotaExceededError" );
            var bytes = randomBytes( len );
            typedArray.set( bytes );
            return typedArray;
        }
    };

global.crypto = crypto;
