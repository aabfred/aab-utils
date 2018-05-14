const DOMExceptionMap = {};
class DOMException {
    constructor( message, name ){
        Object.defineProperties( this, {
            code: { value: DOMExceptionMap[name] || 0 },
            message: { value: message },
            name: { value: name }
        });
    }
}
DOMException.INDEX_SIZE_ERR = DOMExceptionMap.IndexSizeError = 1;           // DEPRECATED => RangeError
DOMException.DOMSTRING_SIZE_ERR = DOMExceptionMap.DOMStringSizeError = 2;   // DEPRECATED => RangeError
DOMException.HIERARCHY_REQUEST_ERR = DOMExceptionMap.HierarchyRequestError = 3;
DOMException.WRONG_DOCUMENT_ERR = DOMExceptionMap.WrongDocumentError = 4;
DOMException.INVALID_CHARACTER_ERR = DOMExceptionMap.InvalidCharacterError = 5;
DOMException.NO_DATA_ALLOWED_ERR = DOMExceptionMap.NoDataAllowedError = 6;  // DEPRECATED
DOMException.NO_MODIFICATION_ALLOWED_ERR = DOMExceptionMap.NoModificationAllowedError = 7;
DOMException.NOT_FOUND_ERR = DOMExceptionMap.NotFoundError = 8;
DOMException.NOT_SUPPORTED_ERR = DOMExceptionMap.NotSupportedError = 9;
DOMException.INUSE_ATTRIBUTE_ERR = DOMExceptionMap.InUseAttributeError = 10;
DOMException.INVALID_STATE_ERR = DOMExceptionMap.InvalidStateError = 11;
DOMException.SYNTAX_ERR = DOMExceptionMap.SyntaxError = 12;
DOMException.INVALID_MODIFICATION_ERR = DOMExceptionMap.InvalidModificationError = 13;
DOMException.NAMESPACE_ERR = DOMExceptionMap.NamespaceError = 14;
DOMException.INVALID_ACCESS_ERR = DOMExceptionMap.InvalidAccessError = 15;  // DEPRECATED => TypeError or "NotSupportedError" or "NotAllowedError"
DOMException.VALIDATION_ERR = DOMExceptionMap.ValidationError = 16;         // DEPRECATED
DOMException.TYPE_MISMATCH_ERR = DOMExceptionMap.TypeMismatchError = 17;    // DEPRECATED => TypeError
DOMException.SECURITY_ERR = DOMExceptionMap.SecurityError = 18;
DOMException.NETWORK_ERR = DOMExceptionMap.NetworkError = 19;
DOMException.ABORT_ERR = DOMExceptionMap.AbortError = 20;
DOMException.URL_MISMATCH_ERR = DOMExceptionMap.URLMismatchError = 21;
DOMException.QUOTA_EXCEEDED_ERR = DOMExceptionMap.QuotaExceededError = 22;
DOMException.TIMEOUT_ERR = DOMExceptionMap.TimeoutError = 23;
DOMException.INVALID_NODE_TYPE_ERR = DOMExceptionMap.InvalidNodeTypeError = 24;
DOMException.DATA_CLONE_ERR = DOMExceptionMap.DataCloneError = 25;

global.DOMException = DOMException;
