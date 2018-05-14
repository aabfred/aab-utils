const { TextDecoder, TextEncoder } = require("util");
global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;


global.atob = x => new Buffer( x , "base64" ).toString( "binary" );
global.btoa = x => new Buffer( x, "binary" ).toString( "base64" );
