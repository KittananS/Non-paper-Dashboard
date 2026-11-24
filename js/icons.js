(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};

    // Lightweight inline Lucide SVG definitions (replaces ~600KB lucide-react UMD bundle)
    const ICON_NODES = {
        Activity: [['polyline', { points: '22 12 18 12 15 21 9 3 6 12 2 12' }]],
        AlertCircle: [
            ['circle', { cx: '12', cy: '12', r: '10' }],
            ['line', { x1: '12', y1: '8', x2: '12', y2: '12' }],
            ['line', { x1: '12', y1: '16', x2: '12.01', y2: '16' }]
        ],
        AlertTriangle: [
            ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' }],
            ['path', { d: 'M12 9v4' }],
            ['path', { d: 'M12 17h.01' }]
        ],
        ArrowDown: [
            ['path', { d: 'M12 5v14' }],
            ['path', { d: 'm19 12-7 7-7-7' }]
        ],
        ArrowLeft: [
            ['path', { d: 'm12 19-7-7 7-7' }],
            ['path', { d: 'M19 12H5' }]
        ],
        Banknote: [
            ['rect', { width: '20', height: '12', x: '2', y: '6', rx: '2' }],
            ['circle', { cx: '12', cy: '12', r: '2' }],
            ['path', { d: 'M6 12h.01M18 12h.01' }]
        ],
        BarChart2: [
            ['line', { x1: '18', x2: '18', y1: '20', y2: '10' }],
            ['line', { x1: '12', x2: '12', y1: '20', y2: '4' }],
            ['line', { x1: '6', x2: '6', y1: '20', y2: '14' }]
        ],
        Box: [
            ['path', { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }],
            ['path', { d: 'm3.3 7 8.7 5 8.7-5' }],
            ['path', { d: 'M12 22V12' }]
        ],
        Calendar: [
            ['path', { d: 'M8 2v4' }],
            ['path', { d: 'M16 2v4' }],
            ['rect', { width: '18', height: '18', x: '3', y: '4', rx: '2' }],
            ['path', { d: 'M3 10h18' }]
        ],
        Check: [['path', { d: 'M20 6 9 17l-5-5' }]],
        CheckCircle2: [
            ['circle', { cx: '12', cy: '12', r: '10' }],
            ['path', { d: 'm9 12 2 2 4-4' }]
        ],
        ChevronDown: [['path', { d: 'm6 9 6 6 6-6' }]],
        ChevronRight: [['path', { d: 'm9 18 6-6-6-6' }]],
        Copy: [
            ['rect', { width: '14', height: '14', x: '8', y: '8', rx: '2', ry: '2' }],
            ['path', { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' }]
        ],
        Crosshair: [
            ['circle', { cx: '12', cy: '12', r: '10' }],
            ['line', { x1: '22', x2: '18', y1: '12', y2: '12' }],
            ['line', { x1: '6', x2: '2', y1: '12', y2: '12' }],
            ['line', { x1: '12', x2: '12', y1: '6', y2: '2' }],
            ['line', { x1: '12', x2: '12', y1: '22', y2: '18' }]
        ],
        DollarSign: [
            ['line', { x1: '12', x2: '12', y1: '2', y2: '22' }],
            ['path', { d: 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' }]
        ],
        Eye: [
            ['path', { d: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z' }],
            ['circle', { cx: '12', cy: '12', r: '3' }]
        ],
        EyeOff: [
            ['path', { d: 'M9.88 9.88a3 3 0 1 0 4.24 4.24' }],
            ['path', { d: 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68' }],
            ['path', { d: 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61' }],
            ['line', { x1: '2', x2: '22', y1: '2', y2: '22' }]
        ],
        Filter: [['polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }]],
        History: [
            ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
            ['path', { d: 'M3 3v5h5' }],
            ['path', { d: 'M12 7v5l4 2' }]
        ],
        Info: [
            ['circle', { cx: '12', cy: '12', r: '10' }],
            ['path', { d: 'M12 16v-4' }],
            ['path', { d: 'M12 8h.01' }]
        ],
        Layers: [
            ['path', { d: 'm12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z' }],
            ['path', { d: 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65' }],
            ['path', { d: 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65' }]
        ],
        LayoutDashboard: [
            ['rect', { width: '7', height: '9', x: '3', y: '3', rx: '1' }],
            ['rect', { width: '7', height: '5', x: '14', y: '3', rx: '1' }],
            ['rect', { width: '7', height: '9', x: '14', y: '12', rx: '1' }],
            ['rect', { width: '7', height: '5', x: '3', y: '16', rx: '1' }]
        ],
        LayoutList: [
            ['rect', { width: '7', height: '7', x: '3', y: '3', rx: '1' }],
            ['rect', { width: '7', height: '7', x: '3', y: '14', rx: '1' }],
            ['path', { d: 'M14 4h7' }],
            ['path', { d: 'M14 9h7' }],
            ['path', { d: 'M14 15h7' }],
            ['path', { d: 'M14 20h7' }]
        ],
        Lightbulb: [
            ['path', { d: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5' }],
            ['path', { d: 'M9 18h6' }],
            ['path', { d: 'M10 22h4' }]
        ],
        MapPin: [
            ['path', { d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' }],
            ['circle', { cx: '12', cy: '10', r: '3' }]
        ],
        Menu: [
            ['line', { x1: '4', x2: '20', y1: '12', y2: '12' }],
            ['line', { x1: '4', x2: '20', y1: '6', y2: '6' }],
            ['line', { x1: '4', x2: '20', y1: '18', y2: '18' }]
        ],
        Package: [
            ['path', { d: 'm7.5 4.27 9 5.15' }],
            ['path', { d: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' }],
            ['path', { d: 'm3.3 7 8.7 5 8.7-5' }],
            ['path', { d: 'M12 22V12' }]
        ],
        PieIcon: [
            ['path', { d: 'M21.21 15.89A10 10 0 1 1 8 2.83' }],
            ['path', { d: 'M22 12A10 10 0 0 0 12 2v10z' }]
        ],
        RefreshCw: [
            ['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }],
            ['path', { d: 'M21 3v5h-5' }],
            ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }],
            ['path', { d: 'M8 16H3v5' }]
        ],
        Search: [
            ['circle', { cx: '11', cy: '11', r: '8' }],
            ['path', { d: 'm21 21-4.3-4.3' }]
        ],
        ShoppingBag: [
            ['path', { d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z' }],
            ['path', { d: 'M3 6h18' }],
            ['path', { d: 'M16 10a4 4 0 0 1-8 0' }]
        ],
        SlidersHorizontal: [
            ['line', { x1: '21', x2: '14', y1: '4', y2: '4' }],
            ['line', { x1: '10', x2: '3', y1: '4', y2: '4' }],
            ['line', { x1: '21', x2: '12', y1: '12', y2: '12' }],
            ['line', { x1: '8', x2: '3', y1: '12', y2: '12' }],
            ['line', { x1: '21', x2: '16', y1: '20', y2: '20' }],
            ['line', { x1: '12', x2: '3', y1: '20', y2: '20' }],
            ['line', { x1: '14', x2: '14', y1: '2', y2: '6' }],
            ['line', { x1: '8', x2: '8', y1: '10', y2: '14' }],
            ['line', { x1: '16', x2: '16', y1: '18', y2: '22' }]
        ],
        Sparkles: [
            ['path', { d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z' }],
            ['path', { d: 'M5 3v4' }],
            ['path', { d: 'M19 17v4' }],
            ['path', { d: 'M3 5h4' }],
            ['path', { d: 'M17 19h4' }]
        ],
        Store: [
            ['path', { d: 'm2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7' }],
            ['path', { d: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8' }],
            ['path', { d: 'M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4' }],
            ['path', { d: 'M2 7h20' }],
            ['path', { d: 'M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7' }]
        ],
        Tag: [
            ['path', { d: 'M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z' }],
            ['circle', { cx: '7.5', cy: '7.5', r: '.5', fill: 'currentColor' }]
        ],
        Target: [
            ['circle', { cx: '12', cy: '12', r: '10' }],
            ['circle', { cx: '12', cy: '12', r: '6' }],
            ['circle', { cx: '12', cy: '12', r: '2' }]
        ],
        TrendingUp: [
            ['polyline', { points: '22 7 13.5 15.5 8.5 10.5 2 17' }],
            ['polyline', { points: '16 7 22 7 22 13' }]
        ],
        Trophy: [
            ['path', { d: 'M6 9H4.5a2.5 2.5 0 0 1 0-5H6' }],
            ['path', { d: 'M18 9h1.5a2.5 2.5 0 0 0 0-5H18' }],
            ['path', { d: 'M4 22h16' }],
            ['path', { d: 'M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22' }],
            ['path', { d: 'M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22' }],
            ['path', { d: 'M18 2H6v7a6 6 0 0 0 12 0V2Z' }]
        ],
        UserCheck: [
            ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
            ['circle', { cx: '9', cy: '7', r: '4' }],
            ['polyline', { points: '16 11 18 13 22 9' }]
        ],
        UserPlus: [
            ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
            ['circle', { cx: '9', cy: '7', r: '4' }],
            ['line', { x1: '19', x2: '19', y1: '8', y2: '14' }],
            ['line', { x1: '22', x2: '16', y1: '11', y2: '11' }]
        ],
        Users: [
            ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
            ['circle', { cx: '9', cy: '7', r: '4' }],
            ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
            ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]
        ],
        X: [
            ['path', { d: 'M18 6 6 18' }],
            ['path', { d: 'm6 6 12 12' }]
        ],
        XCircle: [
            ['circle', { cx: '12', cy: '12', r: '10' }],
            ['path', { d: 'm15 9-6 6' }],
            ['path', { d: 'm9 9 6 6' }]
        ],
        Zap: [['polygon', { points: '13 2 3 14 12 14 11 22 21 10 12 10 13 2' }]]
    };

    ICON_NODES.PieChart = ICON_NODES.PieIcon;

    function createIconFactory(ReactObj) {
        if (!ReactObj) return {};
        const h = ReactObj.createElement;
        const memo = ReactObj.memo || ((fn) => fn);
        const cache = {};

        const makeIcon = (name) => {
            if (cache[name]) return cache[name];
            const nodes = ICON_NODES[name] || ICON_NODES.AlertCircle;
            const IconComponent = memo(function LucideIcon(props) {
                const { strokeWidth = 2, width = 24, height = 24, ...rest } = props || {};
                return h(
                    'svg',
                    {
                        xmlns: 'http://www.w3.org/2000/svg',
                        width,
                        height,
                        viewBox: '0 0 24 24',
                        fill: 'none',
                        stroke: 'currentColor',
                        strokeWidth,
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        'aria-hidden': 'true',
                        ...rest
                    },
                    nodes.map(([tag, attrs], idx) => h(tag, { key: idx, ...attrs }))
                );
            });
            IconComponent.displayName = `Icon(${name})`;
            cache[name] = IconComponent;
            return IconComponent;
        };

        return new Proxy(cache, {
            get(target, prop) {
                if (typeof prop !== 'string') return undefined;
                return makeIcon(prop);
            }
        });
    }

    NPD.createIconFactory = createIconFactory;
    if (root.React) {
        NPD.icons = createIconFactory(root.React);
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);
