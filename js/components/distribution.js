(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};
    const React = root.React;
    if (!React) return;

    const h = React.createElement;
    const { useState, useMemo, useEffect, useCallback, useRef, useDeferredValue, memo } = React;
    const { resolveAccountName, copyTextToClipboard } = NPD.utils;
    const Icons = NPD.icons || NPD.createIconFactory(React);
    const {
        Store, ArrowLeft, Search, ArrowDown, MapPin, Crosshair, Layers, X, Users, Check, Copy
    } = Icons;
    const { FilterDropdown, Sparkline } = NPD.components;

    const TopCustomersWidget = memo(function TopCustomersWidget({
        topCustomers, uniqueCustomersCount, customerSearch, setCustomerSearch,
        topCustomerSortMode, setTopCustomerSortMode, kpi, topCustomerDrillDown, setTopCustomerDrillKey
    }) {
        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04]' },
            h(
                'div',
                { className: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-6 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-3' },
                    h(Store, { className: 'w-6 h-6 text-[#ff2d55] shrink-0' }),
                    h(
                        'div',
                        null,
                        h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, topCustomerDrillDown ? `Top Products: ${topCustomerDrillDown.name}` : 'Top Sold-To Party (2026)'),
                        h('p', { className: 'text-xs text-[#86868b] font-medium' }, topCustomerDrillDown ? `Channel: ${topCustomerDrillDown.channel}` : `Showing ${uniqueCustomersCount || 0} unique active outlets/chains`)
                    )
                ),
                h(
                    'div',
                    { className: 'flex items-center gap-3 w-full md:w-auto' },
                    topCustomerDrillDown
                        ? h(
                            'button',
                            { type: 'button', onClick: () => setTopCustomerDrillKey(null), className: 'flex items-center gap-1.5 text-sm text-[#0071e3] bg-[#f5f5f7] hover:bg-[#e8e8ed] px-4 py-2 rounded-full font-medium' },
                            h(ArrowLeft, { className: 'w-4 h-4' }),
                            ' Back'
                        )
                        : h(
                            'div',
                            { className: 'relative w-full md:w-64' },
                            h('input', {
                                type: 'text',
                                placeholder: 'Filter Customer...',
                                className: 'w-full pl-9 pr-3 py-2.5 sm:py-2 bg-[#f5f5f7] border-0 rounded-[12px] text-sm focus:outline-none',
                                value: customerSearch,
                                onChange: (e) => setCustomerSearch(e.target.value)
                            }),
                            h(Search, { className: 'w-4 h-4 text-[#86868b] absolute left-3 top-3 sm:top-2.5' })
                        )
                )
            ),
            h(
                'div',
                { className: 'overflow-x-auto custom-scrollbar max-h-[400px] border border-black/5 rounded-xl bg-white' },
                h(
                    'table',
                    { className: 'w-full text-sm text-left border-collapse min-w-[780px]' },
                    h(
                        'thead',
                        { className: 'sticky top-0 bg-[#f5f5f7]/95 backdrop-blur z-20 shadow-[0_1px_0_#e5e5ea] text-[#86868b] font-semibold text-xs uppercase' },
                        h(
                            'tr',
                            null,
                            h('th', { className: 'py-3 px-3 sm:px-4 w-14 text-center' }, 'Rank'),
                            h('th', { className: 'py-3 px-3 sm:px-4 sticky left-0 bg-[#f5f5f7] z-20 sticky-col-shadow sm:shadow-none' }, topCustomerDrillDown ? 'Product Name' : 'Sold-To Party / Chain'),
                            !topCustomerDrillDown && h('th', { className: 'py-3 px-4 w-24' }, 'Channel'),
                            h('th', { className: 'py-3 px-4 w-24 text-center' }, 'Trend'),
                            h('th', { className: 'py-3 px-4 text-right cursor-pointer select-none', onClick: () => setTopCustomerSortMode('sales') }, 'Sales ', topCustomerSortMode === 'sales' && h(ArrowDown, { className: 'w-3 h-3 inline text-[#0071e3]' })),
                            h('th', { className: 'py-3 px-4 text-right cursor-pointer select-none', onClick: () => setTopCustomerSortMode('yoy') }, 'YoY ', topCustomerSortMode === 'yoy' && h(ArrowDown, { className: 'w-3 h-3 inline text-[#0071e3]' })),
                            h('th', { className: 'py-3 px-4 text-right' }, '% Proportion')
                        )
                    ),
                    h(
                        'tbody',
                        null,
                        topCustomerDrillDown
                            ? (topCustomerDrillDown.allProducts || []).map((prod, idx) => {
                                const yoy = prod.sales25 > 0 ? ((prod.value - prod.sales25) / prod.sales25) * 100 : null;
                                const proportion = topCustomerDrillDown.totalSales26 > 0 ? ((prod.value / topCustomerDrillDown.totalSales26) * 100).toFixed(1) : '0.0';
                                return h(
                                    'tr',
                                    { key: prod.name, className: 'border-b border-[#e5e5ea]/50 hover:bg-[#f5f5f7] bg-white' },
                                    h('td', { className: 'py-3.5 sm:py-4 px-3 sm:px-4 text-center font-semibold text-[#86868b]' }, `#${idx + 1}`),
                                    h('td', { className: 'py-3.5 sm:py-4 px-3 sm:px-4 font-medium text-[#1d1d1f] sticky left-0 bg-inherit z-10 sticky-col-shadow sm:shadow-none max-w-[180px] sm:max-w-[260px] truncate', title: prod.name }, prod.name),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-center' }, h('div', { className: 'flex justify-center' }, h(Sparkline, { data: prod.monthlySales }))),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-right font-semibold text-[#1d1d1f]' }, `฿${(prod.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-right font-medium' }, yoy !== null ? h('span', { className: yoy >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]' }, `${yoy >= 0 ? '▲' : '▼'} ${Math.abs(yoy).toFixed(1)}%`) : h('span', { className: 'text-[#86868b]' }, 'N/A')),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-right font-semibold text-[#86868b]' }, `${proportion}%`)
                                );
                            })
                            : (topCustomers || []).map((item, idx) => {
                                const proportion = kpi.s26 > 0 ? ((item.totalSales26 / kpi.s26) * 100).toFixed(1) : '0.0';
                                const yoy = item.totalSales25 > 0 ? ((item.totalSales26 - item.totalSales25) / item.totalSales25) * 100 : null;
                                return h(
                                    'tr',
                                    { key: item.key, className: `border-b border-[#e5e5ea]/50 hover:bg-[#f5f5f7] cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f7]/30'}`, onClick: () => setTopCustomerDrillKey(item.key) },
                                    h('td', { className: 'py-3.5 sm:py-4 px-3 sm:px-4 text-center font-semibold text-[#86868b]' }, `#${idx + 1}`),
                                    h('td', { className: 'py-3.5 sm:py-4 px-3 sm:px-4 font-medium text-[#1d1d1f] sticky left-0 bg-inherit z-10 sticky-col-shadow sm:shadow-none max-w-[180px] sm:max-w-[260px] truncate', title: item.name }, item.name),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4' }, h('span', { className: 'bg-[#e5e5ea] px-2.5 py-1 rounded-md text-[11px] font-semibold' }, item.channel)),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-center' }, h('div', { className: 'flex justify-center' }, h(Sparkline, { data: item.monthlySales }))),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-right font-semibold text-[#1d1d1f]' }, `฿${(item.totalSales26 || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-right font-medium' }, yoy !== null ? h('span', { className: yoy >= 0 ? 'text-[#34c759]' : 'text-[#ff3b30]' }, `${yoy >= 0 ? '▲' : '▼'} ${Math.abs(yoy).toFixed(1)}%`) : h('span', { className: 'text-[#86868b]' }, 'N/A')),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-right font-semibold text-[#86868b]' }, `${proportion}%`)
                                );
                            })
                    )
                )
            )
        );
    });

    const ProductPresenceWidget = memo(function ProductPresenceWidget({ filteredData }) {
        const [breadcrumbs, setBreadcrumbs] = useState([]);
        const [search, setSearch] = useState('');
        const [visibleLimit, setVisibleLimit] = useState(50);
        const deferredSearch = useDeferredValue(search);

        useEffect(() => { setBreadcrumbs([]); setSearch(''); setVisibleLimit(50); }, [filteredData]);
        useEffect(() => { setVisibleLimit(50); }, [breadcrumbs, deferredSearch]);

        const levelNames = ['Sub-Product Group', 'Group SKU', 'Product Name'];
        const currentLevelIdx = breadcrumbs.length;
        const currentLevelName = levelNames[currentLevelIdx] || 'Detail';

        const rawData = useMemo(() => {
            const uniqueLocs = new Set();
            const channelMap = {};
            const groupBy = breadcrumbs.length === 0 ? 'SubProductGroup' : (breadcrumbs.length === 1 ? 'GroupSKU' : 'ProductName');
            const map = {};
            const buildList = breadcrumbs.length < 3;
            const arrData = filteredData || [];

            for (let i = 0; i < arrData.length; i++) {
                const d = arrData[i];
                if (!d || d.Year !== '2026') continue;
                if (breadcrumbs.length > 0 && d.SubProductGroup !== breadcrumbs[0]) continue;
                if (breadcrumbs.length > 1 && d.GroupSKU !== breadcrumbs[1]) continue;
                if (breadcrumbs.length > 2 && d.ProductName !== breadcrumbs[2]) continue;

                const loc = resolveAccountName(d);
                const ch = d.Channel || 'Unknown';
                const locKey = `${ch}|${loc}`;

                if (loc !== 'Unknown') {
                    uniqueLocs.add(locKey);
                    if (!channelMap[ch]) channelMap[ch] = new Set();
                    channelMap[ch].add(loc);
                }

                if (buildList) {
                    const key = d[groupBy] || 'Unknown';
                    if (!map[key]) map[key] = { name: key, sales: 0, locations: new Set(), monthlySales: new Array(12).fill(0) };
                    const val = Number(d.NetPrice) || 0;
                    map[key].sales += val;
                    const mIdx = d.MonthIndex >= 1 && d.MonthIndex <= 12 ? d.MonthIndex - 1 : -1;
                    if (mIdx >= 0) map[key].monthlySales[mIdx] += val;
                    if (loc !== 'Unknown') map[key].locations.add(locKey);
                }
            }

            const formattedDetail = {};
            Object.keys(channelMap).sort().forEach((ch) => {
                const locs = Array.from(channelMap[ch]).sort();
                formattedDetail[ch] = { locations: locs, count: locs.length };
            });

            if (buildList) {
                return {
                    rawList: Object.values(map).map((v) => ({ name: v.name, sales: v.sales, monthlySales: v.monthlySales, count: v.locations.size })),
                    detail: { channels: formattedDetail },
                    totalLocations: uniqueLocs.size
                };
            }
            return { rawList: null, detail: { channels: formattedDetail }, totalLocations: uniqueLocs.size };
        }, [filteredData, breadcrumbs]);

        const { list, detail, totalLocations, maxCount } = useMemo(() => {
            if (!rawData.rawList) return { list: null, detail: rawData.detail, totalLocations: rawData.totalLocations, maxCount: 0 };
            let arr = [...rawData.rawList].sort((a, b) => b.sales - a.sales);
            if (deferredSearch) {
                const q = deferredSearch.toLowerCase();
                arr = arr.filter((item) => item.name.toLowerCase().includes(q));
            }
            let maxC = 0;
            for (let i = 0; i < arr.length; i++) {
                if (arr[i].count > maxC) maxC = arr[i].count;
            }
            return { list: arr, detail: rawData.detail, totalLocations: rawData.totalLocations, maxCount: maxC };
        }, [rawData, deferredSearch]);

        const slicedList = useMemo(() => (list ? list.slice(0, visibleLimit) : null), [list, visibleLimit]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04]' },
            h(
                'div',
                { className: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-3' },
                    h('div', { className: 'bg-[#0071e3]/10 p-2 rounded-xl shrink-0' }, h(MapPin, { className: 'w-6 h-6 text-[#0071e3]' })),
                    h(
                        'div',
                        null,
                        h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'Product Presence (2026)'),
                        h('p', { className: 'text-xs text-[#86868b] font-medium mt-0.5' }, 'Total Active Locations: ', h('span', { className: 'font-bold text-[#1d1d1f]' }, totalLocations || 0))
                    )
                ),
                h(
                    'div',
                    { className: 'flex items-center gap-3 w-full md:w-auto' },
                    breadcrumbs.length > 0 && h(
                        'button',
                        { type: 'button', onClick: () => { setBreadcrumbs(breadcrumbs.slice(0, -1)); setSearch(''); }, className: 'flex items-center gap-1.5 text-sm text-[#0071e3] bg-[#f5f5f7] hover:bg-[#e8e8ed] px-4 py-2 rounded-full font-medium transition-colors shrink-0' },
                        h(ArrowLeft, { className: 'w-4 h-4' }),
                        ' Back'
                    ),
                    breadcrumbs.length < 3 && h(
                        'div',
                        { className: 'relative w-full md:w-64' },
                        h('input', {
                            type: 'text',
                            placeholder: `Search ${currentLevelName}...`,
                            className: 'w-full pl-9 pr-3 py-2.5 bg-[#f5f5f7] rounded-[12px] text-sm outline-none',
                            value: search,
                            onChange: (e) => setSearch(e.target.value)
                        }),
                        h(Search, { className: 'w-4 h-4 text-[#86868b] absolute left-3 top-3' })
                    )
                )
            ),
            slicedList && h(
                'div',
                { className: 'overflow-x-auto custom-scrollbar border border-black/5 rounded-xl max-h-[380px] mb-6 bg-white' },
                h(
                    'table',
                    { className: 'w-full text-sm text-left border-collapse min-w-[600px]' },
                    h(
                        'thead',
                        { className: 'sticky top-0 bg-[#f5f5f7] z-20 text-[#86868b] text-xs uppercase' },
                        h(
                            'tr',
                            null,
                            h('th', { className: 'py-3 px-3 sm:px-4 w-14 text-center' }, 'Rank'),
                            h('th', { className: 'py-3 px-3 sm:px-4 sticky left-0 bg-[#f5f5f7] z-20 sticky-col-shadow sm:shadow-none' }, currentLevelName),
                            h('th', { className: 'py-3 px-4 w-24 text-center' }, 'Trend'),
                            h('th', { className: 'py-3 px-4 text-right' }, 'Sales 2026'),
                            h('th', { className: 'py-3 px-4 text-right' }, 'Active Locations')
                        )
                    ),
                    h(
                        'tbody',
                        null,
                        slicedList.length > 0
                            ? slicedList.map((item, idx) => {
                                const pct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                return h(
                                    'tr',
                                    { key: item.name, onClick: () => { setBreadcrumbs([...breadcrumbs, item.name]); setSearch(''); }, className: 'border-b border-[#e5e5ea]/50 hover:bg-[#0071e3]/5 cursor-pointer bg-white' },
                                    h('td', { className: 'py-3.5 sm:py-4 px-3 sm:px-4 text-center text-[#86868b]' }, `#${idx + 1}`),
                                    h('td', { className: 'py-3.5 sm:py-4 px-3 sm:px-4 font-semibold text-[#1d1d1f] sticky left-0 bg-inherit z-10 sticky-col-shadow sm:shadow-none max-w-[180px] sm:max-w-[260px] truncate', title: item.name }, item.name),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-center' }, h('div', { className: 'flex justify-center' }, h(Sparkline, { data: item.monthlySales }))),
                                    h('td', { className: 'py-3.5 sm:py-4 px-4 text-right text-[#1d1d1f]' }, `฿${(item.sales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`),
                                    h(
                                        'td',
                                        { className: 'py-3.5 sm:py-4 px-4 pr-6 sm:pr-10 text-right font-bold' },
                                        h('div', { className: 'flex items-center justify-end gap-3' }, item.count, h('div', { className: 'w-24 h-1.5 bg-[#e5e5ea] rounded-full overflow-hidden' }, h('div', { className: 'h-full bg-[#0071e3]', style: { width: `${pct}%` } })))
                                    )
                                );
                            })
                            : h('tr', null, h('td', { colSpan: 5, className: 'py-12 text-center text-[#86868b]' }, 'No records found'))
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
            ),
            detail && detail.channels && Object.keys(detail.channels).length > 0 && h(
                'div',
                { className: 'mt-6 pt-6 border-t border-black/5 animate-in fade-in duration-500' },
                h('h4', { className: 'text-sm font-bold text-[#1d1d1f] mb-4 flex items-center gap-2' }, h(Store, { className: 'w-4 h-4 text-[#0071e3]' }), ' Locations Breakdown'),
                h(
                    'div',
                    { className: 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4' },
                    Object.entries(detail.channels).map(([chName, chData]) => h(
                        'div',
                        { key: chName, className: 'bg-[#f5f5f7] rounded-xl overflow-hidden flex flex-col h-[200px] border border-black/5' },
                        h(
                            'div',
                            { className: 'bg-white/60 px-3 py-2 border-b border-black/5 flex justify-between items-center sticky top-0 backdrop-blur-md' },
                            h('span', { className: 'text-[11px] font-bold text-[#1d1d1f] uppercase tracking-wider' }, chName),
                            h('span', { className: 'text-[10px] font-bold text-[#0071e3] bg-[#0071e3]/10 px-2 py-0.5 rounded-full' }, chData.count)
                        ),
                        h(
                            'div',
                            { className: 'p-3 overflow-y-auto custom-scrollbar flex-1' },
                            h(
                                'ul',
                                { className: 'space-y-1.5' },
                                (chData.locations || []).map((loc) => h(
                                    'li',
                                    { key: loc, className: 'text-xs text-[#1d1d1f] flex items-start gap-1.5' },
                                    h('div', { className: 'w-1 h-1 rounded-full bg-[#86868b] mt-1.5 flex-shrink-0' }),
                                    h('span', { className: 'truncate', title: loc }, loc)
                                ))
                            )
                        )
                    ))
                )
            )
        );
    });

    const WhiteSpaceWidget = memo(function WhiteSpaceWidget({ filteredData, debouncedSearch, searchStr, setSearchStr }) {
        const [selectedGap, setSelectedGap] = useState(null);
        const [isCopied, setIsCopied] = useState(false);
        const [subGroupFilter, setSubGroupFilter] = useState('All');
        const [visibleLimit, setVisibleLimit] = useState(50);
        const copyTimerRef = useRef(null);

        useEffect(() => { setVisibleLimit(50); }, [filteredData, debouncedSearch, subGroupFilter]);
        useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

        const subGroups = useMemo(() => {
            const groups = new Set();
            const arr = filteredData || [];
            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (d && d.Year === '2026' && d.SubProductGroup) groups.add(d.SubProductGroup);
            }
            return Array.from(groups).sort();
        }, [filteredData]);

        const handleCopy = useCallback(async () => {
            if (!selectedGap?.missed) return;
            const textToCopy = `Target List for ${selectedGap.sku} in ${selectedGap.subCh}:\n\n${selectedGap.missed.join('\n')}`;
            const ok = await copyTextToClipboard(textToCopy);
            if (ok) {
                setIsCopied(true);
                if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
            }
        }, [selectedGap]);

        const grid = useMemo(() => {
            const subChannelSales = {}, skuSales = {}, subChannelCustomers = {}, matrix = {};
            const arr = filteredData || [];

            for (let i = 0; i < arr.length; i++) {
                const d = arr[i];
                if (!d || d.Year !== '2026') continue;
                if (subGroupFilter !== 'All' && d.SubProductGroup !== subGroupFilter) continue;

                const subCh = d.SubChannel || 'Unknown';
                const sku = d.GroupSKU || 'Unknown';
                const customer = d.SoldToParty || 'Unknown';
                const val = Number(d.NetPrice) || 0;

                if (!subChannelSales[subCh]) { subChannelSales[subCh] = 0; subChannelCustomers[subCh] = new Set(); }
                subChannelSales[subCh] += val;
                if (customer && customer !== 'Unknown') subChannelCustomers[subCh].add(customer);

                if (!skuSales[sku]) { skuSales[sku] = 0; matrix[sku] = {}; }
                skuSales[sku] += val;
                if (!matrix[sku][subCh]) matrix[sku][subCh] = new Set();
                if (customer && customer !== 'Unknown') matrix[sku][subCh].add(customer);
            }

            const columns = Object.keys(subChannelSales)
                .filter((c) => c !== 'Unknown')
                .sort((a, b) => subChannelSales[b] - subChannelSales[a])
                .slice(0, 12);
            let rows = Object.keys(skuSales)
                .filter((s) => s !== 'Unknown')
                .sort((a, b) => skuSales[b] - skuSales[a]);
            if ((debouncedSearch || '').length >= 2) {
                const q = debouncedSearch.toLowerCase();
                rows = rows.filter((sku) => sku.toLowerCase().includes(q));
            }

            return { columns, rows, subChannelCustomers, matrix };
        }, [filteredData, debouncedSearch, subGroupFilter]);

        const slicedRows = useMemo(() => (grid.rows || []).slice(0, visibleLimit), [grid.rows, visibleLimit]);

        return h(
            'div',
            { className: 'bg-white p-5 sm:p-6 rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-black/[0.04] relative' },
            h(
                'div',
                { className: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-5 sm:mb-6 gap-4' },
                h(
                    'div',
                    { className: 'flex items-center gap-3' },
                    h('div', { className: 'bg-[#ff2d55]/10 p-2 rounded-xl shrink-0' }, h(Crosshair, { className: 'w-6 h-6 text-[#ff2d55]' })),
                    h(
                        'div',
                        null,
                        h('h3', { className: 'text-base font-bold text-[#1d1d1f]' }, 'White Space & Distribution Gap'),
                        h('p', { className: 'text-xs text-[#86868b] font-medium mt-0.5' }, 'Tap on a gap to view missed target list.')
                    )
                ),
                h(
                    'div',
                    { className: 'flex flex-col sm:flex-row gap-3 w-full md:w-auto' },
                    h(FilterDropdown, { label: 'Sub-Product', value: subGroupFilter, options: ['All', ...subGroups], onChange: setSubGroupFilter, icon: h(Layers) }),
                    h(
                        'div',
                        { className: 'relative w-full sm:w-64' },
                        h('input', {
                            type: 'text',
                            placeholder: 'Search SKU...',
                            className: 'w-full pl-9 pr-3 py-2.5 sm:py-2 bg-[#f5f5f7] border border-transparent focus:border-[#0071e3]/30 focus:bg-white focus:ring-4 focus:ring-[#0071e3]/10 rounded-[12px] text-sm font-medium transition-all outline-none',
                            value: searchStr,
                            onChange: (e) => setSearchStr(e.target.value)
                        }),
                        h(Search, { className: 'w-4 h-4 text-[#86868b] absolute left-3 top-3 sm:top-2.5' })
                    )
                )
            ),
            h(
                'div',
                { className: 'overflow-x-auto custom-scrollbar max-h-[600px] rounded-xl border border-black/5 bg-white' },
                h(
                    'table',
                    { className: 'w-full text-sm text-left border-collapse min-w-[800px]' },
                    h(
                        'thead',
                        { className: 'sticky top-0 bg-[#f5f5f7] z-20 text-[#86868b] text-xs uppercase' },
                        h(
                            'tr',
                            null,
                            h('th', { className: 'py-4 px-3 sm:px-4 sticky left-0 bg-[#f5f5f7] z-30 sticky-col-shadow' }, 'Hero SKU'),
                            (grid.columns || []).map((col) => h('th', { key: col, className: 'py-4 px-3 text-center min-w-[120px]' }, h('div', { className: 'text-[#1d1d1f] font-bold' }, col)))
                        )
                    ),
                    h(
                        'tbody',
                        null,
                        slicedRows.map((sku, idx) => h(
                            'tr',
                            { key: sku, className: `border-b border-[#e5e5ea]/50 ${idx % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f7]/30'}` },
                            h('td', { className: 'py-3.5 sm:py-4 px-3 sm:px-4 font-semibold text-[#1d1d1f] sticky left-0 z-10 bg-inherit max-w-[180px] sm:max-w-[250px] truncate sticky-col-shadow', title: sku }, sku),
                            (grid.columns || []).map((col) => {
                                const total = grid.subChannelCustomers[col]?.size || 0;
                                const bought = grid.matrix[sku]?.[col]?.size || 0;
                                if (total === 0) return h('td', { key: col, className: 'p-2 text-center text-[#d1d1d6]' }, '-');
                                const pct = (bought / total) * 100;
                                return h(
                                    'td',
                                    { key: col, className: 'p-2 text-center border-l border-[#e5e5ea]/30' },
                                    h(
                                        'div',
                                        {
                                            className: `flex flex-col gap-1.5 p-2 rounded-xl transition-colors ${pct < 100 ? 'cursor-pointer hover:bg-[#ff3b30]/10' : ''}`,
                                            onClick: () => {
                                                if (pct < 100) {
                                                    const allCust = Array.from(grid.subChannelCustomers[col] || []);
                                                    const boughtCust = grid.matrix[sku]?.[col] || new Set();
                                                    const missed = allCust.filter((c) => !boughtCust.has(c)).sort();
                                                    setSelectedGap({ sku, subCh: col, missed });
                                                }
                                            }
                                        },
                                        h('div', { className: 'flex justify-between items-center text-xs' }, h('span', { className: `font-bold px-1.5 py-0.5 rounded-md ${pct === 100 ? 'text-[#34c759]' : 'text-[#ff3b30]'}` }, pct === 100 ? 'Full' : `${total - bought} Gap`)),
                                        h('div', { className: 'w-full h-1.5 bg-[#e5e5ea] rounded-full' }, h('div', { className: `h-full rounded-full ${pct === 100 ? 'bg-[#34c759]' : 'bg-[#ff3b30]'}`, style: { width: `${pct}%` } }))
                                    )
                                );
                            })
                        ))
                    )
                ),
                grid.rows.length > visibleLimit && h(
                    'div',
                    { className: 'p-3 bg-[#f5f5f7]/60 text-center border-t border-black/5' },
                    h(
                        'button',
                        { type: 'button', onClick: () => setVisibleLimit((prev) => prev + 50), className: 'px-4 py-2 bg-white text-[#0071e3] text-xs font-bold rounded-xl border border-black/5 shadow-sm hover:bg-[#f5f5f7]' },
                        `Show More (${grid.rows.length - visibleLimit} remaining)`
                    )
                )
            ),
            selectedGap && h(
                'div',
                {
                    className: 'fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200',
                    onClick: (e) => { if (e.target === e.currentTarget) setSelectedGap(null); }
                },
                h(
                    'div',
                    { className: 'bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 flex flex-col max-h-[85vh]' },
                    h(
                        'div',
                        { className: 'p-5 border-b border-black/5 flex justify-between items-start bg-[#f5f5f7]/50' },
                        h(
                            'div',
                            null,
                            h('h3', { className: 'text-[10px] font-bold text-[#ff2d55] uppercase tracking-wider mb-1' }, 'Actionable Insight'),
                            h('h2', { className: 'text-lg font-bold text-[#1d1d1f] leading-tight' }, 'Target List for Sales Team'),
                            h('p', { className: 'text-xs text-[#86868b] mt-1 font-medium' }, selectedGap.sku, h('span', { className: 'mx-1' }, '•'), selectedGap.subCh)
                        ),
                        h(
                            'button',
                            { type: 'button', onClick: () => setSelectedGap(null), className: 'text-[#86868b] hover:text-[#1d1d1f] bg-[#e8e8ed] hover:bg-[#d1d1d6] p-2 rounded-full transition-colors' },
                            h(X, { className: 'w-4 h-4' })
                        )
                    ),
                    h(
                        'div',
                        { className: 'p-5 overflow-y-auto custom-scrollbar flex-1 bg-white flex flex-col gap-5' },
                        h(
                            'div',
                            null,
                            h('div', { className: 'text-xs font-bold text-[#1d1d1f] mb-3 flex items-center gap-2' }, h(Users, { className: 'w-4 h-4 text-[#86868b]' }), ` ${selectedGap.missed.length} Missed Customers`),
                            h(
                                'ul',
                                { className: 'space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2' },
                                selectedGap.missed.map((cust) => h(
                                    'li',
                                    { key: cust, className: 'text-sm text-[#1d1d1f] flex items-center gap-2 p-2.5 bg-[#f5f5f7] hover:bg-[#e8e8ed] transition-colors rounded-lg border border-black/5' },
                                    h('div', { className: 'w-1.5 h-1.5 rounded-full bg-[#ff2d55] flex-shrink-0' }),
                                    h('span', { className: 'truncate font-medium' }, cust)
                                ))
                            )
                        )
                    ),
                    h(
                        'div',
                        { className: 'p-4 bg-white border-t border-black/5 flex gap-3' },
                        h(
                            'button',
                            {
                                type: 'button',
                                onClick: handleCopy,
                                className: `flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${isCopied ? 'bg-[#34c759] text-white shadow-[0_0_10px_rgba(52,199,89,0.3)]' : 'bg-[#1d1d1f] hover:bg-black text-white shadow-md hover:shadow-lg'}`
                            },
                            isCopied ? h(React.Fragment, null, h(Check, { className: 'w-4 h-4' }), ' Copied!') : h(React.Fragment, null, h(Copy, { className: 'w-4 h-4' }), ' Copy Target List')
                        )
                    )
                )
            )
        );
    });

    NPD.components = NPD.components || {};
    Object.assign(NPD.components, {
        TopCustomersWidget,
        ProductPresenceWidget,
        WhiteSpaceWidget
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
