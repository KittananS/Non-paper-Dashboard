(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};
    const React = root.React;
    if (!React) return;

    const h = React.createElement;
    const { useState, useMemo, useEffect, memo } = React;
    const Recharts = root.Recharts || {};
    const { ComposedChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = Recharts;

    const Icons = NPD.icons || NPD.createIconFactory(React);
    const { BarChart2, TrendingUp, Info, Box, Tag } = Icons;
    const { SafeWidget, InfoPopover, ExportCSVButton } = NPD.components;

    const ValueVsVolumeWidget = memo(function ValueVsVolumeWidget({ data, monthsList, unit }) {
        const chartData = useMemo(() => {
            const salesByMonth = new Array(12).fill(0);
            const qtyByMonth = new Array(12).fill(0);
            const arr = data || [];
            for (let i = 0; i < arr.length; i++) {
                const x = arr[i];
                if (x && x.Year === '2026') {
                    const mIdx = x.MonthIndex >= 1 && x.MonthIndex <= 12 ? x.MonthIndex - 1 : -1;
                    if (mIdx >= 0) {
                        salesByMonth[mIdx] += Number(x.NetPrice) || 0;
                        qtyByMonth[mIdx] += Number(x.Quantity) || 0;
                    }
                }
            }
            return (monthsList || []).map((m, idx) => ({
                name: m,
                Sales: salesByMonth[idx],
                Quantity: qtyByMonth[idx]
            }));
        }, [data, monthsList]);

        const totalQty = chartData.reduce((s, d) => s + d.Quantity, 0);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col' },
            h(
                'div',
                { className: 'flex justify-between items-start mb-5 sm:mb-6 gap-2' },
                h(
                    'div',
                    null,
                    h('h3', { className: 'text-base font-bold text-[#1d1d1f] flex items-center gap-2' }, h(BarChart2, { className: 'w-5 h-5 text-[#0071e3] shrink-0' }), ' Value vs. Volume Growth'),
                    h('p', { className: 'text-xs text-[#86868b] font-medium mt-1' }, 'Correlation between Sales Revenue and Quantity Sold')
                ),
                h(
                    'div',
                    { className: 'text-right shrink-0' },
                    h('div', { className: 'text-[10px] font-bold text-[#86868b] uppercase tracking-wider' }, 'Total Volume (2026)'),
                    h('div', { className: 'text-base sm:text-lg font-extrabold text-[#1d1d1f]' }, `${totalQty.toLocaleString()} `, h('span', { className: 'text-xs sm:text-sm font-semibold text-[#86868b]' }, unit))
                )
            ),
            h(
                'div',
                { className: 'h-64' },
                h(
                    ResponsiveContainer,
                    { width: '100%', height: '100%' },
                    h(
                        ComposedChart,
                        { data: chartData, margin: { top: 10, right: 10, left: -10, bottom: 0 } },
                        h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, stroke: '#e5e5ea' }),
                        h(XAxis, { dataKey: 'name', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, axisLine: false, tickLine: false }),
                        h(YAxis, { yAxisId: 'left', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, tickFormatter: (v) => `${((v || 0) / 1000000).toFixed(1)}M`, axisLine: false, tickLine: false }),
                        h(YAxis, { yAxisId: 'right', orientation: 'right', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, tickFormatter: (v) => `${((v || 0) / 1000).toFixed(0)}k`, axisLine: false, tickLine: false }),
                        h(Tooltip, {
                            cursor: { fill: '#f5f5f7' },
                            contentStyle: { borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.95)' },
                            formatter: (v, n) => (n === 'Sales' ? `฿${((v || 0) / 1000000).toFixed(2)}M` : `${(v || 0).toLocaleString()} ${unit}`)
                        }),
                        h(Legend, { wrapperStyle: { fontSize: '11px', fontWeight: '500', color: '#86868b' } }),
                        h(Bar, { yAxisId: 'left', dataKey: 'Sales', name: 'Sales (฿)', fill: '#0071e3', radius: [4, 4, 0, 0], maxBarSize: 40 }),
                        h(Line, { yAxisId: 'right', type: 'monotone', dataKey: 'Quantity', name: `Quantity (${unit})`, stroke: '#ff9500', strokeWidth: 3, dot: { r: 4, fill: '#ff9500' }, activeDot: { r: 6 } })
                    )
                )
            )
        );
    });

    const ASPTrackerWidget = memo(function ASPTrackerWidget({ data, monthsList, unit }) {
        const chartData = useMemo(() => {
            const salesByMonth = new Array(12).fill(0);
            const qtyByMonth = new Array(12).fill(0);
            const arr = data || [];
            for (let i = 0; i < arr.length; i++) {
                const x = arr[i];
                // Calculate ASP exclusively from records that actually carry positive quantity data
                if (x && x.Year === '2026' && x.Quantity > 0) {
                    const mIdx = x.MonthIndex >= 1 && x.MonthIndex <= 12 ? x.MonthIndex - 1 : -1;
                    if (mIdx >= 0) {
                        salesByMonth[mIdx] += Number(x.NetPrice) || 0;
                        qtyByMonth[mIdx] += Number(x.Quantity) || 0;
                    }
                }
            }
            return (monthsList || []).map((m, idx) => {
                const sales = salesByMonth[idx];
                const qty = qtyByMonth[idx];
                return { name: m, ASP: qty > 0 ? sales / qty : null };
            });
        }, [data, monthsList]);

        const validASPMonths = chartData.filter((d) => d.ASP !== null);
        const avgASP = validASPMonths.length > 0
            ? validASPMonths.reduce((s, d) => s + d.ASP, 0) / validASPMonths.length
            : 0;

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col' },
            h(
                'div',
                { className: 'flex justify-between items-start mb-5 sm:mb-6 gap-2' },
                h(
                    'div',
                    null,
                    h('h3', { className: 'text-base font-bold text-[#1d1d1f] flex items-center gap-2' }, h(TrendingUp, { className: 'w-5 h-5 text-[#af52de] shrink-0' }), ' ASP Tracker'),
                    h('p', { className: 'text-xs text-[#86868b] font-medium mt-1' }, `Average Selling Price per ${unit} across Portfolio`)
                ),
                h(
                    'div',
                    { className: 'text-right shrink-0' },
                    h('div', { className: 'text-[10px] font-bold text-[#86868b] uppercase tracking-wider' }, 'Avg ASP'),
                    h('div', { className: 'text-base sm:text-lg font-extrabold text-[#af52de]' }, `฿${avgASP.toFixed(2)}`)
                )
            ),
            h(
                'div',
                { className: 'h-64' },
                h(
                    ResponsiveContainer,
                    { width: '100%', height: '100%' },
                    h(
                        LineChart,
                        { data: chartData, margin: { top: 10, right: 10, left: -10, bottom: 0 } },
                        h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, stroke: '#e5e5ea' }),
                        h(XAxis, { dataKey: 'name', tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, axisLine: false, tickLine: false }),
                        h(YAxis, { domain: ['auto', 'auto'], tick: { fontSize: 11, fontWeight: 500, fill: '#86868b' }, tickFormatter: (v) => `฿${(v || 0).toFixed(0)}`, axisLine: false, tickLine: false }),
                        h(Tooltip, {
                            cursor: { stroke: '#e5e5ea', strokeDasharray: '3 3' },
                            contentStyle: { borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 14px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: '500', backgroundColor: 'rgba(255,255,255,0.95)' },
                            formatter: (v) => `฿${(v || 0).toFixed(2)}/${unit}`
                        }),
                        h(Line, { type: 'monotone', dataKey: 'ASP', stroke: '#af52de', strokeWidth: 3, dot: { r: 4, fill: '#af52de' }, activeDot: { r: 6 }, connectNulls: true })
                    )
                )
            ),
            h(
                'div',
                { className: 'mt-4 text-xs font-medium text-[#86868b] bg-[#f5f5f7] p-3 rounded-xl border border-black/5 flex items-start gap-2' },
                h(Info, { className: 'w-4 h-4 text-[#0071e3] shrink-0' }),
                h('span', null, 'ASP is calculated strictly from records containing quantity data (Starting from Aug 2026 onwards).')
            )
        );
    });

    const TopVolumeMoversWidget = memo(function TopVolumeMoversWidget({ data, unit }) {
        const allMovers = useMemo(() => {
            const map = {};
            const arr = data || [];
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (d && d.Year === '2026' && d.Quantity > 0) {
                    const name = d.ProductName || 'Unknown';
                    if (!map[name]) map[name] = { name, sku: d.GroupSKU, qty: 0, sales: 0 };
                    map[name].qty += d.Quantity;
                    map[name].sales += Number(d.NetPrice) || 0;
                }
            }
            return Object.values(map).sort((a, b) => b.qty - a.qty);
        }, [data]);

        const topMovers = useMemo(() => allMovers.slice(0, 10), [allMovers]);

        const csvColumns = useMemo(() => [
            { label: 'Rank', accessor: (_r, idx) => idx + 1 },
            { label: 'Product Name', key: 'name' },
            { label: 'Group SKU', key: 'sku' },
            { label: 'Sales 2026 (THB)', accessor: (r) => Number((r.sales || 0).toFixed(2)) },
            { label: `Volume (${unit || 'UNIT'})`, accessor: (r) => Number((r.qty || 0).toFixed(2)) }
        ], [unit]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col h-full max-h-[420px]' },
            h(
                'div',
                { className: 'flex items-center justify-between mb-4 gap-2' },
                h('div', { className: 'flex items-center gap-2' }, h(Box, { className: 'w-5 h-5 text-[#34c759]' }), h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'Top Volume Movers')),
                h(ExportCSVButton, { filename: `NPD_Volume_Movers_${unit || 'UNIT'}_2026.csv`, columns: csvColumns, rows: allMovers })
            ),
            h(
                'div',
                { className: 'overflow-y-auto overflow-x-auto custom-scrollbar flex-1 pr-1' },
                topMovers.length > 0
                    ? h(
                        'table',
                        { className: 'w-full text-sm text-left min-w-[420px]' },
                        h(
                            'thead',
                            { className: 'sticky top-0 bg-white z-10 border-b border-[#e5e5ea] text-[#86868b] font-semibold text-xs uppercase' },
                            h('tr', null, h('th', { className: 'py-2 pb-3' }, 'Product Name'), h('th', { className: 'py-2 pb-3 text-right' }, 'Sales (฿)'), h('th', { className: 'py-2 pb-3 text-right' }, `Volume (${unit})`))
                        ),
                        h(
                            'tbody',
                            null,
                            topMovers.map((item) => h(
                                'tr',
                                { key: item.name, className: 'border-b border-[#e5e5ea]/50 hover:bg-[#f5f5f7]' },
                                h('td', { className: 'py-3 font-semibold text-[#1d1d1f] truncate max-w-[180px] sm:max-w-[200px]', title: item.name }, item.name),
                                h('td', { className: 'py-3 text-right font-medium text-[#86868b]' }, (item.sales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })),
                                h('td', { className: 'py-3 text-right font-bold text-[#34c759]' }, (item.qty || 0).toLocaleString())
                            ))
                        )
                    )
                    : h(
                        'div',
                        { className: 'h-full flex flex-col items-center justify-center text-[#86868b] opacity-50 py-10' },
                        h(Box, { className: 'w-8 h-8 mb-2' }),
                        h('span', { className: 'text-xs font-medium' }, 'No volume data available')
                    )
            )
        );
    });

    const GrossProfitPerUnitWidget = memo(function GrossProfitPerUnitWidget({ data, unit }) {
        const allGpData = useMemo(() => {
            const map = {};
            const arr = data || [];
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                // Strictly require real cost & positive quantity (zero mockMargin fabrication!)
                if (d && d.Year === '2026' && d.Quantity > 0 && d.HasCost && d.Cost > 0) {
                    const name = d.ProductName || 'Unknown';
                    if (!map[name]) map[name] = { name, sku: d.GroupSKU, qty: 0, sales: 0, cost: 0 };
                    map[name].qty += d.Quantity;
                    map[name].sales += Number(d.NetPrice) || 0;
                    map[name].cost += d.Cost;
                }
            }
            return Object.values(map)
                .map((item) => {
                    const gp = item.sales - item.cost;
                    const gpPerUnit = item.qty > 0 ? gp / item.qty : 0;
                    return { ...item, gp, gpPerUnit };
                })
                .sort((a, b) => b.gpPerUnit - a.gpPerUnit);
        }, [data]);

        const gpData = useMemo(() => allGpData.slice(0, 10), [allGpData]);

        const csvColumns = useMemo(() => [
            { label: 'Rank', accessor: (_r, idx) => idx + 1 },
            { label: 'Product Name', key: 'name' },
            { label: 'Group SKU', key: 'sku' },
            { label: 'Verified Sales 2026 (THB)', accessor: (r) => Number((r.sales || 0).toFixed(2)) },
            { label: 'Verified Cost 2026 (THB)', accessor: (r) => Number((r.cost || 0).toFixed(2)) },
            { label: 'Gross Profit (THB)', accessor: (r) => Number((r.gp || 0).toFixed(2)) },
            { label: `Volume (${unit || 'UNIT'})`, accessor: (r) => Number((r.qty || 0).toFixed(2)) },
            { label: `GP per ${unit || 'UNIT'} (THB)`, accessor: (r) => Number((r.gpPerUnit || 0).toFixed(2)) }
        ], [unit]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] flex flex-col h-full max-h-[420px]' },
            h(
                'div',
                { className: 'flex items-center justify-between mb-4 gap-2' },
                h(
                    'div',
                    { className: 'flex items-center gap-2' },
                    h(Tag, { className: 'w-5 h-5 text-[#ff2d55]' }),
                    h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'Gross Profit per Unit'),
                    h(
                        InfoPopover,
                        null,
                        h('span', { className: 'font-bold text-[#ff2d55]' }, 'Unit Margin Power: '),
                        `Ranking products by verified Gross Profit earned per 1 ${unit} sold (computed exclusively from records with actual Cost and Quantity).`
                    )
                ),
                h(ExportCSVButton, { filename: `NPD_GP_Per_Unit_${unit || 'UNIT'}_2026.csv`, columns: csvColumns, rows: allGpData })
            ),
            h(
                'div',
                { className: 'overflow-y-auto overflow-x-auto custom-scrollbar flex-1 pr-1' },
                gpData.length > 0
                    ? h(
                        'table',
                        { className: 'w-full text-sm text-left min-w-[420px]' },
                        h(
                            'thead',
                            { className: 'sticky top-0 bg-white z-10 border-b border-[#e5e5ea] text-[#86868b] font-semibold text-xs uppercase' },
                            h('tr', null, h('th', { className: 'py-2 pb-3' }, 'Product Name'), h('th', { className: 'py-2 pb-3 text-right' }, 'GP (฿)'), h('th', { className: 'py-2 pb-3 text-right' }, `GP / ${unit}`))
                        ),
                        h(
                            'tbody',
                            null,
                            gpData.map((item) => h(
                                'tr',
                                { key: item.name, className: 'border-b border-[#e5e5ea]/50 hover:bg-[#f5f5f7]' },
                                h('td', { className: 'py-3 font-semibold text-[#1d1d1f] truncate max-w-[180px] sm:max-w-[200px]', title: item.name }, item.name),
                                h('td', { className: 'py-3 text-right font-medium text-[#86868b]' }, (item.gp || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })),
                                h('td', { className: 'py-3 text-right font-bold text-[#ff2d55]' }, `฿${(item.gpPerUnit || 0).toFixed(2)}`)
                            ))
                        )
                    )
                    : h(
                        'div',
                        { className: 'h-full flex flex-col items-center justify-center text-[#86868b] opacity-50 py-10' },
                        h(Tag, { className: 'w-8 h-8 mb-2' }),
                        h('span', { className: 'text-xs font-medium' }, 'No verified unit margin data available')
                    )
            )
        );
    });

    const VolumeDashboardView = memo(function VolumeDashboardView({ filteredData, monthsList }) {
        const availableUnits = useMemo(() => {
            const units = new Set();
            const arr = filteredData || [];
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (d && d.BaseUnit && d.Year === '2026' && d.Quantity > 0) units.add(d.BaseUnit);
            }
            if (units.size === 0) {
                for (let i = 0; i < arr.length; i++) {
                    const d = arr[i];
                    if (d && d.BaseUnit && d.Year === '2026') units.add(d.BaseUnit);
                }
            }
            return Array.from(units).sort();
        }, [filteredData]);

        const [selectedUnit, setSelectedUnit] = useState('');

        useEffect(() => {
            if (availableUnits.length > 0 && !availableUnits.includes(selectedUnit)) {
                setSelectedUnit(availableUnits[0]);
            }
        }, [availableUnits, selectedUnit]);

        const unitFilteredData = useMemo(() => {
            if (!selectedUnit) return [];
            return (filteredData || []).filter((d) => d.BaseUnit === selectedUnit);
        }, [filteredData, selectedUnit]);

        return h(
            'div',
            { className: 'space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both' },
            h(
                'div',
                { className: 'bg-white p-4 sm:p-5 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-start md:items-center justify-between border border-black/5 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-3' },
                    h('div', { className: 'bg-[#0071e3]/10 p-2.5 rounded-xl shrink-0' }, h(Box, { className: 'w-5 h-5 text-[#0071e3]' })),
                    h(
                        'div',
                        null,
                        h('h3', { className: 'font-bold text-[#1d1d1f] text-base' }, 'Unit Economics & Volume'),
                        h('p', { className: 'text-xs text-[#86868b] font-medium mt-0.5' }, 'Select base unit to normalize volume calculations across the portfolio')
                    )
                ),
                availableUnits.length > 0
                    ? h(
                        'div',
                        { className: 'no-print flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar' },
                        h('span', { className: 'text-xs font-bold text-[#86868b] uppercase tracking-wider shrink-0' }, 'Base Unit:'),
                        h(
                            'div',
                            { className: 'flex bg-[#e3e3e8] p-1.5 rounded-[14px] shadow-inner' },
                            availableUnits.map((u) => h(
                                'button',
                                {
                                    key: u,
                                    type: 'button',
                                    onClick: () => setSelectedUnit(u),
                                    className: `px-4 py-2 text-xs font-bold rounded-[10px] transition-all ${selectedUnit === u ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5'}`
                                },
                                u
                            ))
                        )
                    )
                    : h('div', { className: 'text-sm font-medium text-[#86868b]' }, 'No volume data available')
            ),
            h(
                'div',
                { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
                h(SafeWidget, null, h(ValueVsVolumeWidget, { data: unitFilteredData, monthsList, unit: selectedUnit })),
                h(SafeWidget, null, h(ASPTrackerWidget, { data: unitFilteredData, monthsList, unit: selectedUnit }))
            ),
            h(
                'div',
                { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
                h(SafeWidget, null, h(TopVolumeMoversWidget, { data: unitFilteredData, unit: selectedUnit })),
                h(SafeWidget, null, h(GrossProfitPerUnitWidget, { data: unitFilteredData, unit: selectedUnit }))
            )
        );
    });

    NPD.components = NPD.components || {};
    Object.assign(NPD.components, {
        ValueVsVolumeWidget,
        ASPTrackerWidget,
        TopVolumeMoversWidget,
        GrossProfitPerUnitWidget,
        VolumeDashboardView
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
