(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};
    const React = root.React;
    if (!React) return;

    const h = React.createElement;
    const { useState, useMemo, useEffect, useCallback, useDeferredValue, memo } = React;
    const Recharts = root.Recharts || {};
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

    const { GROUP_HEX, APPLE_PALETTE } = NPD.config;
    const { computeProfitability, computeReturnDiagnostics } = NPD.engine;
    const Icons = NPD.icons || NPD.createIconFactory(React);
    const {
        Layers, Banknote, Search, LayoutList, ChevronRight, Trophy, ArrowLeft, ArrowDown, AlertCircle, X
    } = Icons;
    const { InfoPopover, Sparkline } = NPD.components;

    const PortfolioMixWidget = memo(function PortfolioMixWidget({ filteredData, monthsList }) {
        const [mixLevel, setMixLevel] = useState('ProductGroup');

        const { chartData, keys, colors } = useMemo(() => {
            const dimension = mixLevel === 'ProductGroup' ? 'ProductGroup' : (mixLevel === 'SubProduct' ? 'SubProductGroup' : 'GroupSKU');
            const totals = {};
            const arr = filteredData || [];

            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (!d || d.Year !== '2026') continue;
                const key = d[dimension] || 'Unknown';
                totals[key] = (totals[key] || 0) + (Number(d.NetPrice) || 0);
            }

            const sortedKeys = Object.entries(totals).filter(([, val]) => val > 0).sort((a, b) => b[1] - a[1]);
            const topKeys = sortedKeys.slice(0, 7).map((k) => k[0]);
            const keysToUse = sortedKeys.length > 8 ? [...topKeys, 'Others'] : sortedKeys.map((k) => k[0]);
            const topKeySet = new Set(keysToUse);

            const monthlyMap = {};
            (monthsList || []).forEach((m) => { monthlyMap[m] = { month: m, total: 0 }; });

            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (!d || d.Year !== '2026') continue;
                const m = d.MonthShort;
                if (!m || !monthlyMap[m]) continue;
                let key = d[dimension] || 'Unknown';
                if (!topKeySet.has(key)) key = 'Others';

                const val = Number(d.NetPrice) || 0;
                if (val <= 0) continue;
                monthlyMap[m][key] = (monthlyMap[m][key] || 0) + val;
                monthlyMap[m].total += val;
            }

            const cData = (monthsList || []).map((m) => {
                const row = { name: m, total: monthlyMap[m].total };
                keysToUse.forEach((k) => {
                    row[`${k}_abs`] = monthlyMap[m][k] || 0;
                    row[k] = monthlyMap[m].total > 0 ? ((monthlyMap[m][k] || 0) / monthlyMap[m].total) * 100 : 0;
                });
                return row;
            });

            const colorMap = {};
            keysToUse.forEach((k, idx) => {
                colorMap[k] = GROUP_HEX[k] || APPLE_PALETTE[idx % APPLE_PALETTE.length];
                if (k === 'Others') colorMap[k] = '#e5e5ea';
            });

            return { chartData: cData, keys: keysToUse, colors: colorMap };
        }, [filteredData, mixLevel, monthsList]);

        const CustomMixTooltip = useCallback(({ active, payload, label }) => {
            if (active && payload && payload.length) {
                const total = payload[0].payload.total || 0;
                return h(
                    'div',
                    { className: 'bg-white/95 backdrop-blur-xl border border-black/5 p-4 rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] min-w-[230px] sm:min-w-[240px]' },
                    h('div', { className: 'text-sm font-bold text-[#1d1d1f] mb-1' }, `${label} 2026`),
                    h('div', { className: 'text-xs text-[#86868b] font-medium mb-3 pb-2 border-b border-[#e5e5ea]' }, total > 0 ? `Total Sales: ฿${(total / 1000000).toFixed(2)}M` : 'No Sales'),
                    h(
                        'div',
                        { className: 'space-y-2' },
                        [...payload].sort((a, b) => (b.payload[`${b.dataKey}_abs`] || 0) - (a.payload[`${a.dataKey}_abs`] || 0)).map((entry) => {
                            const absVal = entry.payload[`${entry.dataKey}_abs`] || 0;
                            if (absVal === 0) return null;
                            return h(
                                'div',
                                { key: entry.dataKey, className: 'flex justify-between items-center text-xs gap-2' },
                                h(
                                    'div',
                                    { className: 'flex items-center gap-2 max-w-[130px] sm:max-w-[140px]' },
                                    h('div', { className: 'w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm', style: { backgroundColor: entry.color } }),
                                    h('span', { className: 'text-[#1d1d1f] font-medium truncate', title: entry.dataKey }, entry.dataKey)
                                ),
                                h(
                                    'div',
                                    { className: 'flex items-center gap-2 text-right shrink-0' },
                                    h('span', { className: 'font-semibold text-[#1d1d1f]' }, `฿${(absVal / 1000000).toFixed(2)}M`),
                                    h('span', { className: 'text-[#86868b] font-semibold w-10 text-right' }, `${(entry.value || 0).toFixed(1)}%`)
                                )
                            );
                        })
                    )
                );
            }
            return null;
        }, []);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] lg:col-span-3 flex flex-col' },
            h(
                'div',
                { className: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-6 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-2' },
                    h(Layers, { className: 'w-5 h-5 text-[#30b0c7] shrink-0' }),
                    h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'Portfolio Mix (MoM 2026)'),
                    h(
                        InfoPopover,
                        null,
                        h('span', { className: 'font-semibold text-[#0071e3]' }, '100% Stacked View:'),
                        h('br'),
                        'เปรียบเทียบสัดส่วนยอดขาย (Mix %) ในแต่ละเดือน เพื่อวิเคราะห์ว่าโครงสร้างพอร์ตเปลี่ยนไปทิศทางใด'
                    )
                ),
                h(
                    'div',
                    { className: 'flex bg-[#e3e3e8] p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar' },
                    h('button', { type: 'button', onClick: () => setMixLevel('ProductGroup'), className: `flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-[8px] transition-all whitespace-nowrap ${mixLevel === 'ProductGroup' ? 'bg-white text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-[#86868b] hover:text-[#1d1d1f]'}` }, 'Product Group'),
                    h('button', { type: 'button', onClick: () => setMixLevel('SubProduct'), className: `flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-[8px] transition-all whitespace-nowrap ${mixLevel === 'SubProduct' ? 'bg-white text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-[#86868b] hover:text-[#1d1d1f]'}` }, 'Sub-Product'),
                    h('button', { type: 'button', onClick: () => setMixLevel('GroupSKU'), className: `flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-[8px] transition-all whitespace-nowrap ${mixLevel === 'GroupSKU' ? 'bg-white text-[#1d1d1f] shadow-[0_1px_4px_rgba(0,0,0,0.12)]' : 'text-[#86868b] hover:text-[#1d1d1f]'}` }, 'Group SKU')
                )
            ),
            h(
                'div',
                { className: 'h-72 sm:h-80 w-full relative' },
                (chartData || []).some((d) => d.total > 0)
                    ? h(
                        ResponsiveContainer,
                        { width: '100%', height: '100%' },
                        h(
                            BarChart,
                            { data: chartData, margin: { top: 10, right: 0, left: -20, bottom: 0 } },
                            h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, stroke: '#e5e5ea' }),
                            h(XAxis, { dataKey: 'name', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, axisLine: false, tickLine: false }),
                            h(YAxis, { tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, tickFormatter: (v) => `${v}%`, axisLine: false, tickLine: false, domain: [0, 100] }),
                            h(Tooltip, { content: h(CustomMixTooltip), cursor: { fill: '#f5f5f7' } }),
                            h(Legend, { wrapperStyle: { fontSize: '11px', fontWeight: '500', color: '#86868b', paddingTop: '10px' } }),
                            (keys || []).map((k) => h(Bar, { key: k, dataKey: k, stackId: 'a', fill: colors[k], maxBarSize: 48 }))
                        )
                    )
                    : h(
                        'div',
                        { className: 'absolute inset-0 flex flex-col items-center justify-center text-[#86868b]' },
                        h(Layers, { className: 'w-10 h-10 mb-2 opacity-20' }),
                        h('span', { className: 'text-sm font-medium' }, 'No data available for selected filters')
                    )
            )
        );
    });

    const ProductProfitabilityWidget = memo(function ProductProfitabilityWidget({ filteredData }) {
        const [breadcrumbs, setBreadcrumbs] = useState([]);
        const [search, setSearch] = useState('');
        const [visibleLimit, setVisibleLimit] = useState(50);
        const deferredSearch = useDeferredValue(search);

        useEffect(() => { setBreadcrumbs([]); setSearch(''); setVisibleLimit(50); }, [filteredData]);
        useEffect(() => { setVisibleLimit(50); }, [breadcrumbs, deferredSearch]);

        const levelNames = ['Product Group', 'Sub-Product Group', 'Group SKU', 'Product Name'];
        const currentLevelIdx = breadcrumbs.length;
        const currentLevelName = levelNames[currentLevelIdx] || 'Detail';

        const rawData = useMemo(
            () => computeProfitability(filteredData, breadcrumbs),
            [filteredData, breadcrumbs]
        );

        const { list, summary } = useMemo(() => {
            let arr = [...(rawData.list || [])].sort((a, b) => b.sales - a.sales);
            if (deferredSearch) {
                const q = deferredSearch.toLowerCase();
                arr = arr.filter((item) => item.name.toLowerCase().includes(q));
            }
            return { list: arr, summary: rawData.summary };
        }, [rawData, deferredSearch]);

        const slicedList = useMemo(() => (list || []).slice(0, visibleLimit), [list, visibleLimit]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col lg:col-span-3' },
            h(
                'div',
                { className: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-3' },
                    h('div', { className: 'bg-[#34c759]/10 p-2 rounded-xl shrink-0' }, h(Banknote, { className: 'w-6 h-6 text-[#34c759]' })),
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center gap-2 flex-wrap' },
                            h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'Product Profitability Report (2026)'),
                            h(
                                'span',
                                { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#86868b] border border-black/5' },
                                `Cost Coverage: ${(summary.costCoverage || 0).toFixed(1)}%`
                            ),
                            h(
                                InfoPopover,
                                null,
                                h('span', { className: 'font-bold text-[#1d1d1f]' }, 'Authentic Cost Accounting:'),
                                h('br'),
                                'คำนวณอัตรากำไรขั้นต้น (Weighted Margin %) จากรายการที่มีข้อมูลต้นทุนจริงในชีตเท่านั้น รายการที่ยังไม่มีข้อมูล Cost จะแสดง N/A โดยไม่สุ่มตัวเลขจำลอง'
                            )
                        ),
                        h('p', { className: 'text-xs text-[#86868b] font-medium mt-0.5' }, 'Executive Summary: Weighted Gross Profit Margin')
                    )
                ),
                breadcrumbs.length < 4 && h(
                    'div',
                    { className: 'relative w-full md:w-64' },
                    h('input', {
                        type: 'text',
                        placeholder: `Search ${currentLevelName}...`,
                        className: 'w-full pl-9 pr-3 py-2.5 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3]/30 focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10 rounded-[12px] text-sm font-medium transition-all outline-none',
                        value: search,
                        onChange: (e) => setSearch(e.target.value)
                    }),
                    h(Search, { className: 'w-4 h-4 text-[#86868b] absolute left-3 top-3' })
                )
            ),
            h(
                'div',
                { className: 'flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 mb-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-1.5 text-sm font-medium bg-[#f5f5f7]/80 p-1.5 rounded-[14px] overflow-x-auto custom-scrollbar border border-black/5 w-full xl:w-auto' },
                    h(
                        'button',
                        { type: 'button', onClick: () => { setBreadcrumbs([]); setSearch(''); }, className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${breadcrumbs.length === 0 ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-bold' : 'text-[#86868b] hover:text-[#1d1d1f]'}` },
                        h(LayoutList, { className: 'w-4 h-4' }),
                        ' All Categories'
                    ),
                    (breadcrumbs || []).map((crumb, idx) => h(
                        React.Fragment,
                        { key: `${idx}-${crumb}` },
                        h(ChevronRight, { className: 'w-4 h-4 text-[#d1d1d6] flex-shrink-0' }),
                        h(
                            'button',
                            { type: 'button', onClick: () => { setBreadcrumbs(breadcrumbs.slice(0, idx + 1)); setSearch(''); }, className: `px-3 py-1.5 rounded-xl transition-all whitespace-nowrap truncate max-w-[160px] sm:max-w-[180px] ${breadcrumbs.length === idx + 1 ? 'bg-white text-[#1d1d1f] shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-bold' : 'text-[#86868b] hover:text-[#1d1d1f]'}`, title: crumb },
                            crumb
                        )
                    ))
                ),
                h(
                    'div',
                    { className: 'flex items-center justify-between sm:justify-start gap-3 sm:gap-4 bg-[#f5f5f7] px-4 py-2 rounded-[14px] border border-black/5 w-full xl:w-auto shrink-0 overflow-x-auto no-scrollbar' },
                    h('div', { className: 'flex flex-col shrink-0' }, h('span', { className: 'text-[10px] font-bold text-[#86868b] uppercase tracking-wider' }, 'Total Sales'), h('span', { className: 'text-xs sm:text-sm font-bold text-[#1d1d1f]' }, `฿${(summary.sales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)),
                    h('div', { className: 'w-px h-6 bg-black/10 shrink-0' }),
                    h('div', { className: 'flex flex-col shrink-0' }, h('span', { className: 'text-[10px] font-bold text-[#86868b] uppercase tracking-wider' }, 'Gross Profit'), h('span', { className: `text-xs sm:text-sm font-bold ${summary.gp === null ? 'text-[#86868b]' : (summary.gp >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]')}` }, summary.gp === null ? 'N/A' : `฿${summary.gp.toLocaleString(undefined, { maximumFractionDigits: 0 })}`)),
                    h('div', { className: 'w-px h-6 bg-black/10 shrink-0' }),
                    h(
                        'div',
                        { className: 'flex flex-col shrink-0' },
                        h('span', { className: 'text-[10px] font-bold text-[#86868b] uppercase tracking-wider' }, 'Margin %'),
                        h(
                            'span',
                            { className: `text-xs sm:text-sm font-bold ${summary.margin === null ? 'text-[#86868b]' : (summary.margin >= 40 ? 'text-[#34c759]' : (summary.margin >= 20 ? 'text-[#ff9500]' : 'text-[#ff3b30]'))}` },
                            summary.margin === null ? 'N/A' : `${summary.margin.toFixed(1)}%`
                        )
                    )
                )
            ),
            h(
                'div',
                { className: 'overflow-x-auto custom-scrollbar border border-black/5 rounded-xl max-h-[400px] bg-white' },
                h(
                    'table',
                    { className: 'w-full text-sm text-left border-collapse min-w-[700px]' },
                    h(
                        'thead',
                        { className: 'sticky top-0 bg-[#f5f5f7]/95 backdrop-blur z-20 shadow-[0_1px_0_#e5e5ea]' },
                        h(
                            'tr',
                            null,
                            h('th', { className: 'py-3 px-3 sm:px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider w-14 text-center' }, 'Rank'),
                            h('th', { className: 'py-3 px-3 sm:px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider sticky left-0 bg-[#f5f5f7] z-20 sticky-col-shadow sm:shadow-none' }, currentLevelName),
                            h('th', { className: 'py-3 px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider text-center w-24' }, 'Trend'),
                            h('th', { className: 'py-3 px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider text-right w-40' }, 'Net Sales (฿)'),
                            h('th', { className: 'py-3 px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider text-right w-40' }, 'Gross Profit (฿)'),
                            h('th', { className: 'py-3 px-4 font-semibold text-[#86868b] text-xs uppercase tracking-wider text-right w-56' }, '% Margin')
                        )
                    ),
                    h(
                        'tbody',
                        null,
                        slicedList.length > 0
                            ? slicedList.map((item, idx) => {
                                const hasMargin = item.margin !== null;
                                const barColor = !hasMargin ? 'bg-[#d1d1d6]' : (item.margin >= 40 ? 'bg-[#34c759]' : (item.margin >= 20 ? 'bg-[#ff9500]' : 'bg-[#ff3b30]'));
                                const canDrillDown = breadcrumbs.length < 3;
                                return h(
                                    'tr',
                                    {
                                        key: item.name,
                                        onClick: () => { if (canDrillDown) { setBreadcrumbs([...breadcrumbs, item.name]); setSearch(''); } },
                                        className: `border-b border-[#e5e5ea]/50 transition-colors group relative bg-white ${canDrillDown ? 'cursor-pointer hover:bg-[#0071e3]/5' : ''}`
                                    },
                                    h('td', { className: 'py-3.5 sm:py-4 px-3 sm:px-4 text-center font-semibold text-[#86868b]' }, `#${idx + 1}`),
                                    h('td', { className: `py-3.5 sm:py-4 px-3 sm:px-4 font-semibold text-[#1d1d1f] transition-colors truncate max-w-[180px] sm:max-w-[250px] sticky left-0 bg-inherit z-10 sticky-col-shadow sm:shadow-none ${canDrillDown ? 'group-hover:text-[#0071e3]' : ''}`, title: item.name }, item.name),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-center' }, h('div', { className: 'flex justify-center' }, h(Sparkline, { data: item.monthlySales }))),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-right font-medium text-[#1d1d1f]' }, (item.sales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })),
                                    h(
                                        'td',
                                        { className: `py-3.5 sm:py-4 px-4 text-right font-medium ${item.gp === null ? 'text-[#86868b]' : (item.gp >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]')}` },
                                        item.gp === null ? 'N/A' : item.gp.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                    ),
                                    h(
                                        'td',
                                        { className: 'py-3.5 sm:py-4 px-4 pr-6 sm:pr-10 relative' },
                                        hasMargin
                                            ? h(
                                                'div',
                                                { className: 'flex items-center justify-end gap-3' },
                                                h('span', { className: `font-bold w-14 text-right ${item.margin < 0 ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}` }, `${item.margin.toFixed(1)}%`),
                                                h('div', { className: 'w-20 h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden flex-shrink-0' }, h('div', { className: `h-full rounded-full ${barColor}`, style: { width: `${Math.max(0, Math.min(item.margin, 100))}%` } }))
                                            )
                                            : h('div', { className: 'text-right text-xs font-medium text-[#86868b]' }, 'N/A')
                                    )
                                );
                            })
                            : h('tr', null, h('td', { colSpan: 6, className: 'py-12 text-center text-[#86868b] font-medium' }, h(Search, { className: 'w-8 h-8 opacity-20 mx-auto mb-2' }), 'No records found'))
                    )
                ),
                list.length > visibleLimit && h(
                    'div',
                    { className: 'p-3 bg-[#f5f5f7]/60 text-center border-t border-black/5' },
                    h(
                        'button',
                        { type: 'button', onClick: () => setVisibleLimit((prev) => prev + 50), className: 'px-4 py-2 bg-white text-[#0071e3] text-xs font-bold rounded-xl border border-black/5 shadow-sm hover:bg-[#f5f5f7]' },
                        `Show More (${list.length - visibleLimit} remaining)`
                    )
                )
            )
        );
    });

    const TopPerformersWidget = memo(function TopPerformersWidget({
        topPerformers, topPerfDrillDown, setTopPerfDrillSku,
        topPerfSearch, setTopPerfSearch, topPerfSortMode, setTopPerfSortMode, kpi
    }) {
        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col' },
            h(
                'div',
                { className: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-6 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-2' },
                    h(Trophy, { className: 'w-5 h-5 text-[#ff9500] shrink-0' }),
                    h('h3', { className: 'text-base font-bold text-[#1d1d1f] flex items-center gap-1.5 truncate' }, topPerfDrillDown ? `Top Products: ${topPerfDrillDown.sku}` : 'Top Performers 2026')
                ),
                h(
                    'div',
                    { className: 'flex items-center gap-3 w-full md:w-auto' },
                    topPerfDrillDown
                        ? h(
                            'button',
                            { type: 'button', onClick: () => setTopPerfDrillSku(null), className: 'flex items-center gap-1.5 text-sm text-[#0071e3] bg-[#f5f5f7] hover:bg-[#e8e8ed] px-4 py-2 rounded-full font-medium' },
                            h(ArrowLeft, { className: 'w-4 h-4' }),
                            ' Back'
                        )
                        : h(
                            'div',
                            { className: 'relative w-full md:w-64' },
                            h('input', {
                                type: 'text',
                                placeholder: 'Search SKU...',
                                className: 'w-full pl-9 pr-3 py-2.5 sm:py-2 bg-[#f5f5f7] border-0 rounded-[12px] text-sm focus:outline-none',
                                value: topPerfSearch,
                                onChange: (e) => setTopPerfSearch(e.target.value)
                            }),
                            h(Search, { className: 'w-4 h-4 text-[#86868b] absolute left-3 top-3 sm:top-2.5' })
                        )
                )
            ),
            h(
                'div',
                { className: 'overflow-x-auto overflow-y-auto custom-scrollbar pr-1 max-h-80 border border-black/5 rounded-xl' },
                h(
                    'table',
                    { className: 'w-full text-sm text-left min-w-[720px]' },
                    h(
                        'thead',
                        { className: 'text-[#86868b] border-b border-[#e5e5ea] font-semibold text-xs uppercase sticky top-0 bg-[#f5f5f7]/95 backdrop-blur z-20' },
                        h(
                            'tr',
                            null,
                            h('th', { className: 'py-3 pl-3 w-14 text-center' }, 'Rank'),
                            h('th', { className: 'py-3 px-3 sticky left-0 bg-[#f5f5f7] z-20 sticky-col-shadow sm:shadow-none' }, 'Name'),
                            h('th', { className: 'py-3 px-2 w-24 text-center' }, 'Trend'),
                            h('th', { className: 'py-3 px-2 min-w-[200px]' }, 'Channels'),
                            h('th', { className: 'py-3 px-3 text-right cursor-pointer select-none', onClick: () => setTopPerfSortMode('sales') }, 'Sales ', topPerfSortMode === 'sales' && h(ArrowDown, { className: 'w-3 h-3 inline text-[#0071e3]' })),
                            h('th', { className: 'py-3 px-3 text-right cursor-pointer select-none', onClick: () => setTopPerfSortMode('yoy') }, 'YoY ', topPerfSortMode === 'yoy' && h(ArrowDown, { className: 'w-3 h-3 inline text-[#0071e3]' })),
                            h('th', { className: 'py-3 pr-3 text-right w-32' }, '% Proportion')
                        )
                    ),
                    h(
                        'tbody',
                        null,
                        topPerfDrillDown
                            ? (topPerfDrillDown.allProducts || []).map((prod, idx) => {
                                const yoy = prod.sales25 > 0 ? ((prod.value - prod.sales25) / prod.sales25) * 100 : null;
                                const proportionNum = kpi.s26 > 0 ? (prod.value / kpi.s26) * 100 : 0;
                                const proportion = proportionNum.toFixed(1);
                                return h(
                                    'tr',
                                    { key: prod.name, className: 'border-b border-[#e5e5ea]/50 hover:bg-[#f5f5f7] bg-white' },
                                    h('td', { className: 'py-3.5 pl-3 text-center font-semibold text-[#86868b]' }, `#${idx + 1}`),
                                    h('td', { className: 'py-3.5 px-3 font-medium text-[#1d1d1f] sticky left-0 bg-inherit z-10 sticky-col-shadow sm:shadow-none max-w-[180px] sm:max-w-[240px] truncate', title: prod.name }, prod.name),
                                    h('td', { className: 'py-3.5 px-2 text-center' }, h('div', { className: 'flex justify-center' }, h(Sparkline, { data: prod.monthlySales }))),
                                    h(
                                        'td',
                                        { className: 'py-3.5 px-2' },
                                        h('div', { className: 'flex flex-wrap gap-1.5' }, (prod.topChannels || []).map((c) => h('span', { key: c.name, className: 'px-2 py-0.5 bg-white border border-black/5 text-[10px] rounded-md truncate max-w-[160px]' }, `${c.name} (${c.pct}%)`)))
                                    ),
                                    h('td', { className: 'py-3.5 px-3 text-right font-semibold text-[#1d1d1f]' }, `฿${(prod.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                                    h('td', { className: 'py-3.5 px-3 text-right font-medium' }, yoy !== null ? h('span', { className: yoy >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]' }, `${yoy >= 0 ? '▲' : '▼'} ${Math.abs(yoy).toFixed(1)}%`) : h('span', { className: 'text-[#86868b]' }, 'N/A')),
                                    h(
                                        'td',
                                        { className: 'py-3.5 pr-3' },
                                        h('div', { className: 'flex items-center justify-end gap-2' }, h('span', { className: 'font-semibold text-[#86868b] w-10 text-right' }, `${proportion}%`), h('div', { className: 'w-16 h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden' }, h('div', { className: 'h-full bg-[#0071e3] rounded-full', style: { width: `${Math.max(0, Math.min(proportionNum, 100))}%` } })))
                                    )
                                );
                            })
                            : (topPerformers || []).map((item, idx) => {
                                const yoy = item.sales25 > 0 ? ((item.value - item.sales25) / item.sales25) * 100 : null;
                                const proportionNum = kpi.s26 > 0 ? (item.value / kpi.s26) * 100 : 0;
                                const proportion = proportionNum.toFixed(1);
                                return h(
                                    'tr',
                                    { key: item.sku, className: `border-b border-[#e5e5ea]/50 hover:bg-[#f5f5f7] cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f7]/30'}`, onClick: () => setTopPerfDrillSku(item.sku) },
                                    h('td', { className: 'py-3.5 pl-3 text-center font-semibold text-[#86868b]' }, `#${idx + 1}`),
                                    h(
                                        'td',
                                        { className: 'py-3.5 px-3 sticky left-0 bg-inherit z-10 sticky-col-shadow sm:shadow-none max-w-[180px] sm:max-w-[240px]' },
                                        h('div', { className: 'font-semibold text-[#1d1d1f] hover:text-[#0071e3] truncate', title: item.sku }, item.sku),
                                        h('div', { className: 'text-xs text-[#86868b] truncate' }, item.name)
                                    ),
                                    h('td', { className: 'py-3.5 px-2 text-center' }, h('div', { className: 'flex justify-center' }, h(Sparkline, { data: item.monthlySales }))),
                                    h(
                                        'td',
                                        { className: 'py-3.5 px-2' },
                                        h('div', { className: 'flex flex-wrap gap-1.5' }, (item.topChannels || []).map((c) => h('span', { key: c.name, className: 'px-2 py-0.5 bg-white border border-black/5 text-[10px] rounded-md truncate max-w-[160px]' }, `${c.name} (${c.pct}%)`)))
                                    ),
                                    h('td', { className: 'py-3.5 px-3 text-right font-semibold text-[#1d1d1f]' }, `฿${(item.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                                    h('td', { className: 'py-3.5 px-3 text-right font-medium' }, yoy !== null ? h('span', { className: yoy >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]' }, `${yoy >= 0 ? '▲' : '▼'} ${Math.abs(yoy).toFixed(1)}%`) : h('span', { className: 'text-[#86868b]' }, 'N/A')),
                                    h(
                                        'td',
                                        { className: 'py-3.5 pr-3' },
                                        h('div', { className: 'flex items-center justify-end gap-2' }, h('span', { className: 'font-semibold text-[#86868b] w-10 text-right' }, `${proportion}%`), h('div', { className: 'w-16 h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden' }, h('div', { className: 'h-full bg-[#0071e3] rounded-full', style: { width: `${Math.max(0, Math.min(proportionNum, 100))}%` } })))
                                    )
                                );
                            })
                    )
                )
            )
        );
    });

    const SkuHealthWidget = memo(function SkuHealthWidget({ filteredData }) {
        const [healthSearch, setHealthSearch] = useState('');
        const [selectedSkuKey, setSelectedSkuKey] = useState(null);
        const [visibleLimit, setVisibleLimit] = useState(50);
        const deferredHealthSearch = useDeferredValue(healthSearch);

        useEffect(() => { setVisibleLimit(50); }, [filteredData, deferredHealthSearch]);

        const returnData = useMemo(
            () => computeReturnDiagnostics(filteredData),
            [filteredData]
        );

        const selectedSku = useMemo(
            () => (selectedSkuKey ? returnData.topReturns.find((x) => x.key === selectedSkuKey) || null : null),
            [returnData.topReturns, selectedSkuKey]
        );

        const filteredReturnList = useMemo(() => {
            let list = returnData.topReturns;
            if (deferredHealthSearch.length >= 2) {
                const q = deferredHealthSearch.toLowerCase();
                list = list.filter((item) => item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q));
            }
            return list;
        }, [returnData.topReturns, deferredHealthSearch]);

        const slicedReturnList = useMemo(() => (filteredReturnList || []).slice(0, visibleLimit), [filteredReturnList, visibleLimit]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col' },
            h(
                'div',
                { className: 'flex flex-col xl:flex-row justify-between items-start xl:items-center mb-5 sm:mb-6 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-3' },
                    h('div', { className: 'bg-[#ff3b30]/10 p-2 rounded-xl shrink-0' }, h(AlertCircle, { className: 'w-6 h-6 text-[#ff3b30]' })),
                    h(
                        'div',
                        null,
                        h(
                            'div',
                            { className: 'flex items-center gap-2' },
                            h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'SKU Health & Return Diagnostics (2026)'),
                            h(
                                InfoPopover,
                                null,
                                h('span', { className: 'font-bold text-[#ff3b30]' }, '2026 Return Rate:'),
                                h('br'),
                                'คำนวณจากสัดส่วนมูลค่าสินค้าตีคืนปี 2026 เทียบกับยอดขายบวกสะสมปี 2026 (สอดคล้องกับบทวิเคราะห์ Executive Synthesis)'
                            )
                        ),
                        h('p', { className: 'text-xs text-[#86868b] font-medium' }, 'Tap a SKU to view channel breakdown.')
                    )
                ),
                h(
                    'div',
                    { className: 'flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full xl:w-auto' },
                    h(
                        'div',
                        { className: 'relative w-full sm:w-64' },
                        h('input', {
                            type: 'text',
                            placeholder: 'Search SKU...',
                            className: 'w-full pl-9 pr-3 py-2.5 bg-[#f5f5f7] border-0 rounded-[12px] text-sm outline-none',
                            value: healthSearch,
                            onChange: (e) => setHealthSearch(e.target.value)
                        }),
                        h(Search, { className: 'w-4 h-4 text-[#86868b] absolute left-3 top-3' })
                    ),
                    h(
                        'div',
                        { className: 'flex items-center justify-around sm:justify-start gap-4 bg-[#f5f5f7] px-4 py-2.5 rounded-[16px] border border-black/5 shrink-0' },
                        h('div', { className: 'flex flex-col' }, h('span', { className: 'text-[10px] font-bold text-[#86868b] uppercase tracking-wider' }, 'Total Returns'), h('span', { className: 'text-sm font-bold text-[#1d1d1f]' }, `฿${(returnData.totalReturns || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)),
                        h('div', { className: 'w-px h-8 bg-black/10' }),
                        h('div', { className: 'flex flex-col' }, h('span', { className: 'text-[10px] font-bold text-[#86868b] uppercase tracking-wider' }, '2026 Return Rate'), h('span', { className: `text-sm font-bold ${(returnData.overallRate || 0) > 3 ? 'text-[#ff3b30]' : 'text-[#34c759]'}` }, `${(returnData.overallRate || 0).toFixed(2)}%`))
                    )
                )
            ),
            selectedSku && h(
                'div',
                { className: 'mb-6 p-4 bg-[#f5f5f7] rounded-xl border border-black/5 animate-in fade-in duration-200' },
                h(
                    'div',
                    { className: 'flex justify-between items-center mb-4 gap-2' },
                    h('h4', { className: 'font-bold text-sm truncate' }, 'Channel Breakdown: ', h('span', { className: 'text-[#0071e3]' }, selectedSku.name)),
                    h(
                        'button',
                        { type: 'button', onClick: () => setSelectedSkuKey(null), className: 'text-xs text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-black/5' },
                        h(X, { className: 'w-3 h-3' }),
                        'Close'
                    )
                ),
                h(
                    'div',
                    { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                    Object.entries(selectedSku.channels || {}).map(([ch, val]) => h(
                        'div',
                        { key: ch, className: 'bg-white p-3 rounded-lg border border-black/5 shadow-sm' },
                        h('div', { className: 'text-[10px] uppercase text-[#86868b] font-bold truncate', title: ch }, ch),
                        h('div', { className: 'text-sm font-bold text-[#ff3b30] mt-0.5' }, `฿${(val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)
                    ))
                )
            ),
            h(
                'div',
                { className: 'overflow-y-auto overflow-x-auto custom-scrollbar border border-black/5 rounded-xl max-h-[380px] bg-white' },
                h(
                    'table',
                    { className: 'w-full text-sm text-left border-collapse min-w-[640px]' },
                    h(
                        'thead',
                        { className: 'bg-[#f5f5f7] border-b border-black/5 sticky top-0 z-20' },
                        h(
                            'tr',
                            { className: 'text-[#86868b] font-semibold text-xs uppercase tracking-wider' },
                            h('th', { className: 'py-3 px-3 sm:px-4 w-14 text-center' }, 'Rank'),
                            h('th', { className: 'py-3 px-3 sm:px-4 sticky left-0 bg-[#f5f5f7] z-20 sticky-col-shadow sm:shadow-none' }, 'Product Name'),
                            h('th', { className: 'py-3 px-4 text-right w-32' }, 'Return Value'),
                            h('th', { className: 'py-3 px-4 text-right w-32' }, '2026 Return Rate')
                        )
                    ),
                    h(
                        'tbody',
                        null,
                        slicedReturnList.length > 0
                            ? slicedReturnList.map((item, idx) => h(
                                'tr',
                                {
                                    key: item.key,
                                    onClick: () => setSelectedSkuKey(item.key),
                                    className: `cursor-pointer border-b border-[#e5e5ea]/50 hover:bg-[#ff3b30]/5 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f7]/30'} ${selectedSkuKey === item.key ? 'bg-[#ff3b30]/10' : ''}`
                                },
                                h('td', { className: 'py-3.5 px-3 sm:px-4 text-center font-bold text-[#86868b]' }, `#${idx + 1}`),
                                h(
                                    'td',
                                    { className: 'py-3.5 px-3 sm:px-4 sticky left-0 bg-inherit z-10 sticky-col-shadow sm:shadow-none max-w-[200px] sm:max-w-[280px]' },
                                    h('div', { className: 'font-semibold text-[#1d1d1f] truncate', title: item.name }, item.name),
                                    h('div', { className: 'text-[10px] text-[#86868b] font-medium truncate' }, item.sku)
                                ),
                                h('td', { className: 'py-3.5 px-4 text-right font-bold text-[#1d1d1f]' }, `฿${(item.returns || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                                h(
                                    'td',
                                    { className: 'py-3.5 px-4 text-right' },
                                    h('span', { className: `font-bold px-2 py-1 rounded-md ${(item.rate || 0) > 3 ? 'text-[#ff3b30] bg-[#ff3b30]/10' : 'text-[#1d1d1f] bg-[#e5e5ea]'}` }, `${(item.rate || 0).toFixed(1)}%`)
                                )
                            ))
                            : h('tr', null, h('td', { colSpan: 4, className: 'py-10 text-center text-[#86868b] font-medium' }, 'No product returns matching your search.'))
                    )
                ),
                filteredReturnList.length > visibleLimit && h(
                    'div',
                    { className: 'p-3 bg-[#f5f5f7]/60 text-center border-t border-black/5' },
                    h(
                        'button',
                        { type: 'button', onClick: () => setVisibleLimit((prev) => prev + 50), className: 'px-4 py-2 bg-white text-[#0071e3] text-xs font-bold rounded-xl border border-black/5 shadow-sm hover:bg-[#f5f5f7]' },
                        `Show More (${filteredReturnList.length - visibleLimit} remaining)`
                    )
                )
            )
        );
    });

    NPD.components = NPD.components || {};
    Object.assign(NPD.components, {
        PortfolioMixWidget,
        ProductProfitabilityWidget,
        TopPerformersWidget,
        SkuHealthWidget
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
