(function (root) {
    'use strict';
    // Ensure UMD builds (Recharts / PapaParse) attach cleanly to global window even if browser extensions inject AMD define
    if (root.define !== undefined) {
        root.__npdSavedDefine = root.define;
        root.define = undefined;
    }
    if (root.React && !root.react) root.react = root.React;
    if (root.ReactDOM && !root['react-dom']) root['react-dom'] = root.ReactDOM;
})(typeof globalThis !== 'undefined' ? globalThis : window);
