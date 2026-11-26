(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};
    const React = root.React;
    if (!React) return;

    const h = React.createElement;
    const { useState, useMemo, useEffect, useCallback, useRef, memo } = React;
    const Recharts = root.Recharts || {};
    const {
        XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
        PieChart, Pie, Cell, Area, Line, ComposedChart, LabelList
    } = Recharts;

    const { GROUP_ORDER, GROUP_COLORS, GROUP_HEX, APPLE_PALETTE } = NPD.config;
    const { computeNiceYAxisTicks, copyTextToClipboard } = NPD.utils;
    const { computeCustomerAcquisition, computeExecutiveDeepMetrics } = NPD.engine;
    const Icons = NPD.icons || NPD.createIconFactory(React);
    const {
        DollarSign, Target, Sparkles, Eye, EyeOff, TrendingUp, X, Package, Store,
        PieIcon, Activity, Layers, ArrowLeft, ShoppingBag, ChevronRight,
        UserPlus, UserCheck, Copy, Check, Zap, Banknote, Crosshair
    } = Icons;
    const { ModalPortal, InfoPopover, FilterDropdown, ExportCSVButton, ImageWithFallback, renderCustomLabel } = NPD.components;

    const PortfolioSummaryWidget = memo(function PortfolioSummaryWidget({ selectedGroups, toggleGroup }) {
        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col items-center justify-center h-full relative overflow-hidden group animate-in fade-in zoom-in-95 duration-500' },
            h('div', { className: 'absolute inset-0 bg-gradient-to-br from-[#0071e3]/5 to-transparent pointer-events-none' }),
            h(
                'div',
                { className: 'relative z-10 w-full flex flex-col h-full justify-center' },
                !selectedGroups.includes('ALL') && selectedGroups.length === 1 && h(ImageWithFallback, {
                    groupName: selectedGroups[0],
                    alt: selectedGroups[0],
                    className: 'w-full h-28 sm:h-32 object-contain mb-3 sm:mb-4 drop-shadow-md'
                }),
                (selectedGroups.includes('ALL') || selectedGroups.length > 1) && h(
                    'div',
                    { className: 'grid grid-cols-4 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full h-auto max-h-32 mb-3 sm:mb-4 overflow-y-auto custom-scrollbar place-items-center' },
                    (selectedGroups.includes('ALL') ? GROUP_ORDER : selectedGroups).map((g) => h(ImageWithFallback, {
                        key: g,
                        groupName: g,
                        alt: g,
                        className: 'h-9 sm:h-10 w-auto object-contain drop-shadow-sm hover:scale-110 hover:-translate-y-1 transition-all cursor-pointer',
                        onClick: () => toggleGroup(g),
                        title: g
                    }))
                ),
                h(
                    'div',
                    { className: 'text-xs sm:text-sm font-semibold text-[#1d1d1f] bg-white/80 backdrop-blur-md border border-black/5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[12px] text-center mt-auto w-full truncate shadow-sm' },
                    selectedGroups.includes('ALL') ? 'TOTAL PORTFOLIO' : selectedGroups.join(' + ')
                )
            )
        );
    });

    const KPIYTDWidget = memo(function KPIYTDWidget({ kpi }) {
        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col justify-between h-full hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-shadow animate-in fade-in zoom-in-95 duration-500 delay-75' },
            h(
                'div',
                { className: 'flex justify-between items-start mb-2' },
                h('span', { className: 'text-xs font-semibold text-[#86868b] uppercase tracking-wider' }, 'YTD Actual 2026'),
                h('div', { className: 'bg-[#0071e3]/10 p-2 rounded-full' }, h(DollarSign, { className: 'w-4 h-4 text-[#0071e3]' }))
            ),
            h(
                'div',
                null,
                h('h3', { className: 'text-[26px] sm:text-[32px] leading-tight font-bold text-[#1d1d1f] tracking-tight truncate' }, `฿${(kpi.s26 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                h(
                    'div',
                    { className: `text-xs sm:text-sm mt-1 font-medium flex items-center gap-1 ${kpi.growthYoY >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}` },
                    `${kpi.growthYoY >= 0 ? '▲' : '▼'} ${Math.abs(kpi.growthYoY || 0).toFixed(1)}% vs 2025 YTD`
                )
            )
        );
    });

    // Upgraded KPITargetWidget with Seasonality/Elapsed YTD Target Pacing Benchmark & Progress Marker
    const KPITargetWidget = memo(function KPITargetWidget({ kpi }) {
        const hasPace = kpi.target26 > 0 && kpi.ytdTargetBenchmark !== null;
        const isAhead = (kpi.ytdPaceDiff || 0) >= 0;

        return h(
            'div',
            { className: `bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col justify-between h-full transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-in fade-in zoom-in-95 duration-500 delay-100 ${kpi.target26 === null ? 'opacity-60 grayscale' : ''}` },
            h(
                'div',
                { className: 'flex justify-between items-start mb-1' },
                h(
                    'div',
                    { className: 'flex items-center gap-1.5' },
                    h('span', { className: 'text-xs font-semibold text-[#86868b] uppercase tracking-wider' }, 'Target 2026'),
                    hasPace && h(
                        InfoPopover,
                        null,
                        h('span', { className: 'font-semibold text-[#af52de]' }, 'YTD Pace Benchmark:'),
                        h('br'),
                        kpi.paceBasis === 'seasonal'
                            ? 'คำนวณเป้าสะสมที่ควรทำได้ ณ เดือนปัจจุบัน โดยถ่วงน้ำหนักตามสัดส่วนฤดูกาลจริงของปี 2025 (Seasonality-Weighted YTD Target)'
                            : 'คำนวณเป้าสะสมตามสัดส่วนจำนวนเดือนที่ผ่านไป (Linear Time-Elapsed Target)'
                    )
                ),
                h('div', { className: 'bg-[#af52de]/10 p-2 rounded-full' }, h(Target, { className: 'w-4 h-4 text-[#af52de]' }))
            ),
            h(
                'div',
                null,
                kpi.target26 !== null
                    ? h(
                        React.Fragment,
                        null,
                        h(
                            'div',
                            { className: 'flex justify-between items-end mb-1.5 gap-2' },
                            h('h3', { className: 'text-[26px] sm:text-[32px] leading-tight font-bold text-[#1d1d1f] tracking-tight truncate' }, kpi.target26 === 0 ? 'TBC' : `฿${(kpi.target26 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                            kpi.target26 > 0 && h('span', { className: `text-xs sm:text-sm font-semibold mb-1 shrink-0 ${kpi.progress >= 100 ? 'text-[#34c759]' : 'text-[#0071e3]'}` }, `${(kpi.progress || 0).toFixed(1)}%`)
                        ),
                        kpi.target26 > 0 && h(
                            'div',
                            { className: 'relative w-full bg-[#f5f5f7] rounded-full h-2.5 overflow-hidden' },
                            h('div', {
                                className: `h-full rounded-full transition-all duration-700 ease-out ${kpi.progress >= 100 ? 'bg-[#34c759]' : (hasPace && !isAhead ? 'bg-[#ff9500]' : 'bg-[#0071e3]')}`,
                                style: { width: `${Math.min(kpi.progress || 0, 100)}%` }
                            }),
                            hasPace && kpi.expectedSharePct > 0 && kpi.expectedSharePct < 100 && h('div', {
                                className: 'absolute top-0 bottom-0 w-0.5 bg-[#1d1d1f]/60',
                                style: { left: `${Math.min(99, Math.max(1, kpi.expectedSharePct))}%` },
                                title: `Expected YTD Benchmark: ${kpi.expectedSharePct.toFixed(1)}% (฿${(kpi.ytdTargetBenchmark / 1000000).toFixed(2)}M)`
                            })
                        ),
                        hasPace && h(
                            'div',
                            { className: 'mt-1.5 flex items-center justify-between gap-1 text-[11px] font-semibold' },
                            h(
                                'span',
                                { className: isAhead ? 'text-[#34c759] truncate' : 'text-[#ff9500] truncate' },
                                `${isAhead ? '▲ +' : '▼ '}${(kpi.ytdPacePct || 0).toFixed(1)}% vs YTD Pace`
                            ),
                            h(
                                'span',
                                { className: 'text-[#86868b] shrink-0', title: 'Expected YTD Target Benchmark' },
                                `Pace: ฿${(kpi.ytdTargetBenchmark / 1000000).toFixed(2)}M`
                            )
                        )
                    )
                    : h('div', { className: 'h-full flex items-center justify-center text-[#86868b] font-medium text-sm italic py-2' }, 'N/A')
            )
        );
    });

    const KPIForecastWidget = memo(function KPIForecastWidget({ kpi, showForecast, setShowForecast }) {
        return h(
            'div',
            { className: `bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col justify-between h-full transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-in fade-in zoom-in-95 duration-500 delay-150 ${kpi.forecast26 === null ? 'opacity-60 grayscale' : ''}` },
            h(
                'div',
                { className: 'flex justify-between items-start mb-2' },
                h(
                    'div',
                    { className: 'flex items-center gap-1.5' },
                    h('span', { className: 'text-xs font-semibold text-[#86868b] uppercase tracking-wider' }, 'Forecast 2026'),
                    h(
                        InfoPopover,
                        null,
                        h('span', { className: 'font-semibold text-[#0071e3]' }, 'วิธีคำนวณ (Dynamic Projection):'),
                        h('br'),
                        'อิงยอดขายสะสมทั้งปีปัจจุบันเทียบกับสัดส่วนฤดูกาล (Seasonality) ของปี 2025 ในช่วงเวลาเดียวกัน',
                        h('br'),
                        h('br'),
                        h('span', { className: 'text-[#86868b] italic' }, '*หากไม่มีประวัติ จะใช้สมการ Linear Run Rate อัตโนมัติ')
                    )
                ),
                kpi.forecast26 !== null && h(
                    'button',
                    {
                        type: 'button',
                        onClick: () => setShowForecast(!showForecast),
                        className: 'no-print text-[#86868b] hover:text-[#0071e3] transition-colors bg-[#f5f5f7] hover:bg-[#0071e3]/10 p-2 rounded-full'
                    },
                    showForecast ? h(EyeOff, { className: 'w-4 h-4' }) : h(Eye, { className: 'w-4 h-4' })
                )
            ),
            h(
                'div',
                null,
                kpi.forecast26 !== null
                    ? (showForecast
                        ? h(
                            'div',
                            { className: 'animate-in fade-in slide-in-from-bottom-2 duration-300' },
                            h(
                                'h3',
                                { className: `text-[26px] sm:text-[32px] leading-tight font-bold tracking-tight truncate ${kpi.forecastStatus?.isMissing ? 'text-[#ff9500]' : 'text-[#1d1d1f]'}` },
                                kpi.forecast26 === 0 ? 'TBC' : `฿${(kpi.forecast26 || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            ),
                            h(
                                'div',
                                { className: 'flex items-center gap-1.5 mt-1' },
                                h(Sparkles, { className: 'w-3.5 h-3.5 text-[#32ade6] shrink-0' }),
                                h(
                                    'span',
                                    { className: 'text-xs text-[#86868b] font-medium tracking-wide truncate' },
                                    'Data-Driven Projection',
                                    kpi.forecastStatus && h(
                                        'span',
                                        { className: kpi.forecastStatus.isMissing ? 'text-[#ff9500] font-semibold ml-1' : 'text-[#34c759] font-semibold ml-1' },
                                        `(${(kpi.forecastStatus.percent || 0).toFixed(1)}% of Target)`
                                    )
                                )
                            )
                        )
                        : h(
                            'div',
                            { className: 'flex flex-col justify-center h-[64px] sm:h-[72px]' },
                            h(
                                'button',
                                {
                                    type: 'button',
                                    onClick: () => setShowForecast(true),
                                    className: 'no-print flex items-center justify-center gap-2 text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors bg-[#f5f5f7] hover:bg-[#e8e8ed] px-4 py-2.5 rounded-[12px] w-full shadow-sm'
                                },
                                h(Eye, { className: 'w-4 h-4' }),
                                ' Tap to reveal'
                            )
                        ))
                    : h('div', { className: 'text-[26px] sm:text-[32px] font-semibold text-[#d1d1d6]' }, 'N/A')
            )
        );
    });

    const KPIPlanWidget = memo(function KPIPlanWidget({ kpi }) {
        return h(
            'div',
            { className: `bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col justify-between h-full transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] animate-in fade-in zoom-in-95 duration-500 delay-200 ${kpi.plan27 === null ? 'opacity-60 grayscale' : ''}` },
            h(
                'div',
                { className: 'flex justify-between items-start mb-2' },
                h('span', { className: 'text-xs font-semibold text-[#86868b] uppercase tracking-wider' }, 'Plan 2027'),
                h('div', { className: 'bg-[#34c759]/10 p-2 rounded-full' }, h(Target, { className: 'w-4 h-4 text-[#34c759]' }))
            ),
            h(
                'div',
                null,
                kpi.plan27 !== null
                    ? h(
                        React.Fragment,
                        null,
                        h('h3', { className: 'text-[26px] sm:text-[32px] leading-tight font-bold text-[#1d1d1f] tracking-tight truncate' }, kpi.plan27 === 0 ? 'TBC' : `฿${(kpi.plan27 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                        kpi.plan27 > 0 && h(
                            'div',
                            { className: `text-xs sm:text-sm mt-1 font-medium flex items-center gap-1 ${kpi.growthPlan >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}` },
                            `${kpi.growthPlan >= 0 ? '▲' : '▼'} ${Math.abs(kpi.growthPlan || 0).toFixed(1)}% vs Target 26`
                        )
                    )
                    : h('div', { className: 'text-[26px] sm:text-[32px] font-semibold text-[#d1d1d6]' }, 'N/A')
            )
        );
    });

    const TrendInsightAnnotation = memo(function TrendInsightAnnotation(props) {
        const { x, y, value, index, data, onInsightClick } = props || {};
        if (value === 0 || value === undefined || value === null) return null;

        const pointData = data ? data[index] : null;
        const cx = props.width && !Number.isNaN(props.width) ? x + props.width / 2 : x;
        const cy = !Number.isNaN(y) ? y - 10 : y;
        if (Number.isNaN(cx) || Number.isNaN(cy)) return null;

        const valInM = Number(value) / 1000000;
        const formatted = valInM < 1 ? `${(valInM || 0).toFixed(2)}M` : `${(valInM || 0).toFixed(1)}M`;

        if (!pointData || !pointData.isLatest || !pointData.insights) {
            return h('text', { x: cx, y: cy, fill: '#86868b', textAnchor: 'middle', fontSize: 10, fontWeight: 600 }, formatted);
        }

        const handleOpen = (e) => {
            if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
            if (onInsightClick) onInsightClick(pointData.insights);
        };

        return h(
            'g',
            { className: 'cursor-pointer', onClick: handleOpen },
            h('rect', { x: cx - 48, y: cy - 38, width: 96, height: 58, fill: 'transparent' }),
            h('text', { x: cx, y: cy - 5, fill: '#0071e3', textAnchor: 'middle', fontSize: 12, fontWeight: 800 }, formatted),
            h('circle', { cx: cx, cy: cy + 10, r: 5, fill: '#fff', stroke: '#0071e3', strokeWidth: 2.5 }),
            h('circle', { cx: cx, cy: cy + 10, r: 14, fill: '#0071e3', opacity: 0.3, className: 'no-print animate-ping', style: { transformOrigin: `${cx}px ${cy + 10}px`, animationDuration: '2s' } }),
            h('rect', { x: cx - 45, y: cy - 35, width: 90, height: 16, rx: 8, fill: '#ff9500', opacity: 0.95, className: 'no-print' }),
            h('text', { x: cx, y: cy - 24, fill: '#fff', textAnchor: 'middle', fontSize: 8, fontWeight: 700, className: 'no-print', style: { pointerEvents: 'none' } }, 'TAP FOR INSIGHTS')
        );
    });

    const TrendChartWidget = memo(function TrendChartWidget({ trendChartData, show2025Trend, setShow2025Trend, yAxisTicks }) {
        const [selectedInsight, setSelectedInsight] = useState(null);
        const [showProjection, setShowProjection] = useState(true);

        const latestInsight = useMemo(() => {
            const pt = (trendChartData || []).find((d) => d && d.isLatest && d.insights);
            return pt ? pt.insights : null;
        }, [trendChartData]);

        useEffect(() => {
            if (!selectedInsight || typeof window === 'undefined') return undefined;
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') setSelectedInsight(null);
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }, [selectedInsight]);

        const topProducts = selectedInsight?.topProducts || [];
        const topChannels = selectedInsight?.topChannels || [];

        return h(
            React.Fragment,
            null,
            h(
                'div',
                { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] lg:col-span-2 relative' },
                h(
                    'div',
                    { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 sm:mb-6 gap-3' },
                    h(
                        'h3',
                        { className: 'text-base font-bold text-[#1d1d1f] flex items-center gap-2' },
                        h(TrendingUp, { className: 'w-5 h-5 text-[#0071e3] shrink-0' }),
                        'Sales Trend 2025 vs 2026 (Total)'
                    ),
                    h(
                        'div',
                        { className: 'no-print flex items-center gap-2 sm:gap-2.5 flex-wrap' },
                        latestInsight && h(
                            'button',
                            {
                                type: 'button',
                                onClick: () => setSelectedInsight(latestInsight),
                                className: 'flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 sm:py-1.5 rounded-full bg-[#ff9500]/15 text-[#d49b00] border border-[#ff9500]/30 hover:bg-[#ff9500] hover:text-white transition-colors shadow-sm active:scale-95'
                            },
                            h(Sparkles, { className: 'w-3.5 h-3.5' }),
                            `${latestInsight.month} Insights`
                        ),
                        h(
                            'button',
                            {
                                type: 'button',
                                onClick: () => setShowProjection(!showProjection),
                                className: `flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 sm:py-1.5 rounded-full transition-colors ${showProjection ? 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]' : 'bg-white text-[#86868b] border border-black/5 hover:bg-[#f5f5f7]'}`
                            },
                            h('div', { className: 'w-3 h-0.5 border-b-2 border-dashed border-[#ff9500]' }),
                            showProjection ? 'Hide Projection' : 'Show Projection'
                        ),
                        h(
                            'button',
                            {
                                type: 'button',
                                onClick: () => setShow2025Trend(!show2025Trend),
                                className: `text-xs font-semibold px-3.5 py-2 sm:py-1.5 rounded-full transition-colors ${show2025Trend ? 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]' : 'bg-white text-[#86868b] border border-black/5 hover:bg-[#f5f5f7]'}`
                            },
                            show2025Trend ? 'Hide 2025' : 'Show 2025'
                        )
                    )
                ),
                h(
                    'div',
                    { className: 'h-64 sm:h-72' },
                    h(
                        ResponsiveContainer,
                        { width: '100%', height: '100%' },
                        h(
                            ComposedChart,
                            { data: trendChartData || [], margin: { top: 28, right: 16, left: -20, bottom: 0 } },
                            h(
                                'defs',
                                null,
                                h(
                                    'linearGradient',
                                    { id: 'color26', x1: '0', y1: '0', x2: '0', y2: '1' },
                                    h('stop', { offset: '5%', stopColor: '#0071e3', stopOpacity: 0.3 }),
                                    h('stop', { offset: '95%', stopColor: '#0071e3', stopOpacity: 0 })
                                )
                            ),
                            h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, stroke: '#e5e5ea' }),
                            h(XAxis, { dataKey: 'name', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, axisLine: false, tickLine: false }),
                            h(YAxis, {
                                domain: [0, yAxisTicks[yAxisTicks.length - 1] || 'auto'],
                                ticks: yAxisTicks,
                                tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' },
                                tickFormatter: (v) => `${((v || 0) / 1000000).toFixed(0)}M`,
                                axisLine: false,
                                tickLine: false
                            }),
                            h(Tooltip, {
                                cursor: { fill: '#f5f5f7', strokeWidth: 1, stroke: '#e5e5ea', strokeDasharray: '3 3' },
                                contentStyle: { borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' },
                                formatter: (v, name) => [`฿${((v || 0) / 1000000).toFixed(2)}M`, name === 'proj26' ? '2026 Projection' : (name === 'sales26' ? '2026 Actual' : '2025 Actual')]
                            }),
                            h(Legend, { wrapperStyle: { fontSize: '12px', fontWeight: '500', color: '#86868b' } }),
                            show2025Trend && h(Line, { type: 'monotone', dataKey: 'sales25', name: '2025 Actual', stroke: '#86868b', strokeWidth: 2, strokeDasharray: '5 5', dot: { r: 2, fill: '#86868b' }, activeDot: { r: 4, strokeWidth: 0 } }),
                            showProjection && h(Line, { type: 'monotone', dataKey: 'proj26', name: '2026 Projection', stroke: '#ff9500', strokeWidth: 2.5, strokeDasharray: '6 4', dot: { r: 2, fill: '#ff9500' }, activeDot: { r: 4, strokeWidth: 0 } }),
                            h(
                                Area,
                                { type: 'monotone', dataKey: 'sales26', name: '2026 Actual', stroke: '#0071e3', strokeWidth: 3, fillOpacity: 1, fill: 'url(#color26)', dot: { r: 3, fill: '#0071e3' }, activeDot: { r: 5, strokeWidth: 0 } },
                                h(LabelList, { dataKey: 'sales26', position: 'top', content: (props) => h(TrendInsightAnnotation, { ...props, data: trendChartData, onInsightClick: setSelectedInsight }) })
                            )
                        )
                    )
                )
            ),
            selectedInsight && h(
                ModalPortal,
                null,
                h(
                    'div',
                    {
                        className: 'no-print fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200',
                        onClick: (e) => { if (e.target === e.currentTarget) setSelectedInsight(null); }
                    },
                    h(
                        'div',
                        { className: 'bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-black/10 flex flex-col animate-in zoom-in-95 duration-200' },
                        h(
                            'div',
                            { className: 'p-5 border-b border-black/5 flex justify-between items-start bg-[#f5f5f7]/60' },
                            h(
                                'div',
                                null,
                                h('h3', { className: 'text-[10px] font-bold text-[#0071e3] uppercase tracking-wider mb-1' }, 'Monthly Highlights'),
                                h(
                                    'div',
                                    { className: 'flex flex-wrap items-center gap-2.5' },
                                    h('h2', { className: 'text-lg font-extrabold text-[#1d1d1f] leading-tight' }, `${selectedInsight.month} Performance Drivers`),
                                    selectedInsight.sales > 0 && h(
                                        'span',
                                        { className: 'text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3]' },
                                        `Total: ฿${(selectedInsight.sales / 1000000).toFixed(2)}M`
                                    )
                                )
                            ),
                            h(
                                'button',
                                { type: 'button', onClick: () => setSelectedInsight(null), className: 'text-[#86868b] hover:text-[#1d1d1f] bg-[#e8e8ed] hover:bg-[#d1d1d6] p-2 rounded-full transition-colors' },
                                h(X, { className: 'w-4 h-4' })
                            )
                        ),
                        h(
                            'div',
                            { className: 'p-5 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6 bg-white' },
                            h(
                                'div',
                                null,
                                h('h4', { className: 'text-xs font-extrabold text-[#86868b] uppercase tracking-wider mb-3 flex items-center gap-2' }, h(Package, { className: 'w-4 h-4 text-[#34c759]' }), ' Top 3 Products'),
                                h(
                                    'div',
                                    { className: 'space-y-3' },
                                    topProducts.length > 0
                                        ? topProducts.map((p) => h(
                                            'div',
                                            { key: p.name, className: 'bg-[#f5f5f7] p-3 rounded-xl border border-black/5 flex flex-col gap-2' },
                                            h('div', { className: 'font-semibold text-sm text-[#1d1d1f] truncate', title: p.name }, p.name),
                                            h(
                                                'div',
                                                { className: 'flex justify-between items-end border-t border-black/5 pt-2' },
                                                h('div', { className: 'flex flex-col' }, h('span', { className: 'text-[10px] text-[#86868b] font-medium' }, 'Sales'), h('span', { className: 'font-bold text-[#34c759]' }, `฿${((p.val26 || 0) / 1000000).toFixed(2)}M`)),
                                                h('div', { className: 'flex flex-col text-center' }, h('span', { className: 'text-[10px] text-[#86868b] font-medium' }, 'Mix'), h('span', { className: 'font-bold text-[#1d1d1f]' }, `${(p.pct || 0).toFixed(1)}%`)),
                                                h(
                                                    'div',
                                                    { className: 'flex flex-col text-right' },
                                                    h('span', { className: 'text-[10px] text-[#86868b] font-medium' }, 'YoY Grw.'),
                                                    h(
                                                        'span',
                                                        { className: `font-bold ${p.yoy >= 0 ? 'text-[#34c759]' : (p.yoy === null ? 'text-[#86868b]' : 'text-[#ff3b30]')}` },
                                                        p.yoy !== null ? (p.yoy >= 0 ? `▲ ${p.yoy.toFixed(1)}%` : `▼ ${Math.abs(p.yoy).toFixed(1)}%`) : 'N/A'
                                                    )
                                                )
                                            )
                                        ))
                                        : h('div', { className: 'bg-[#f5f5f7] p-4 rounded-xl border border-black/5 text-xs text-[#86868b] text-center font-medium' }, 'No positive product sales in this selection.')
                                )
                            ),
                            h(
                                'div',
                                null,
                                h('h4', { className: 'text-xs font-extrabold text-[#86868b] uppercase tracking-wider mb-3 flex items-center gap-2' }, h(Store, { className: 'w-4 h-4 text-[#0071e3]' }), ' Top 3 Sub-Channels'),
                                h(
                                    'div',
                                    { className: 'space-y-3' },
                                    topChannels.length > 0
                                        ? topChannels.map((c) => h(
                                            'div',
                                            { key: c.name, className: 'bg-[#f5f5f7] p-3 rounded-xl border border-black/5 flex flex-col gap-2' },
                                            h(
                                                'div',
                                                { className: 'flex items-center justify-between gap-2' },
                                                h('div', { className: 'font-semibold text-sm text-[#1d1d1f] truncate', title: c.name }, c.name),
                                                c.parentChannel && h('span', { className: 'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-[#86868b] border border-black/5 shrink-0' }, c.parentChannel)
                                            ),
                                            h(
                                                'div',
                                                { className: 'flex justify-between items-end border-t border-black/5 pt-2' },
                                                h(
                                                    'div',
                                                    { className: 'flex flex-col' },
                                                    h('span', { className: 'text-[10px] text-[#86868b] font-medium' }, 'Sales 26 / 25'),
                                                    h('span', { className: 'font-bold text-[#0071e3]' }, `฿${((c.val26 || 0) / 1000000).toFixed(2)}M `, h('span', { className: 'text-[10px] font-normal text-[#86868b]' }, `vs ฿${((c.val25 || 0) / 1000000).toFixed(2)}M`))
                                                ),
                                                h('div', { className: 'flex flex-col text-center' }, h('span', { className: 'text-[10px] text-[#86868b] font-medium' }, 'Mix'), h('span', { className: 'font-bold text-[#1d1d1f]' }, `${(c.pct || 0).toFixed(1)}%`)),
                                                h(
                                                    'div',
                                                    { className: 'flex flex-col text-right' },
                                                    h('span', { className: 'text-[10px] text-[#86868b] font-medium' }, 'YoY Grw.'),
                                                    h(
                                                        'span',
                                                        { className: `font-bold ${c.yoy >= 0 ? 'text-[#34c759]' : (c.yoy === null ? 'text-[#86868b]' : 'text-[#ff3b30]')}` },
                                                        c.yoy !== null ? (c.yoy >= 0 ? `▲ ${c.yoy.toFixed(1)}%` : `▼ ${Math.abs(c.yoy).toFixed(1)}%`) : 'New / N/A'
                                                    )
                                                )
                                            )
                                        ))
                                        : h('div', { className: 'bg-[#f5f5f7] p-4 rounded-xl border border-black/5 text-xs text-[#86868b] text-center font-medium' }, 'No positive sub-channel sales in this selection.')
                                )
                            )
                        )
                    )
                )
            )
        );
    });

    const ChannelMixWidget = memo(function ChannelMixWidget({ channelMix, kpi }) {
        const safeMix = channelMix || [];
        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col' },
            h('h3', { className: 'text-base font-bold text-[#1d1d1f] mb-4 flex items-center gap-2' }, h(PieIcon, { className: 'w-5 h-5 text-[#af52de]' }), ' Channel Mix 2026'),
            h(
                'div',
                { className: 'h-48 relative' },
                h(
                    ResponsiveContainer,
                    { width: '100%', height: '100%' },
                    h(
                        PieChart,
                        null,
                        h(
                            Pie,
                            { data: safeMix.filter((m) => m.value > 0), innerRadius: 55, outerRadius: 80, paddingAngle: 2, dataKey: 'value', stroke: 'none' },
                            safeMix.filter((m) => m.value > 0).map((e, i) => h(Cell, { key: e.name, fill: APPLE_PALETTE[i % APPLE_PALETTE.length] }))
                        ),
                        h(Tooltip, {
                            formatter: (v) => `฿${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                            contentStyle: { fontWeight: '500', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }
                        })
                    )
                ),
                h(
                    'div',
                    { className: 'absolute inset-0 flex items-center justify-center pointer-events-none' },
                    h(
                        'div',
                        { className: 'text-center mt-1' },
                        h('div', { className: 'text-[10px] font-semibold text-[#86868b] uppercase tracking-wider' }, 'Total'),
                        h('div', { className: 'text-sm font-bold text-[#1d1d1f]' }, (kpi.s26 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }))
                    )
                )
            ),
            h(
                'div',
                { className: 'mt-4 space-y-1.5 max-h-40 overflow-y-auto pr-2 custom-scrollbar' },
                safeMix.map((item, idx) => {
                    const percent = kpi.s26 > 0 ? ((item.value / kpi.s26) * 100).toFixed(1) : '0.0';
                    return h(
                        'div',
                        { key: item.name, className: 'flex justify-between items-center text-sm py-1' },
                        h(
                            'div',
                            { className: 'flex items-center gap-2.5 min-w-0' },
                            h('div', { className: 'w-2.5 h-2.5 rounded-full shadow-sm shrink-0', style: { backgroundColor: APPLE_PALETTE[idx % APPLE_PALETTE.length] } }),
                            h('span', { className: 'text-[#1d1d1f] font-medium truncate' }, item.name)
                        ),
                        h(
                            'div',
                            { className: 'text-right flex items-center gap-2 shrink-0' },
                            h('span', { className: 'font-semibold text-[#1d1d1f]' }, `฿${(item.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                            h('span', { className: 'text-xs text-[#86868b] font-medium w-10 text-right' }, `${percent}%`)
                        )
                    );
                })
            )
        );
    });

    const CategoryTrendWidget = memo(function CategoryTrendWidget({ filteredData, monthsList }) {
        const { chartData, activeGroups } = useMemo(() => {
            const monthlyMap = {};
            const groupTotals = {};
            GROUP_ORDER.forEach((g) => { groupTotals[g] = 0; });

            monthsList.forEach((m) => {
                monthlyMap[m] = { name: m, Total: 0 };
                GROUP_ORDER.forEach((g) => { monthlyMap[m][g] = 0; });
            });

            const arr = filteredData || [];
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (!d || d.Year !== '2026') continue;
                const m = d.MonthShort;
                const g = d.ProductGroup;
                const val = Number(d.NetPrice) || 0;
                if (m && monthlyMap[m] && groupTotals[g] !== undefined) {
                    monthlyMap[m][g] += val;
                    monthlyMap[m].Total += val;
                    groupTotals[g] += val;
                }
            }

            const rawData = monthsList.map((m) => monthlyMap[m]);
            let lastActiveIndex = -1;
            for (let i = rawData.length - 1; i >= 0; i--) {
                if (GROUP_ORDER.some((g) => rawData[i][g] > 0)) {
                    lastActiveIndex = i;
                    break;
                }
            }

            const finalChartData = rawData.map((row, idx) => {
                if (idx > lastActiveIndex) {
                    const newRow = { name: row.name, Total: null };
                    GROUP_ORDER.forEach((g) => { newRow[g] = null; });
                    return newRow;
                }
                return row;
            });

            return {
                chartData: finalChartData,
                activeGroups: GROUP_ORDER.filter((g) => groupTotals[g] > 0)
            };
        }, [filteredData, monthsList]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04]' },
            h(
                'div',
                { className: 'flex justify-between items-center mb-5 sm:mb-6' },
                h(
                    'div',
                    null,
                    h('h3', { className: 'text-base font-bold text-[#1d1d1f] flex items-center gap-2' }, h(Activity, { className: 'w-5 h-5 text-[#af52de]' }), ' Category Sales Trend (2026)'),
                    h('p', { className: 'text-xs text-[#86868b] font-medium mt-1' }, 'Monthly performance breakdown with total sales overlay')
                )
            ),
            h(
                'div',
                { className: 'h-64 sm:h-72' },
                activeGroups.length > 0
                    ? h(
                        ResponsiveContainer,
                        { width: '100%', height: '100%' },
                        h(
                            ComposedChart,
                            { data: chartData, margin: { top: 10, right: 0, left: -20, bottom: 0 } },
                            h(
                                'defs',
                                null,
                                h(
                                    'linearGradient',
                                    { id: 'colorTotalTrend', x1: '0', y1: '0', x2: '0', y2: '1' },
                                    h('stop', { offset: '5%', stopColor: '#1d1d1f', stopOpacity: 0.1 }),
                                    h('stop', { offset: '95%', stopColor: '#1d1d1f', stopOpacity: 0 })
                                )
                            ),
                            h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, stroke: '#e5e5ea' }),
                            h(XAxis, { dataKey: 'name', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, axisLine: false, tickLine: false }),
                            h(YAxis, { yAxisId: 'left', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, tickFormatter: (v) => `${((v || 0) / 1000000).toFixed(0)}M`, axisLine: false, tickLine: false }),
                            h(YAxis, { yAxisId: 'right', orientation: 'right', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, tickFormatter: (v) => `${((v || 0) / 1000000).toFixed(0)}M`, axisLine: false, tickLine: false }),
                            h(Tooltip, {
                                cursor: { stroke: '#e5e5ea', strokeDasharray: '3 3' },
                                contentStyle: { borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' },
                                formatter: (v) => `฿${((v || 0) / 1000000).toFixed(2)}M`
                            }),
                            h(Legend, { wrapperStyle: { fontSize: '11px', fontWeight: '500', color: '#86868b' } }),
                            h(Area, { yAxisId: 'right', type: 'monotone', dataKey: 'Total', name: 'Total Sales', fill: 'url(#colorTotalTrend)', stroke: '#1d1d1f', strokeDasharray: '5 5', strokeWidth: 2, dot: { r: 2, fill: '#1d1d1f' }, activeDot: { r: 4, strokeWidth: 0 }, connectNulls: false }),
                            activeGroups.map((g) => h(Line, {
                                key: g,
                                yAxisId: 'left',
                                type: 'monotone',
                                dataKey: g,
                                name: g,
                                stroke: GROUP_HEX[g] || '#86868b',
                                strokeWidth: 2.5,
                                dot: { r: 3, fill: GROUP_HEX[g] || '#86868b' },
                                activeDot: { r: 5, strokeWidth: 0 },
                                connectNulls: false
                            }))
                        )
                    )
                    : h('div', { className: 'h-full flex items-center justify-center text-[#86868b] font-medium text-sm' }, 'No trend data available')
            )
        );
    });

    const SubProductAnalysisWidget = memo(function SubProductAnalysisWidget({ filteredData, valid2026Months, monthsList }) {
        const [drillDownPath, setDrillDownPath] = useState(null);
        const [activeSub, setActiveSub] = useState(null);
        const [activeSku, setActiveSku] = useState(null);
        const [healthFilter, setHealthFilter] = useState('all');
        const [show2025Trend, setShow2025Trend] = useState(true);

        const currentList = useMemo(() => {
            const map = {};
            const arr = filteredData || [];
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (!d) continue;
                if (drillDownPath && d.SubProductGroup !== drillDownPath) continue;

                const key = drillDownPath ? (d.GroupSKU || 'Unknown') : (d.SubProductGroup || 'Unknown');
                if (!map[key]) {
                    map[key] = { name: key, group: d.ProductGroup || 'Unknown', s26: 0, s25: 0 };
                }
                if (d.Year === '2026') {
                    map[key].s26 += Number(d.NetPrice) || 0;
                } else if (d.Year === '2025' && valid2026Months.has(d.MonthIndex)) {
                    map[key].s25 += Number(d.NetPrice) || 0;
                }
            }

            const rawList = Object.values(map).map((item) => {
                const yoy = item.s25 > 0 ? ((item.s26 - item.s25) / item.s25) * 100 : null;
                let status = 'none';
                if (yoy !== null) {
                    if (yoy >= 0) status = 'healthy';
                    else if (yoy >= -10) status = 'watch';
                    else status = 'risk';
                }
                return { ...item, yoy, status };
            }).sort((a, b) => b.s26 - a.s26);

            const counts = { healthy: 0, watch: 0, risk: 0 };
            rawList.forEach((i) => { if (counts[i.status] !== undefined) counts[i.status]++; });

            return {
                data: healthFilter === 'all' ? rawList : rawList.filter((i) => i.status === healthFilter),
                counts
            };
        }, [filteredData, valid2026Months, drillDownPath, healthFilter]);

        const totalWidgetSales = useMemo(
            () => (currentList.data || []).reduce((acc, curr) => acc + (curr.s26 || 0), 0),
            [currentList.data]
        );

        useEffect(() => {
            if ((currentList.data || []).length > 0) {
                if (drillDownPath) {
                    if (!activeSku || !currentList.data.find((i) => i.name === activeSku)) setActiveSku(currentList.data[0].name);
                } else if (!activeSub || !currentList.data.find((i) => i.name === activeSub)) {
                    setActiveSub(currentList.data[0].name);
                }
            } else if (drillDownPath) {
                setActiveSku(null);
            } else {
                setActiveSub(null);
            }
        }, [currentList, drillDownPath, activeSku, activeSub]);

        const activeName = drillDownPath ? activeSku : activeSub;

        const { activeItemStats, chartData } = useMemo(() => {
            if (!activeName) return { activeItemStats: { sales: 0, yoy: null }, chartData: [] };
            const isSkuView = !!drillDownPath;
            const m25 = new Array(12).fill(0);
            const m26 = new Array(12).fill(0);
            let s26 = 0, s25 = 0;

            const arr = filteredData || [];
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (!d) continue;
                if (isSkuView && d.SubProductGroup !== drillDownPath) continue;
                const itemMatch = isSkuView ? (d.GroupSKU || 'Unknown') === activeName : (d.SubProductGroup || 'Unknown') === activeName;
                if (!itemMatch) continue;

                const val = Number(d.NetPrice) || 0;
                const mIdx = d.MonthIndex >= 1 && d.MonthIndex <= 12 ? d.MonthIndex - 1 : -1;

                if (d.Year === '2026') {
                    s26 += val;
                    if (mIdx >= 0) m26[mIdx] += val;
                } else if (d.Year === '2025') {
                    if (valid2026Months.has(d.MonthIndex)) s25 += val;
                    if (mIdx >= 0) m25[mIdx] += val;
                }
            }

            const yoy = s25 > 0 ? ((s26 - s25) / s25) * 100 : null;
            const cData = (monthsList || []).map((m, idx) => ({
                name: m,
                sales25: m25[idx] === 0 ? null : m25[idx],
                sales26: m26[idx] === 0 ? null : m26[idx]
            }));

            return { activeItemStats: { sales: s26, yoy }, chartData: cData };
        }, [filteredData, activeName, drillDownPath, valid2026Months, monthsList]);

        const yAxisTicks = useMemo(() => {
            const maxVal = (chartData || []).reduce((max, d) => {
                const val25 = show2025Trend ? (d.sales25 || 0) : 0;
                return Math.max(max, val25, d.sales26 || 0);
            }, 0);
            return computeNiceYAxisTicks(maxVal, 1000000);
        }, [chartData, show2025Trend]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col' },
            h(
                'div',
                { className: 'flex justify-between items-center mb-5 sm:mb-6' },
                h(
                    'div',
                    { className: 'flex items-center gap-3' },
                    h('div', { className: 'bg-[#30b0c7]/10 p-2 rounded-xl flex-shrink-0' }, h(Layers, { className: 'w-5 h-5 text-[#30b0c7]' })),
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex flex-wrap items-center gap-2' },
                            h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'Executive Health Check'),
                            h('span', { className: 'bg-[#f5f5f7] text-[#1d1d1f] px-2 py-0.5 rounded-md text-xs font-bold border border-black/5 shadow-sm' }, `Total: ฿${((totalWidgetSales || 0) / 1000000).toFixed(2)}M`),
                            h(
                                InfoPopover,
                                null,
                                h('span', { className: 'font-bold text-[#1d1d1f]' }, 'หลักการประเมินสถานะสุขภาพ (Health Criteria):'),
                                h('br'),
                                h('br'),
                                h('span', { className: 'font-bold text-[#34c759]' }, '🟢 Healthy (เขียว): '),
                                'YoY Growth ≥ 0% (เติบโตขึ้นหรือทรงตัว)',
                                h('br'),
                                h('span', { className: 'font-bold text-[#ff9500]' }, '🟡 Watch (เหลือง): '),
                                '-10% ≤ YoY Growth < 0% (ยอดขายลดลงเล็กน้อยในเกณฑ์เฝ้าระวัง)',
                                h('br'),
                                h('span', { className: 'font-bold text-[#ff3b30]' }, '🔴 Risk (แดง): '),
                                'YoY Growth < -10% (ยอดขายหดตัวรุนแรงต้องเข้าแก้ไข)'
                            )
                        ),
                        h('p', { className: 'text-xs text-[#86868b] font-medium mt-0.5' }, 'Select an item to view trends or drill down')
                    )
                )
            ),
            h(
                'div',
                { className: 'grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 h-auto lg:h-[350px]' },
                h(
                    'div',
                    { className: 'flex flex-col h-[280px] lg:h-full bg-[#f5f5f7]/50 rounded-xl border border-black/5 overflow-hidden' },
                    h(
                        'div',
                        { className: 'p-3 bg-white border-b border-black/5 flex flex-col gap-2.5 shadow-sm z-10' },
                        h(
                            'div',
                            { className: 'flex items-center justify-between' },
                            drillDownPath
                                ? h(
                                    'button',
                                    { type: 'button', onClick: () => setDrillDownPath(null), className: 'flex items-center gap-1.5 text-[#0071e3] text-xs font-bold hover:text-[#0077ED] transition-colors py-0.5' },
                                    h(ArrowLeft, { className: 'w-3.5 h-3.5' }),
                                    ' Back to Sub-Products'
                                )
                                : h('span', { className: 'text-[#86868b] text-xs font-bold uppercase tracking-wider pl-1' }, 'Sub-Product List')
                        ),
                        h(
                            'div',
                            { className: 'no-print flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5' },
                            h('button', { type: 'button', onClick: () => setHealthFilter('all'), className: `px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors shrink-0 ${healthFilter === 'all' ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'}` }, 'All'),
                            h('button', { type: 'button', onClick: () => setHealthFilter('healthy'), className: `px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors flex items-center gap-1.5 shrink-0 ${healthFilter === 'healthy' ? 'bg-[#34c759]/20 text-[#34c759]' : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'}` }, h('div', { className: 'w-1.5 h-1.5 rounded-full bg-[#34c759]' }), `Healthy (${currentList.counts?.healthy || 0})`),
                            h('button', { type: 'button', onClick: () => setHealthFilter('watch'), className: `px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors flex items-center gap-1.5 shrink-0 ${healthFilter === 'watch' ? 'bg-[#ff9500]/20 text-[#ff9500]' : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'}` }, h('div', { className: 'w-1.5 h-1.5 rounded-full bg-[#ff9500]' }), `Watch (${currentList.counts?.watch || 0})`),
                            h('button', { type: 'button', onClick: () => setHealthFilter('risk'), className: `px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors flex items-center gap-1.5 shrink-0 ${healthFilter === 'risk' ? 'bg-[#ff3b30]/20 text-[#ff3b30]' : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'}` }, h('div', { className: 'w-1.5 h-1.5 rounded-full bg-[#ff3b30]' }), `Risk (${currentList.counts?.risk || 0})`)
                        )
                    ),
                    h(
                        'div',
                        { className: 'flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2' },
                        (currentList.data || []).map((item, idx) => {
                            const isActive = drillDownPath ? item.name === activeSku : item.name === activeSub;
                            let statusColor = 'bg-transparent';
                            if (item.status === 'healthy') statusColor = 'bg-[#34c759]';
                            else if (item.status === 'watch') statusColor = 'bg-[#ff9500]';
                            else if (item.status === 'risk') statusColor = 'bg-[#ff3b30]';

                            return h(
                                'div',
                                {
                                    key: item.name,
                                    onClick: () => (drillDownPath ? setActiveSku(item.name) : setActiveSub(item.name)),
                                    className: `p-3 rounded-xl border cursor-pointer transition-all relative overflow-hidden h-auto min-h-fit flex-shrink-0 ${isActive ? 'bg-[#30b0c7]/10 border-[#30b0c7]/30 shadow-sm' : 'bg-white border-black/5 hover:bg-[#e8e8ed]'}`
                                },
                                h('div', { className: `absolute left-0 top-0 w-1.5 h-full ${statusColor}` }),
                                h(
                                    'div',
                                    { className: 'flex justify-between items-start mb-2 pl-2' },
                                    h(
                                        'div',
                                        { className: 'flex flex-col gap-1.5 w-full pr-2' },
                                        h('span', { className: `text-sm font-bold leading-normal break-words ${isActive ? 'text-[#30b0c7]' : 'text-[#1d1d1f]'}`, title: item.name }, item.name),
                                        h('span', { className: `w-max text-[9px] px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider ${GROUP_COLORS[item.group] || 'bg-gray-100 text-gray-500'}` }, item.group)
                                    ),
                                    h('span', { className: 'text-[10px] font-semibold text-[#86868b] shrink-0 mt-0.5' }, `#${idx + 1}`)
                                ),
                                h(
                                    'div',
                                    { className: 'flex justify-between items-end border-t border-black/5 pt-2 pl-2 pb-0.5' },
                                    h('span', { className: 'text-xs font-semibold text-[#1d1d1f]' }, `฿${((item.s26 || 0) / 1000000).toFixed(2)}M`),
                                    h(
                                        'div',
                                        { className: 'flex items-center gap-2' },
                                        item.yoy !== null
                                            ? h('span', { className: `text-[11px] font-bold ${item.yoy >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}` }, `${item.yoy >= 0 ? '▲' : '▼'} ${Math.abs(item.yoy).toFixed(1)}%`)
                                            : h('span', { className: 'text-[11px] font-medium text-[#86868b]' }, 'N/A'),
                                        !drillDownPath && isActive && h(
                                            'button',
                                            {
                                                type: 'button',
                                                onClick: (e) => { e.stopPropagation(); setDrillDownPath(item.name); },
                                                className: 'no-print ml-1 flex items-center gap-1 bg-[#30b0c7] text-white text-[10px] px-2.5 py-1 rounded-md hover:bg-[#2898ac] transition-colors shadow-sm active:scale-95'
                                            },
                                            'SKUs ',
                                            h(ChevronRight, { className: 'w-3 h-3' })
                                        )
                                    )
                                )
                            );
                        }),
                        (currentList.data || []).length === 0 && h(
                            'div',
                            { className: 'h-full flex flex-col items-center justify-center text-[#86868b] opacity-50 py-10' },
                            h(ShoppingBag, { className: 'w-8 h-8 mb-2' }),
                            h('span', { className: 'text-xs font-medium' }, 'No items found')
                        )
                    )
                ),
                h(
                    'div',
                    { className: 'lg:col-span-2 h-[290px] lg:h-full bg-[#f5f5f7]/30 border border-black/5 rounded-xl p-4 flex flex-col' },
                    h(
                        'div',
                        { className: 'flex flex-wrap justify-between items-center mb-4 gap-2' },
                        h(
                            'div',
                            { className: 'min-w-0' },
                            h('h4', { className: 'text-sm font-bold text-[#1d1d1f] truncate max-w-[200px] sm:max-w-[280px] xl:max-w-[360px]', title: activeName || 'Select an item' }, activeName || 'Select an item'),
                            h('p', { className: 'text-[10px] text-[#86868b] font-medium' }, drillDownPath ? 'SKU Trend Comparison' : 'Sub-Product Trend Comparison')
                        ),
                        h(
                            'div',
                            { className: 'flex items-center gap-3' },
                            h(
                                'div',
                                { className: 'flex flex-col items-end' },
                                h('span', { className: 'text-xs font-bold text-[#0071e3]' }, `฿${((activeItemStats.sales || 0) / 1000000).toFixed(2)}M`),
                                activeItemStats.yoy !== null
                                    ? h('span', { className: `text-[10px] font-bold ${activeItemStats.yoy >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}` }, `${activeItemStats.yoy >= 0 ? '▲' : '▼'} ${Math.abs(activeItemStats.yoy).toFixed(1)}% YoY`)
                                    : h('span', { className: 'text-[10px] text-[#86868b]' }, 'N/A YoY')
                            ),
                            h('div', { className: 'h-6 w-px bg-black/10' }),
                            h(
                                'div',
                                { className: 'no-print flex items-center gap-2 sm:gap-3' },
                                h('div', { className: 'flex items-center gap-1.5 text-[10px] font-bold text-[#86868b] uppercase tracking-wider' }, h('div', { className: 'w-3 h-1 rounded-sm bg-[#30b0c7]' }), ' 2026'),
                                h(
                                    'button',
                                    {
                                        type: 'button',
                                        onClick: () => setShow2025Trend(!show2025Trend),
                                        className: `flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md transition-all ${show2025Trend ? 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] shadow-sm' : 'bg-white text-[#86868b] border border-black/5 hover:bg-[#f5f5f7]'}`,
                                        title: show2025Trend ? 'Hide 2025 Trend' : 'Show 2025 Trend'
                                    },
                                    show2025Trend ? h(Eye, { className: 'w-3.5 h-3.5' }) : h(EyeOff, { className: 'w-3.5 h-3.5' }),
                                    h('span', { className: show2025Trend ? '' : 'line-through decoration-[#ff3b30] opacity-60' }, '2025')
                                )
                            )
                        )
                    ),
                    h(
                        'div',
                        { className: 'flex-1 min-h-[190px]' },
                        (chartData || []).some((d) => d.sales25 > 0 || d.sales26 > 0)
                            ? h(
                                ResponsiveContainer,
                                { width: '100%', height: '100%' },
                                h(
                                    ComposedChart,
                                    { data: chartData, margin: { top: 15, right: 8, left: -20, bottom: 0 } },
                                    h(
                                        'defs',
                                        null,
                                        h(
                                            'linearGradient',
                                            { id: 'colorDeepDive', x1: '0', y1: '0', x2: '0', y2: '1' },
                                            h('stop', { offset: '5%', stopColor: '#30b0c7', stopOpacity: 0.4 }),
                                            h('stop', { offset: '95%', stopColor: '#30b0c7', stopOpacity: 0 })
                                        )
                                    ),
                                    h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, stroke: '#e5e5ea' }),
                                    h(XAxis, { dataKey: 'name', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, axisLine: false, tickLine: false }),
                                    h(YAxis, { domain: [0, yAxisTicks[yAxisTicks.length - 1] || 'auto'], ticks: yAxisTicks, tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, tickFormatter: (v) => `${((v || 0) / 1000000).toFixed(1)}M`, axisLine: false, tickLine: false }),
                                    h(Tooltip, {
                                        cursor: { fill: '#f5f5f7', strokeWidth: 1, stroke: '#e5e5ea', strokeDasharray: '3 3' },
                                        contentStyle: { borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' },
                                        formatter: (v) => `฿${((v || 0) / 1000000).toFixed(2)}M`
                                    }),
                                    h(
                                        Area,
                                        { type: 'monotone', dataKey: 'sales26', name: '2026 Sales', stroke: '#30b0c7', strokeWidth: 3, fillOpacity: 1, fill: 'url(#colorDeepDive)', dot: { r: 4, fill: '#30b0c7' }, activeDot: { r: 6, strokeWidth: 0 } },
                                        h(LabelList, { dataKey: 'sales26', position: 'top', content: renderCustomLabel })
                                    ),
                                    show2025Trend && h(Line, { type: 'monotone', dataKey: 'sales25', name: '2025 Sales', stroke: '#86868b', strokeWidth: 2, strokeDasharray: '5 5', dot: { r: 4, fill: '#86868b' }, activeDot: { r: 6, strokeWidth: 0 } })
                                )
                            )
                            : h('div', { className: 'h-full flex items-center justify-center text-[#86868b] font-medium text-sm' }, 'No trend data available')
                    )
                )
            )
        );
    });

    const NewAcquisitionWidget = memo(function NewAcquisitionWidget({ filteredData }) {
        const [filterType, setFilterType] = useState('All');
        const [subGroupFilter, setSubGroupFilter] = useState('All');
        const [isCopied, setIsCopied] = useState(false);
        const [visibleLimit, setVisibleLimit] = useState(50);
        const copyTimerRef = useRef(null);

        useEffect(() => { setVisibleLimit(50); }, [filteredData, filterType, subGroupFilter]);
        useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

        const subGroups = useMemo(() => {
            const groups = new Set();
            const arr = filteredData || [];
            for (let i = 0; i < arr.length; i++) {
                if (arr[i]?.SubProductGroup) groups.add(arr[i].SubProductGroup);
            }
            return Array.from(groups).sort();
        }, [filteredData]);

        const { summary, list } = useMemo(
            () => computeCustomerAcquisition(filteredData, subGroupFilter, true),
            [filteredData, subGroupFilter]
        );

        const displayList = useMemo(
            () => (filterType === 'All' ? list : (list || []).filter((item) => item.type === filterType)),
            [list, filterType]
        );

        const csvColumns = useMemo(() => [
            { label: 'No.', accessor: (_r, idx) => idx + 1 },
            { label: 'Customer / Chain', key: 'name' },
            { label: 'Channel', key: 'channel' },
            { label: 'Acquisition Type', key: 'type' },
            { label: 'Top Sub-Product', key: 'topSubGroup' },
            { label: 'Top Product', key: 'topProduct' },
            { label: 'Sales 2026 (THB)', accessor: (r) => Number((r.sales26 || 0).toFixed(2)) }
        ], []);

        const handleCopy = useCallback(async () => {
            if (!displayList || displayList.length === 0) return;
            const textToCopy = `New Acquisition List (${filterType === 'All' ? 'All Types' : filterType} - ${subGroupFilter})\n\n` +
                displayList.map((item, idx) => `${idx + 1}. ${item.name} (${item.channel})\n   Type: ${item.type}\n   Top Product: ${item.topProduct}\n   Sales: ฿${(item.sales26 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`).join('\n\n');

            const ok = await copyTextToClipboard(textToCopy);
            if (ok) {
                setIsCopied(true);
                if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
            }
        }, [displayList, filterType, subGroupFilter]);

        const slicedList = useMemo(() => (displayList || []).slice(0, visibleLimit), [displayList, visibleLimit]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col' },
            h(
                'div',
                { className: 'flex flex-col xl:flex-row justify-between items-start xl:items-center mb-5 sm:mb-6 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-3' },
                    h('div', { className: 'bg-[#32ade6]/10 p-2 rounded-xl flex-shrink-0' }, h(UserPlus, { className: 'w-5 h-5 text-[#32ade6]' })),
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center gap-2' },
                            h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'New Acquisition (2026)'),
                            h(
                                InfoPopover,
                                null,
                                h('span', { className: 'font-bold text-[#34c759]' }, 'Pure New: '),
                                'ลูกค้าที่ไม่มียอดขายเลยในปี 2025 แต่เริ่มมียอดในปี 2026',
                                h('br'),
                                h('br'),
                                h('span', { className: 'font-bold text-[#ff9500]' }, 'Reactivated: '),
                                'ลูกค้าที่เคยซื้อในปี 2025 แต่ทิ้งช่วงการสั่งซื้อไปนาน ',
                                h('span', { className: 'underline' }, 'ตั้งแต่ 6 เดือนขึ้นไป'),
                                ' แล้วกลับมาสั่งซื้อใหม่ในปี 2026'
                            )
                        ),
                        h('p', { className: 'text-xs text-[#86868b] font-medium mt-0.5' }, 'Tracking Pure New & Reactivated Customers')
                    )
                ),
                h(
                    'div',
                    { className: 'no-print flex flex-col lg:flex-row gap-3 w-full xl:w-auto items-stretch lg:items-center' },
                    h(
                        'div',
                        { className: 'flex items-center gap-2 flex-wrap sm:flex-nowrap' },
                        h(FilterDropdown, { label: 'Sub-Product', value: subGroupFilter, options: ['All', ...subGroups], onChange: setSubGroupFilter, icon: h(Layers) }),
                        h(
                            'button',
                            {
                                type: 'button',
                                onClick: handleCopy,
                                className: `px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[38px] rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all border shrink-0 ${isCopied ? 'bg-[#34c759]/10 text-[#34c759] border-[#34c759]/30 shadow-sm' : 'bg-white text-[#1d1d1f] border-black/10 hover:bg-[#f5f5f7]'}`,
                                title: 'Copy target list to clipboard'
                            },
                            isCopied ? h(React.Fragment, null, h(Check, { className: 'w-3.5 h-3.5' }), ' Copied') : h(React.Fragment, null, h(Copy, { className: 'w-3.5 h-3.5' }), ' Copy List')
                        ),
                        h(ExportCSVButton, {
                            filename: `New_Acquisition_2026_${filterType}.csv`,
                            columns: csvColumns,
                            rows: displayList,
                            label: 'CSV'
                        })
                    ),
                    h(
                        'div',
                        { className: 'grid grid-cols-3 sm:flex sm:flex-wrap gap-2' },
                        h('button', { type: 'button', onClick: () => setFilterType('All'), className: `px-4 py-2 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${filterType === 'All' ? 'bg-[#1d1d1f] text-white border-transparent shadow-md' : 'bg-[#f5f5f7] text-[#86868b] border-black/5 hover:bg-[#e8e8ed]'}` }, 'All'),
                        h(
                            'button',
                            { type: 'button', onClick: () => setFilterType('Pure New'), className: `px-3 sm:px-4 py-2 rounded-xl flex flex-col sm:min-w-[120px] border transition-all text-left ${filterType === 'Pure New' ? 'bg-[#34c759]/10 border-[#34c759]/30 shadow-sm' : 'bg-[#f5f5f7] border-black/5 hover:bg-[#e8e8ed]'}` },
                            h('span', { className: `text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center gap-1 truncate ${filterType === 'Pure New' ? 'text-[#34c759]' : 'text-[#86868b]'}` }, h(UserPlus, { className: 'w-3 h-3 shrink-0' }), ` Pure New (${summary.newCount})`),
                            h('span', { className: `text-xs sm:text-sm font-bold ${filterType === 'Pure New' ? 'text-[#34c759]' : 'text-[#1d1d1f]'}` }, `฿${(summary.newSales / 1000000).toFixed(2)}M`)
                        ),
                        h(
                            'button',
                            { type: 'button', onClick: () => setFilterType('Reactivated'), className: `px-3 sm:px-4 py-2 rounded-xl flex flex-col sm:min-w-[120px] border transition-all text-left ${filterType === 'Reactivated' ? 'bg-[#ff9500]/10 border-[#ff9500]/30 shadow-sm' : 'bg-[#f5f5f7] border-black/5 hover:bg-[#e8e8ed]'}` },
                            h('span', { className: `text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 sm:mb-1 flex items-center gap-1 truncate ${filterType === 'Reactivated' ? 'text-[#ff9500]' : 'text-[#86868b]'}` }, h(UserCheck, { className: 'w-3 h-3 shrink-0' }), ` Reactivated (${summary.reactCount})`),
                            h('span', { className: `text-xs sm:text-sm font-bold ${filterType === 'Reactivated' ? 'text-[#ff9500]' : 'text-[#1d1d1f]'}` }, `฿${(summary.reactSales / 1000000).toFixed(2)}M`)
                        )
                    )
                )
            ),
            h(
                'div',
                { className: 'overflow-x-auto custom-scrollbar border border-black/5 rounded-xl max-h-[360px] bg-white' },
                h(
                    'table',
                    { className: 'w-full text-sm text-left border-collapse min-w-[780px]' },
                    h(
                        'thead',
                        { className: 'sticky top-0 bg-[#f5f5f7]/95 backdrop-blur z-20 shadow-[0_1px_0_#e5e5ea]' },
                        h(
                            'tr',
                            null,
                            h('th', { className: 'py-3 px-3 sm:px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider w-14 text-center' }, 'No.'),
                            h('th', { className: 'py-3 px-3 sm:px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider sticky left-0 bg-[#f5f5f7] z-20 sticky-col-shadow sm:shadow-none' }, 'Customer / Channel'),
                            h('th', { className: 'py-3 px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider text-center w-28' }, 'Type'),
                            h('th', { className: 'py-3 px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider' }, 'Top Sub-Product'),
                            h('th', { className: 'py-3 px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider' }, 'Top Product'),
                            h('th', { className: 'py-3 px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider text-right w-32' }, 'Sales 2026 (฿)')
                        )
                    ),
                    h(
                        'tbody',
                        null,
                        slicedList.length > 0
                            ? slicedList.map((item, idx) => h(
                                'tr',
                                { key: item.key, className: 'border-b border-[#e5e5ea]/50 hover:bg-[#f5f5f7] transition-colors bg-white' },
                                h('td', { className: 'py-3 px-3 sm:px-4 text-center font-semibold text-[#86868b]' }, `#${idx + 1}`),
                                h(
                                    'td',
                                    { className: 'py-3 px-3 sm:px-4 sticky left-0 bg-inherit z-10 sticky-col-shadow sm:shadow-none' },
                                    h('div', { className: 'font-semibold text-[#1d1d1f] truncate max-w-[160px] sm:max-w-[200px]', title: item.name }, item.name),
                                    h('div', { className: 'text-[10px] text-[#86868b] font-medium' }, item.channel)
                                ),
                                h(
                                    'td',
                                    { className: 'py-3 px-4 text-center' },
                                    h('span', { className: `text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${item.type === 'Pure New' ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]'}` }, item.type)
                                ),
                                h('td', { className: 'py-3 px-4 text-[#1d1d1f] font-medium truncate max-w-[150px]', title: item.topSubGroup }, item.topSubGroup),
                                h('td', { className: 'py-3 px-4 text-[#86868b] text-xs truncate max-w-[200px]', title: item.topProduct }, item.topProduct),
                                h('td', { className: 'py-3 px-4 text-right font-bold text-[#0071e3]' }, (item.sales26 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 }))
                            ))
                            : h('tr', null, h('td', { colSpan: 6, className: 'py-10 text-center text-[#86868b] font-medium' }, 'No new acquisitions found in this period.'))
                    )
                ),
                displayList.length > visibleLimit && h(
                    'div',
                    { className: 'no-print p-3 bg-[#f5f5f7]/60 text-center border-t border-black/5' },
                    h(
                        'button',
                        { type: 'button', onClick: () => setVisibleLimit((prev) => prev + 50), className: 'px-4 py-2 bg-white text-[#0071e3] text-xs font-bold rounded-xl border border-black/5 shadow-sm hover:bg-[#f5f5f7]' },
                        `Show More (${displayList.length - visibleLimit} remaining)`
                    )
                )
            )
        );
    });

    const ExecutiveSummaryWidget = memo(function ExecutiveSummaryWidget({ kpi, filteredData, channelMix, valid2026Months }) {
        const [isExpanded, setIsExpanded] = useState(false);

        // Auto-expand synthesis when printing executive PDF reports
        useEffect(() => {
            if (typeof window === 'undefined') return undefined;
            const handleExpandForPrint = () => setIsExpanded(true);
            window.addEventListener('beforeprint', handleExpandForPrint);
            window.addEventListener('npd:expand-for-print', handleExpandForPrint);
            return () => {
                window.removeEventListener('beforeprint', handleExpandForPrint);
                window.removeEventListener('npd:expand-for-print', handleExpandForPrint);
            };
        }, []);

        const deepMetrics = useMemo(() => {
            if (!isExpanded || !filteredData) return null;
            return computeExecutiveDeepMetrics(filteredData, channelMix, valid2026Months);
        }, [isExpanded, filteredData, channelMix, valid2026Months]);

        if (!kpi) return null;
        const {
            s26, s25_YTD, s26_FullYTD, growthYoY, target26, forecast26, forecastStatus,
            plan27, progress, growthPlan, monthsCount26, fullMonthsCount26
        } = kpi;

        const validTarget = target26 || 0;
        const pacingSales = s26_FullYTD ?? s26;
        const pacingMonths = fullMonthsCount26 || monthsCount26 || 1;
        const currentRunRate = pacingSales / pacingMonths;
        const remainingMonths = Math.max(0, 12 - pacingMonths);
        const requiredRunRate = remainingMonths > 0 && validTarget > pacingSales ? (validTarget - pacingSales) / remainingMonths : 0;
        const rrIncreaseNeeded = currentRunRate > 0 && requiredRunRate > currentRunRate ? ((requiredRunRate - currentRunRate) / currentRunRate) * 100 : 0;

        const gapToTarget = validTarget - (forecast26 || 0);
        const isTrackingBehind = gapToTarget > 0 && validTarget > 0;
        const isGrowing = growthYoY >= 0;
        const yoyAbsDiff = s26 - (s25_YTD || 0);

        if (!isExpanded) {
            return h(
                'div',
                {
                    onClick: () => setIsExpanded(true),
                    className: 'no-print bg-white p-4 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex justify-center items-center cursor-pointer hover:bg-[#f5f5f7] transition-colors group relative overflow-hidden h-16 sm:h-20'
                },
                h('div', { className: 'absolute inset-0 bg-gradient-to-r from-[#af52de]/5 via-transparent to-[#0071e3]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500' }),
                h(
                    'h3',
                    { className: 'text-sm font-bold text-[#1d1d1f] flex items-center gap-2 relative z-10' },
                    h(Sparkles, { className: 'w-5 h-5 text-[#af52de] group-hover:scale-110 transition-transform' }),
                    'แตะเพื่อเปิดบทวิเคราะห์เชิงลึกสำหรับผู้บริหาร (Deep-Dive Executive Synthesis)'
                )
            );
        }

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-black/[0.04] flex flex-col justify-center relative overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300' },
            h('div', { className: 'absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#af52de] via-[#0071e3] to-[#34c759]' }),
            h(
                'div',
                { className: 'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 pb-4 border-b border-black/5' },
                h(
                    'div',
                    null,
                    h(
                        'div',
                        { className: 'flex items-center gap-2' },
                        h(Sparkles, { className: 'w-5 h-5 text-[#af52de]' }),
                        h('h3', { className: 'text-base font-extrabold text-[#1d1d1f] tracking-tight' }, 'Executive Synthesis • บทวิเคราะห์เจาะลึกเชิงกลยุทธ์ (6-Pillar Intelligence)')
                    ),
                    h('p', { className: 'text-xs text-[#86868b] font-medium mt-1' }, `ประมวลผลอัตโนมัติจากข้อมูลจริงตามตัวกรองปัจจุบัน (ครอบคลุมข้อมูล ${monthsCount26} เดือนที่เลือก จากทั้งหมด ${pacingMonths} เดือนของปี 2026)`)
                ),
                h(
                    'div',
                    { className: 'flex items-center gap-2 self-end sm:self-center' },
                    h(
                        'span',
                        { className: `text-[11px] font-bold px-3 py-1 rounded-full border ${!isTrackingBehind ? 'bg-[#34c759]/10 text-[#34c759] border-[#34c759]/20' : (isGrowing ? 'bg-[#ff9500]/10 text-[#ff9500] border-[#ff9500]/20' : 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/20')}` },
                        !isTrackingBehind ? '🟢 On-Track (ตามเป้าหมาย)' : (isGrowing ? '🟡 Growing but Behind Budget (เติบโตแต่ต่ำกว่าเป้า)' : '🔴 Critical Intervention (ต้องเร่งฟื้นฟู)')
                    ),
                    h(
                        'button',
                        { type: 'button', onClick: () => setIsExpanded(false), className: 'no-print text-[#86868b] hover:text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] p-2 rounded-full transition-colors', title: 'ซ่อนบทวิเคราะห์' },
                        h(X, { className: 'w-4 h-4' })
                    )
                )
            ),
            h(
                'div',
                { className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5' },
                // Pillar 1
                h(
                    'div',
                    { className: 'flex flex-col justify-between bg-[#f5f5f7]/80 p-4 rounded-[18px] border border-black/5' },
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center justify-between mb-2' },
                            h('span', { className: 'text-[11px] uppercase font-extrabold text-[#0071e3] flex items-center gap-1.5' }, h(Zap, { className: 'w-3.5 h-3.5' }), ' 1. อัตราเร่งยอดขาย & เป้าหมาย (Run-Rate Pacing)'),
                            validTarget > 0 && h('span', { className: 'text-[10px] font-bold bg-white px-2 py-0.5 rounded-md border border-black/5 text-[#1d1d1f]' }, `Achieved ${(progress || 0).toFixed(1)}%`)
                        ),
                        h(
                            'p',
                            { className: 'text-[#1d1d1f] text-xs leading-relaxed font-medium' },
                            'ยอดขายเฉลี่ยสะสมทั้งปี (Run-Rate) อยู่ที่ ',
                            h('span', { className: 'font-bold text-[#0071e3]' }, `฿${(currentRunRate / 1000000).toFixed(2)}M/เดือน`),
                            ` (สะสม ฿${(pacingSales / 1000000).toFixed(2)}M จาก ${pacingMonths} เดือน)`,
                            validTarget > 0
                                ? (remainingMonths > 0 && isTrackingBehind
                                    ? h(React.Fragment, null, ` หากต้องการปิดเป้าปี 2026 ที่ ฿${(validTarget / 1000000).toFixed(2)}M ในอีก `, h('span', { className: 'font-bold' }, `${remainingMonths} เดือนที่เหลือ`), ' ต้องทำยอดเฉลี่ย ', h('span', { className: 'font-bold text-[#1d1d1f]' }, `฿${(requiredRunRate / 1000000).toFixed(2)}M/เดือน`), ' หรือต้องเร่งสปีดขึ้นอีก ', h('span', { className: 'font-bold text-[#ff3b30]' }, `+${rrIncreaseNeeded.toFixed(1)}%`), ' จากฐานปัจจุบัน')
                                    : h('span', { className: 'text-[#34c759] font-semibold' }, ` อัตราเร่งปัจจุบันเพียงพอต่อการบรรลุหรือทะลุเป้าหมายทั้งปี (Projected ฿${((forecast26 || 0) / 1000000).toFixed(2)}M)`))
                                : h('span', null, ' (ตัวกรองที่เลือกยังไม่มีการผูกงบประมาณ Target 2026 แยกย่อย)')
                        )
                    ),
                    validTarget > 0 && h(
                        'div',
                        { className: 'mt-3 pt-2.5 border-t border-black/5 flex justify-between items-center text-[11px]' },
                        h('span', { className: 'text-[#86868b] font-medium' }, 'Forecast Gap ต่อเป้าปี 26:'),
                        h('span', { className: `font-bold ${isTrackingBehind ? 'text-[#ff3b30]' : 'text-[#34c759]'}` }, isTrackingBehind ? `-฿${(gapToTarget / 1000000).toFixed(2)}M (ขาดอีก ${(100 - (forecastStatus?.percent || 0)).toFixed(1)}%)` : `+฿${(Math.abs(gapToTarget) / 1000000).toFixed(2)}M (เกินเป้า)`)
                    )
                ),
                // Pillar 2
                h(
                    'div',
                    { className: 'flex flex-col justify-between bg-[#f5f5f7]/80 p-4 rounded-[18px] border border-black/5' },
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center justify-between mb-2' },
                            h('span', { className: 'text-[11px] uppercase font-extrabold text-[#af52de] flex items-center gap-1.5' }, h(TrendingUp, { className: 'w-3.5 h-3.5' }), ' 2. โมเมนตัม YoY & ความพร้อมสู่ปี 2027'),
                            h('span', { className: `text-[10px] font-bold px-2 py-0.5 rounded-md ${isGrowing ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff3b30]/10 text-[#ff3b30]'}` }, `${isGrowing ? '▲' : '▼'} ${Math.abs(growthYoY || 0).toFixed(1)}% YoY`)
                        ),
                        h(
                            'p',
                            { className: 'text-[#1d1d1f] text-xs leading-relaxed font-medium' },
                            `เทียบช่วงเวลาเดียวกันกับปี 2025 (฿${((s25_YTD || 0) / 1000000).toFixed(2)}M) พอร์ตโฟลิโอมีส่วนต่างยอดขายสุทธิ `,
                            h('span', { className: `font-bold ${yoyAbsDiff >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]'}` }, `${yoyAbsDiff >= 0 ? '+' : '-'}฿${(Math.abs(yoyAbsDiff) / 1000000).toFixed(2)}M`),
                            '. ',
                            isGrowing && isTrackingBehind
                                ? 'แม้ธุรกิจจะเติบโตชนะปีก่อน แต่ฐานการเติบโตยังไม่สูงพอที่จะชดเชยเป้าหมายปี 2026 ที่ตั้งไว้ท้าทายขึ้น'
                                : (!isGrowing
                                    ? 'ยอดขายหดตัวลงเมื่อเทียบกับปีก่อน ส่งผลกระทบโดยตรงต่อฐานรายได้สะสม ต้องเร่งกระตุ้นยอดขายในกลุ่มสินค้าหลักทันที'
                                    : 'การเติบโตแข็งแกร่งทั้งในแง่ YoY และสอดคล้องกับทิศทางเป้าหมายประจำปี')
                        )
                    ),
                    h(
                        'div',
                        { className: 'mt-3 pt-2.5 border-t border-black/5 flex justify-between items-center text-[11px]' },
                        h('span', { className: 'text-[#86868b] font-medium' }, 'เป้าหมายต่อเนื่อง Plan 2027:'),
                        h('span', { className: 'font-bold text-[#1d1d1f]' }, plan27 ? `฿${(plan27 / 1000000).toFixed(2)}M (${growthPlan >= 0 ? '+' : ''}${(growthPlan || 0).toFixed(1)}% vs เป้า 26)` : 'N/A')
                    )
                ),
                // Pillar 3
                h(
                    'div',
                    { className: 'flex flex-col justify-between bg-[#f5f5f7]/80 p-4 rounded-[18px] border border-black/5' },
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center justify-between mb-2' },
                            h('span', { className: 'text-[11px] uppercase font-extrabold text-[#34c759] flex items-center gap-1.5' }, h(Banknote, { className: 'w-3.5 h-3.5' }), ' 3. คุณภาพกำไรขั้นต้น & สุขภาพการรับคืน'),
                            deepMetrics && h(
                                'span',
                                { className: `text-[10px] font-bold px-2 py-0.5 rounded-md ${deepMetrics.hasCostData ? (deepMetrics.weightedMargin >= 40 ? 'bg-[#34c759]/10 text-[#34c759]' : 'bg-[#ff9500]/10 text-[#ff9500]') : 'bg-black/5 text-[#86868b]'}` },
                                deepMetrics.hasCostData ? `GP ${deepMetrics.weightedMargin.toFixed(1)}%` : 'GP N/A'
                            )
                        ),
                        deepMetrics && h(
                            'p',
                            { className: 'text-[#1d1d1f] text-xs leading-relaxed font-medium' },
                            deepMetrics.hasCostData
                                ? h(
                                    React.Fragment,
                                    null,
                                    'จากรายการที่มีข้อมูลต้นทุนจริง (ครอบคลุม ',
                                    h('span', { className: 'font-bold text-[#0071e3]' }, `${deepMetrics.costCoverage.toFixed(1)}%`),
                                    ' ของยอดขาย) มีอัตรากำไรถ่วงน้ำหนัก ',
                                    h('span', { className: 'font-bold text-[#34c759]' }, `${deepMetrics.weightedMargin.toFixed(1)}%`),
                                    ` (ประมาณการ GP ฿${(deepMetrics.totalGP26 / 1000000).toFixed(2)}M). `
                                )
                                : 'ยังไม่มีข้อมูลต้นทุน (Cost) สำหรับรายการในตัวกรองนี้ จึงไม่แสดงตัวเลขกำไรจำลอง. ',
                            'ด้านมูลค่าสินค้าตีคืน (Returns) อยู่ที่ ',
                            h('span', { className: 'font-bold text-[#ff3b30]' }, `฿${deepMetrics.totalReturns26.toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                            ` (${deepMetrics.returnRate.toFixed(2)}% ของยอดขายปี 2026)`,
                            deepMetrics.returnRate > 2.5
                                ? ' ซึ่งควรตรวจสอบสาเหตุรายช่องทางในแท็บ Core Portfolio'
                                : ' ซึ่งอยู่ในเกณฑ์ควบคุมได้ดีเยี่ยม (< 2.5%)'
                        )
                    ),
                    deepMetrics && h(
                        'div',
                        { className: 'mt-3 pt-2.5 border-t border-black/5 flex justify-between items-center text-[11px]' },
                        h('span', { className: 'text-[#86868b] font-medium' }, 'แนวทางเพิ่มมูลค่า:'),
                        h('span', { className: 'font-bold text-[#1d1d1f]' }, !deepMetrics.hasCostData ? 'รออัปเดตข้อมูล Cost ในชีต' : (deepMetrics.weightedMargin >= 40 ? 'เน้นขยาย Volume ในกลุ่ม Hero SKUs' : 'ควรปรับ Product Mix สู่สินค้า High-Margin'))
                    )
                ),
                // Pillar 4
                h(
                    'div',
                    { className: 'flex flex-col justify-between bg-[#f5f5f7]/80 p-4 rounded-[18px] border border-black/5' },
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center justify-between mb-2' },
                            h('span', { className: 'text-[11px] uppercase font-extrabold text-[#30b0c7] flex items-center gap-1.5' }, h(Layers, { className: 'w-3.5 h-3.5' }), ' 4. โครงสร้างพอร์ต & สุขภาพกลุ่มสินค้า'),
                            deepMetrics && h('span', { className: 'text-[10px] font-bold bg-white px-2 py-0.5 rounded-md border border-black/5 text-[#1d1d1f]' }, `Top 5 SKUs = ${deepMetrics.top5SkuShare.toFixed(1)}%`)
                        ),
                        deepMetrics && h(
                            'p',
                            { className: 'text-[#1d1d1f] text-xs leading-relaxed font-medium' },
                            'ความเข้มข้นของพอร์ต (Pareto): สินค้า ',
                            h('span', { className: 'font-bold' }, 'Top 5 Group SKUs'),
                            ' คิดเป็น ',
                            h('span', { className: 'font-bold text-[#0071e3]' }, `${deepMetrics.top5SkuShare.toFixed(1)}%`),
                            ' ของยอดขายทั้งหมด (นำโดย ',
                            h('span', { className: 'font-semibold' }, deepMetrics.topSkuName),
                            ` ที่ ${deepMetrics.topSkuShare.toFixed(1)}%). ผลตรวจสุขภาพระดับ Sub-Product พบกลุ่มเติบโตดี `,
                            h('span', { className: 'font-bold text-[#34c759]' }, `${deepMetrics.healthyCnt} กลุ่ม`),
                            ', เฝ้าระวัง ',
                            h('span', { className: 'font-bold text-[#ff9500]' }, `${deepMetrics.watchCnt} กลุ่ม`),
                            ', และกลุ่มเสี่ยงหดตัวรุนแรง ',
                            h('span', { className: 'font-bold text-[#ff3b30]' }, `${deepMetrics.riskCnt} กลุ่ม`)
                        )
                    ),
                    deepMetrics && h(
                        'div',
                        { className: 'mt-3 pt-2.5 border-t border-black/5 flex justify-between items-center text-[11px] gap-2' },
                        h('span', { className: 'text-[#86868b] font-medium shrink-0' }, 'จุดที่ต้องจับตา:'),
                        h('span', { className: 'font-bold text-[#ff3b30] truncate', title: deepMetrics.topRiskItem ? `${deepMetrics.topRiskItem.name} (${deepMetrics.topRiskItem.yoy.toFixed(1)}% YoY)` : 'ไม่มีกลุ่มเสี่ยงรุนแรง' }, deepMetrics.topRiskItem ? `${deepMetrics.topRiskItem.name} (${deepMetrics.topRiskItem.yoy.toFixed(1)}% YoY)` : '🟢 ไม่มีกลุ่มที่หดตัวเกิน 10%')
                    )
                ),
                // Pillar 5
                h(
                    'div',
                    { className: 'flex flex-col justify-between bg-[#f5f5f7]/80 p-4 rounded-[18px] border border-black/5' },
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center justify-between mb-2' },
                            h('span', { className: 'text-[11px] uppercase font-extrabold text-[#ff9500] flex items-center gap-1.5' }, h(Store, { className: 'w-3.5 h-3.5' }), ' 5. โครงสร้างช่องทางขาย & การขยายฐานลูกค้า'),
                            deepMetrics && h('span', { className: 'text-[10px] font-bold bg-white px-2 py-0.5 rounded-md border border-black/5 text-[#1d1d1f]' }, `${deepMetrics.activeCustCount} Active Outlets/Chains`)
                        ),
                        deepMetrics && h(
                            'p',
                            { className: 'text-[#1d1d1f] text-xs leading-relaxed font-medium' },
                            'ช่องทางหลักอันดับ 1 คือ ',
                            h('span', { className: 'font-bold text-[#1d1d1f]' }, deepMetrics.topChannel?.name || '-'),
                            ' คิดเป็นสัดส่วน ',
                            h('span', { className: 'font-bold text-[#0071e3]' }, `${deepMetrics.topChannelShare.toFixed(1)}%`),
                            deepMetrics.secondChannel ? h(React.Fragment, null, ' ตามด้วย ', h('span', { className: 'font-semibold' }, deepMetrics.secondChannel.name), ` (${deepMetrics.secondChannelShare.toFixed(1)}%)`) : null,
                            '. ด้านการหาลูกค้าใหม่ในปี 2026 สามารถเปิดหน้าค้าใหม่ (Pure New) ได้ ',
                            h('span', { className: 'font-bold text-[#34c759]' }, `${deepMetrics.newCustCount} ราย`),
                            ' และดึงลูกค้าที่ห่างหายเกิน 6 เดือนกลับมา (Reactivated) ได้ ',
                            h('span', { className: 'font-bold text-[#ff9500]' }, `${deepMetrics.reactCustCount} ราย`)
                        )
                    ),
                    deepMetrics && h(
                        'div',
                        { className: 'mt-3 pt-2.5 border-t border-black/5 flex justify-between items-center text-[11px]' },
                        h('span', { className: 'text-[#86868b] font-medium' }, 'รายได้จาก New + Reactivated:'),
                        h('span', { className: 'font-bold text-[#0071e3]' }, `฿${(deepMetrics.acqSales26 / 1000000).toFixed(2)}M (${deepMetrics.acqShare.toFixed(1)}% ของพอร์ต)`)
                    )
                ),
                // Pillar 6
                h(
                    'div',
                    { className: 'flex flex-col justify-between bg-gradient-to-br from-[#1d1d1f] to-[#2c2c2e] text-white p-4 rounded-[18px] shadow-md' },
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center justify-between mb-2' },
                            h('span', { className: 'text-[11px] uppercase font-extrabold text-[#32ade6] flex items-center gap-1.5' }, h(Crosshair, { className: 'w-3.5 h-3.5' }), ' 6. ข้อเสนอแนะเชิงกลยุทธ์ (Executive Playbook)'),
                            h('span', { className: 'text-[9px] uppercase tracking-wider font-extrabold bg-white/10 text-white px-2 py-0.5 rounded' }, 'Action Plan')
                        ),
                        h(
                            'ul',
                            { className: 'text-xs leading-relaxed space-y-1.5 text-white/90 font-normal' },
                            h(
                                'li',
                                { className: 'flex items-start gap-1.5' },
                                h('span', { className: 'text-[#34c759] font-bold' }, '①'),
                                h('span', null, isTrackingBehind ? `เร่งปิดช่องว่าง ฿${(gapToTarget / 1000000).toFixed(2)}M โดยใช้ตาราง White Space Matrix และ Churn Radar เจาะลูกค้าเป้าหมายในช่องทาง ${deepMetrics?.topChannel?.name || 'หลัก'}` : `รักษามาตรฐานการจัดส่งและสต็อกของกลุ่ม Top 5 SKUs (${deepMetrics?.top5SkuShare.toFixed(0)}% ของพอร์ต) ไม่ให้เกิด Out-of-Stock`)
                            ),
                            h(
                                'li',
                                { className: 'flex items-start gap-1.5' },
                                h('span', { className: 'text-[#ff9500] font-bold' }, '②'),
                                h('span', null, deepMetrics?.topRiskItem ? `เข้าแก้ไขกลุ่ม "${deepMetrics.topRiskItem.name}" ที่หดตัว ${deepMetrics.topRiskItem.yoy.toFixed(1)}% YoY ด้วยการทบทวนโปรโมชันหรือทำ Cross-Selling พ่วงกับสินค้าดาวรุ่ง` : 'ผลักดันสินค้า NPD ที่มีอัตรา M3/M6 Retention สูง เพื่อสร้าง S-Curve ใหม่รองรับเป้าหมายปี 2027')
                            ),
                            h(
                                'li',
                                { className: 'flex items-start gap-1.5' },
                                h('span', { className: 'text-[#32ade6] font-bold' }, '③'),
                                h('span', null, `ต่อยอดฐานลูกค้าใหม่ (${(deepMetrics?.newCustCount || 0) + (deepMetrics?.reactCustCount || 0)} ราย) ให้เกิดการสั่งซื้อซ้ำต่อเนื่อง (Repeat Order) ในไตรมาสสุดท้ายของปี`)
                            )
                        )
                    )
                )
            )
        );
    });

    NPD.components = NPD.components || {};
    Object.assign(NPD.components, {
        PortfolioSummaryWidget,
        KPIYTDWidget,
        KPITargetWidget,
        KPIForecastWidget,
        KPIPlanWidget,
        TrendInsightAnnotation,
        TrendChartWidget,
        ChannelMixWidget,
        CategoryTrendWidget,
        SubProductAnalysisWidget,
        NewAcquisitionWidget,
        ExecutiveSummaryWidget
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
