(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};
    const { GROUP_ORDER, MONTHS_LIST } = NPD.config;
    const {
        normalizeText,
        isChainBasedChannel,
        resolveAccountName,
        getParetoTopItems
    } = NPD.utils;

    const calculateDynamicForecast = (ytd26, ytd25, fy25, target26, monthsCount26) => {
        const validYtd26 = Number(ytd26) || 0;
        const validYtd25 = Number(ytd25) || 0;
        const validFy25 = Number(fy25) || 0;
        const validTarget26 = Number(target26) || 0;
        const validMonths = Math.max(1, Number(monthsCount26) || 1);

        let forecast26 = 0;
        if (validYtd25 > 0 && validFy25 > 0) {
            forecast26 = validYtd26 * (validFy25 / validYtd25);
        } else {
            forecast26 = (validYtd26 / validMonths) * 12;
        }

        const percent = validTarget26 > 0 ? (forecast26 / validTarget26) * 100 : 0;
        const isMissing = percent < 100;

        return { forecast26, forecastStatus: { percent, isMissing } };
    };

    const extractFilterOptions = (salesData, selectedGroups, filterChannel = 'All') => {
        if (!salesData || salesData.length === 0) {
            return { availableSubProducts: [], availableChannels: [], availableSubChannels: [] };
        }
        const isAll = selectedGroups.includes('ALL');
        const groupSet = isAll ? null : new Set(selectedGroups);
        const subProdMap = new Map();
        const channelSalesMap = {};
        const subChannelSalesMap = {};

        for (let i = 0; i < salesData.length; i++) {
            const d = salesData[i];
            if (!d) continue;
            if (!isAll && !groupSet.has(d.ProductGroup)) continue;

            if (d.SubProductGroup && d.SubProductGroup !== 'Unknown' && !subProdMap.has(d.SubProductGroup)) {
                subProdMap.set(d.SubProductGroup, d.ProductGroup);
            }

            const val = Number(d.NetPrice) || 0;
            if (d.Channel && d.Channel !== 'Unknown' && d.Year === '2026') {
                channelSalesMap[d.Channel] = (channelSalesMap[d.Channel] || 0) + val;
            }

            if (
                d.SubChannel &&
                d.SubChannel !== 'Unknown' &&
                (filterChannel === 'All' || d.Channel === filterChannel)
            ) {
                if (subChannelSalesMap[d.SubChannel] === undefined) {
                    subChannelSalesMap[d.SubChannel] = 0;
                }
                if (d.Year === '2026') {
                    subChannelSalesMap[d.SubChannel] += val;
                }
            }
        }

        const subList = Array.from(subProdMap.entries()).map(([name, group]) => ({ val: name, group }));
        subList.sort((a, b) => {
            const gA = GROUP_ORDER.indexOf(a.group);
            const gB = GROUP_ORDER.indexOf(b.group);
            if (gA !== gB) return gA - gB;
            return a.val.localeCompare(b.val);
        });

        const chList = Object.entries(channelSalesMap)
            .sort((a, b) => b[1] - a[1])
            .map((item) => item[0]);

        const subChList = Object.entries(subChannelSalesMap)
            .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
            .map((item) => item[0]);

        return { availableSubProducts: subList, availableChannels: chList, availableSubChannels: subChList };
    };

    // Unified Core Engine:
    // - Supports Group, Sub-Product, Channel, Sub-Channel, Multi-Month, and Exclude Returns filters
    // - Preserves filteredDataWithReturns so Return Diagnostics remains accurate even when Gross Sales mode is toggled
    const computeCoreEngine = (salesData, {
        selectedGroups,
        filterSubProduct,
        filterChannel,
        filterSubChannel = 'All',
        filterMonth,
        excludeReturns = false
    }) => {
        const emptyResult = {
            filteredData: [],
            filteredDataWithReturns: [],
            valid2026Months: new Set(),
            unfiltered2026Months: new Set(),
            monthly25Unfiltered: new Array(12).fill(0),
            monthly26Unfiltered: new Array(12).fill(0),
            s26: 0,
            s25_YTD: 0,
            s26_FullYTD: 0,
            s25_FullYTD: 0,
            fy25: 0,
            excludedReturns26: 0,
            channelMix: []
        };

        if (!salesData || salesData.length === 0) return emptyResult;

        const isAllGroups = selectedGroups.includes('ALL');
        const groupSet = isAllGroups ? null : new Set(selectedGroups);
        const isAllMonthsSelected = filterMonth.length === MONTHS_LIST.length;
        const monthSet = isAllMonthsSelected ? null : new Set(filterMonth);

        const scopeRows = [];
        const unfiltered2026Months = new Set();
        const valid2026Months = new Set();
        const monthly25Unfiltered = new Array(12).fill(0);
        const monthly26Unfiltered = new Array(12).fill(0);
        let fy25 = 0;

        for (let i = 0; i < salesData.length; i++) {
            const d = salesData[i];
            if (!d) continue;

            if (!isAllGroups && !groupSet.has(d.ProductGroup)) continue;
            if (filterSubProduct !== 'All' && d.SubProductGroup !== filterSubProduct) continue;
            if (filterChannel !== 'All' && d.Channel !== filterChannel) continue;
            if (filterSubChannel !== 'All' && d.SubChannel !== filterSubChannel) continue;

            scopeRows.push(d);

            const val = Number(d.NetPrice) || 0;
            if (excludeReturns && val < 0) continue;

            const mIdx = d.MonthIndex;
            if (d.Year === '2026') {
                if (mIdx >= 1 && mIdx <= 12) {
                    monthly26Unfiltered[mIdx - 1] += val;
                    unfiltered2026Months.add(mIdx);
                    if (isAllMonthsSelected || monthSet.has(d.MonthShort)) {
                        valid2026Months.add(mIdx);
                    }
                }
            } else if (d.Year === '2025') {
                fy25 += val;
                if (mIdx >= 1 && mIdx <= 12) {
                    monthly25Unfiltered[mIdx - 1] += val;
                }
            }
        }

        if (unfiltered2026Months.size === 0) {
            for (let i = 0; i < salesData.length; i++) {
                const d = salesData[i];
                if (d && d.Year === '2026' && d.MonthIndex >= 1 && d.MonthIndex <= 12) {
                    unfiltered2026Months.add(d.MonthIndex);
                    if (isAllMonthsSelected || monthSet.has(d.MonthShort)) {
                        valid2026Months.add(d.MonthIndex);
                    }
                }
            }
        }

        const filtered = [];
        const filteredWithReturns = [];
        let s26 = 0;
        let s25_YTD = 0;
        let s26_FullYTD = 0;
        let s25_FullYTD = 0;
        let excludedReturns26 = 0;
        const chMap = {};

        for (let i = 0; i < scopeRows.length; i++) {
            const d = scopeRows[i];
            const val = Number(d.NetPrice) || 0;
            const mIdx = d.MonthIndex;
            const isReturnRow = val < 0;

            if (!(excludeReturns && isReturnRow)) {
                if (d.Year === '2026') {
                    s26_FullYTD += val;
                } else if (d.Year === '2025' && unfiltered2026Months.has(mIdx)) {
                    s25_FullYTD += val;
                }
            }

            if (!isAllMonthsSelected && !monthSet.has(d.MonthShort)) continue;

            filteredWithReturns.push(d);

            if (excludeReturns && isReturnRow) {
                if (d.Year === '2026') excludedReturns26 += Math.abs(val);
                continue;
            }

            filtered.push(d);

            if (d.Year === '2026') {
                s26 += val;
                const ch = d.Channel || 'Unknown';
                chMap[ch] = (chMap[ch] || 0) + val;
            } else if (d.Year === '2025' && valid2026Months.has(mIdx)) {
                s25_YTD += val;
            }
        }

        const channelMix = Object.keys(chMap)
            .map((k) => ({ name: k, value: chMap[k] }))
            .sort((a, b) => b.value - a.value);

        return {
            filteredData: filtered,
            filteredDataWithReturns: filteredWithReturns,
            valid2026Months,
            unfiltered2026Months,
            monthly25Unfiltered,
            monthly26Unfiltered,
            s26,
            s25_YTD,
            s26_FullYTD,
            s25_FullYTD,
            fy25,
            excludedReturns26,
            channelMix
        };
    };

    const computeKPIs = (coreEngine, budgetChannel, budgetProduct, {
        selectedGroups,
        filterSubProduct,
        filterChannel,
        filterSubChannel = 'All',
        filterMonth
    }) => {
        const {
            s26,
            s25_YTD,
            s26_FullYTD,
            s25_FullYTD,
            fy25,
            valid2026Months,
            unfiltered2026Months
        } = coreEngine;

        const monthsCount26 = valid2026Months.size || 1;
        const fullMonthsCount26 = unfiltered2026Months.size || 1;
        const isPartialMonthFilter = filterMonth.length > 0 && filterMonth.length < MONTHS_LIST.length;

        const growthYoY = s25_YTD > 0 ? ((s26 - s25_YTD) / s25_YTD) * 100 : 0;

        const isSubFiltered = filterSubProduct !== 'All';
        const isChannelFiltered = filterChannel !== 'All';
        const isSubChannelFiltered = filterSubChannel !== 'All';
        const isAllGroups = selectedGroups.includes('ALL');
        const groupSet = isAllGroups ? null : new Set(selectedGroups);

        let relevantBudgets = [];
        // Budgets are defined at Group+Channel or Group+SubProduct level (not Sub-Channel or cross-dimension)
        if (!isSubChannelFiltered && !(isSubFiltered && isChannelFiltered)) {
            if (isSubFiltered) {
                relevantBudgets = (budgetProduct || []).filter(
                    (b) => b && (isAllGroups || groupSet.has(b.ProductGroup)) && b.SubProductGroup === filterSubProduct
                );
            } else if (isChannelFiltered) {
                relevantBudgets = (budgetChannel || []).filter(
                    (b) => b && (isAllGroups || groupSet.has(b.ProductGroup)) && b.Channel === filterChannel
                );
            } else {
                relevantBudgets = (budgetChannel || []).filter(
                    (b) => b && (isAllGroups || groupSet.has(b.ProductGroup))
                );
            }
        }

        const target26 = relevantBudgets.length
            ? relevantBudgets.reduce((a, b) => a + (Number(b.Target2026) || 0), 0)
            : null;
        const plan27 = relevantBudgets.length
            ? relevantBudgets.reduce((a, b) => a + (Number(b.Plan2027) || 0), 0)
            : null;

        const { forecast26, forecastStatus } = calculateDynamicForecast(
            s26_FullYTD,
            s25_FullYTD,
            fy25,
            target26,
            fullMonthsCount26
        );

        const progress = target26 && target26 > 0 ? (s26 / target26) * 100 : 0;
        const growthPlan = target26 && plan27 && target26 > 0 ? ((plan27 - target26) / target26) * 100 : 0;

        // YTD Target Pacing Benchmark (Seasonality-weighted if 2025 history exists, else Linear M/12)
        let ytdTargetBenchmark = null;
        let ytdPaceDiff = null;
        let ytdPacePct = null;
        let expectedSharePct = null;
        let paceBasis = 'seasonal';

        if (target26 && target26 > 0 && filterMonth.length > 0) {
            let expectedShare = 0;
            if (fy25 > 0 && s25_YTD > 0) {
                expectedShare = Math.min(1, Math.max(0.01, s25_YTD / fy25));
                paceBasis = 'seasonal';
            } else {
                expectedShare = Math.min(1, Math.max(1 / 12, monthsCount26 / 12));
                paceBasis = 'linear';
            }
            ytdTargetBenchmark = target26 * expectedShare;
            ytdPaceDiff = s26 - ytdTargetBenchmark;
            ytdPacePct = ytdTargetBenchmark > 0 ? (ytdPaceDiff / ytdTargetBenchmark) * 100 : 0;
            expectedSharePct = expectedShare * 100;
        }

        return {
            s26,
            s25_YTD,
            s26_FullYTD,
            s25_FullYTD,
            growthYoY,
            target26,
            forecast26,
            forecastStatus,
            plan27,
            progress,
            growthPlan,
            monthsCount26,
            fullMonthsCount26,
            isPartialMonthFilter,
            ytdTargetBenchmark,
            ytdPaceDiff,
            ytdPacePct,
            expectedSharePct,
            paceBasis
        };
    };

    const computeTrendChartData = (filteredData, coreEngine) => {
        if (!filteredData || filteredData.length === 0) return [];

        const monthly25Sales = new Array(12).fill(0);
        const monthly26Sales = new Array(12).fill(0);
        const rows25ByMonth = Array.from({ length: 12 }, () => []);
        const rows26ByMonth = Array.from({ length: 12 }, () => []);

        for (let i = 0; i < filteredData.length; i++) {
            const d = filteredData[i];
            if (!d) continue;
            const mIdx = d.MonthIndex >= 1 && d.MonthIndex <= 12 ? d.MonthIndex - 1 : -1;
            if (mIdx < 0) continue;

            const val = Number(d.NetPrice) || 0;
            if (d.Year === '2026') {
                monthly26Sales[mIdx] += val;
                rows26ByMonth[mIdx].push(d);
            } else if (d.Year === '2025') {
                monthly25Sales[mIdx] += val;
                rows25ByMonth[mIdx].push(d);
            }
        }

        let latestVisibleIdx = -1;
        for (let idx = 0; idx < 12; idx++) {
            if (monthly26Sales[idx] > 0) latestVisibleIdx = idx;
        }

        const full25 = coreEngine.monthly25Unfiltered || monthly25Sales;
        const full26 = coreEngine.monthly26Unfiltered || monthly26Sales;
        let latestFullIdx = -1;
        for (let idx = 0; idx < 12; idx++) {
            if (full26[idx] > 0) latestFullIdx = idx;
        }

        let latestMonthInsights = null;
        if (latestVisibleIdx >= 0) {
            const latestData26 = rows26ByMonth[latestVisibleIdx];
            const latestData25 = rows25ByMonth[latestVisibleIdx];

            const prodMap26 = {}, prodMap25 = {}, chMap26 = {}, chMap25 = {}, subChParentMap = {};

            const resolveSubChannelKey = (row) => {
                const rawSub = row.SubChannel && row.SubChannel !== 'Unknown' ? row.SubChannel : (row.Channel || 'Unknown');
                return normalizeText(rawSub, 'channel');
            };

            for (let i = 0; i < latestData26.length; i++) {
                const d = latestData26[i];
                const p = d.ProductName || 'Unknown';
                const subChKey = resolveSubChannelKey(d);
                const val = Number(d.NetPrice) || 0;
                prodMap26[p] = (prodMap26[p] || 0) + val;
                chMap26[subChKey] = (chMap26[subChKey] || 0) + val;
                if (!subChParentMap[subChKey] && d.Channel && d.Channel !== 'Unknown') {
                    subChParentMap[subChKey] = d.Channel;
                }
            }

            for (let i = 0; i < latestData25.length; i++) {
                const d = latestData25[i];
                const p = d.ProductName || 'Unknown';
                const subChKey = resolveSubChannelKey(d);
                const val = Number(d.NetPrice) || 0;
                prodMap25[p] = (prodMap25[p] || 0) + val;
                chMap25[subChKey] = (chMap25[subChKey] || 0) + val;
                if (!subChParentMap[subChKey] && d.Channel && d.Channel !== 'Unknown') {
                    subChParentMap[subChKey] = d.Channel;
                }
            }

            const totalMonthSales = monthly26Sales[latestVisibleIdx];
            const formatTop = (map26, map25, total, parentMap = null) => {
                return Object.entries(map26)
                    .filter(([name, val26]) => name !== 'Unknown' && val26 > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([name, val26]) => {
                        const val25 = map25[name] || 0;
                        const pct = total > 0 ? (val26 / total) * 100 : 0;
                        const yoy = val25 > 0 ? ((val26 - val25) / val25) * 100 : null;
                        return {
                            name,
                            val26,
                            val25,
                            pct,
                            yoy,
                            parentChannel: parentMap ? (parentMap[name] || null) : null
                        };
                    });
            };

            latestMonthInsights = {
                month: MONTHS_LIST[latestVisibleIdx],
                topProducts: formatTop(prodMap26, prodMap25, totalMonthSales),
                topChannels: formatTop(chMap26, chMap25, totalMonthSales, subChParentMap),
                sales: totalMonthSales
            };
        }

        const fy25Total = full25.reduce((s, v) => s + v, 0);
        const validFullMonthsCount = latestFullIdx + 1;
        const ytd26Full = full26.slice(0, validFullMonthsCount).reduce((s, v) => s + v, 0);
        const ytd25Full = full25.slice(0, validFullMonthsCount).reduce((s, v) => s + v, 0);
        const isSeasonality = ytd25Full > 0 && fy25Total > 0;
        const activeFullMonthsCount = coreEngine.unfiltered2026Months.size || 1;
        const runRate = ytd26Full / activeFullMonthsCount;

        return MONTHS_LIST.map((m, idx) => {
            const sales25 = monthly25Sales[idx] === 0 ? null : monthly25Sales[idx];
            let sales26 = null;
            let proj26 = null;

            if (idx <= latestFullIdx) {
                sales26 = monthly26Sales[idx] === 0 ? null : monthly26Sales[idx];
                if (idx === latestFullIdx) {
                    proj26 = full26[idx] > 0 ? full26[idx] : null;
                }
            } else if (latestFullIdx >= 0) {
                if (isSeasonality && ytd25Full > 0) {
                    proj26 = (ytd26Full / ytd25Full) * (full25[idx] || 0);
                } else {
                    proj26 = runRate;
                }
            }

            return {
                name: m,
                sales25,
                sales26,
                proj26,
                isLatest: idx === latestVisibleIdx,
                insights: idx === latestVisibleIdx ? latestMonthInsights : null
            };
        });
    };

    // Stack-safe O(1) Customer Acquisition Engine
    const computeCustomerAcquisition = (filteredData, subGroupFilter = 'All', includeList = true) => {
        const customerMap = {};
        const arr = filteredData || [];

        for (let i = 0; i < arr.length; i++) {
            const d = arr[i];
            if (!d) continue;
            if (subGroupFilter !== 'All' && d.SubProductGroup !== subGroupFilter) continue;

            const customerName = resolveAccountName(d);
            if (!customerName || customerName === 'Unknown') continue;

            const ch = d.Channel || 'Unknown';
            const key = `${customerName}|${ch}`;
            let entry = customerMap[key];
            if (!entry) {
                entry = {
                    key,
                    name: customerName,
                    channel: ch,
                    sales26: 0,
                    has25: false,
                    max25: 0,
                    has26: false,
                    min26: 13,
                    products: includeList ? {} : null,
                    subGroups: includeList ? {} : null
                };
                customerMap[key] = entry;
            }

            const mIdx = d.MonthIndex;
            if (mIdx < 1 || mIdx > 12) continue;

            if (d.Year === '2025') {
                entry.has25 = true;
                if (mIdx > entry.max25) entry.max25 = mIdx;
            } else if (d.Year === '2026') {
                entry.has26 = true;
                if (mIdx < entry.min26) entry.min26 = mIdx;
                const val = Number(d.NetPrice) || 0;
                entry.sales26 += val;

                if (includeList) {
                    const pName = d.ProductName || 'Unknown';
                    const sgName = d.SubProductGroup || 'Unknown';
                    entry.products[pName] = (entry.products[pName] || 0) + val;
                    entry.subGroups[sgName] = (entry.subGroups[sgName] || 0) + val;
                }
            }
        }

        const acquiredList = [];
        let activeCustCount = 0;
        let newCount = 0;
        let newSales = 0;
        let reactCount = 0;
        let reactSales = 0;

        const entries = Object.values(customerMap);
        for (let i = 0; i < entries.length; i++) {
            const c = entries[i];
            if (c.sales26 <= 0 || !c.has26) continue;
            activeCustCount++;

            let type = null;
            if (!c.has25) {
                type = 'Pure New';
            } else if ((c.min26 + 12) - c.max25 >= 6) {
                type = 'Reactivated';
            }

            if (type) {
                if (type === 'Pure New') {
                    newCount++;
                    newSales += c.sales26;
                } else {
                    reactCount++;
                    reactSales += c.sales26;
                }

                if (includeList) {
                    const topProduct = Object.entries(c.products).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                    const topSubGroup = Object.entries(c.subGroups).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                    acquiredList.push({
                        key: c.key,
                        name: c.name,
                        channel: c.channel,
                        sales26: c.sales26,
                        type,
                        topProduct,
                        topSubGroup
                    });
                }
            }
        }

        if (includeList) {
            acquiredList.sort((a, b) => b.sales26 - a.sales26);
        }

        return {
            activeCustCount,
            summary: {
                newCount,
                newSales,
                reactCount,
                reactSales,
                acqSales26: newSales + reactSales
            },
            list: acquiredList
        };
    };

    // Churn & Drop-off Radar Engine (identifies Lost in 2026, Dormant >= 3M, and Sharp YoY Drop > 30%)
    const computeChurnRadar = (filteredData, valid2026Months, subGroupFilter = 'All') => {
        const customerMap = {};
        const arr = filteredData || [];

        let latestMonth26 = 0;
        if (valid2026Months && valid2026Months.size > 0) {
            valid2026Months.forEach((m) => { if (m > latestMonth26) latestMonth26 = m; });
        }

        for (let i = 0; i < arr.length; i++) {
            const d = arr[i];
            if (!d) continue;
            if (subGroupFilter !== 'All' && d.SubProductGroup !== subGroupFilter) continue;

            const customerName = resolveAccountName(d);
            if (!customerName || customerName === 'Unknown') continue;

            const ch = d.Channel || 'Unknown';
            const key = `${customerName}|${ch}`;
            let entry = customerMap[key];
            if (!entry) {
                entry = {
                    key,
                    name: customerName,
                    channel: ch,
                    sales25_FY: 0,
                    sales25_YTD: 0,
                    sales26: 0,
                    lastMonth25: 0,
                    lastMonth26: 0,
                    products: {},
                    subGroups: {}
                };
                customerMap[key] = entry;
            }

            const val = Number(d.NetPrice) || 0;
            const mIdx = d.MonthIndex;
            if (mIdx < 1 || mIdx > 12) continue;

            const pName = d.ProductName || 'Unknown';
            const sgName = d.SubProductGroup || 'Unknown';

            if (d.Year === '2025') {
                entry.sales25_FY += val;
                if (valid2026Months && valid2026Months.has(mIdx)) {
                    entry.sales25_YTD += val;
                }
                if (val > 0 && mIdx > entry.lastMonth25) entry.lastMonth25 = mIdx;
                if (val > 0) {
                    entry.products[pName] = (entry.products[pName] || 0) + val;
                    entry.subGroups[sgName] = (entry.subGroups[sgName] || 0) + val;
                }
            } else if (d.Year === '2026') {
                entry.sales26 += val;
                if (val > 0 && mIdx > entry.lastMonth26) {
                    entry.lastMonth26 = mIdx;
                    if (mIdx > latestMonth26) latestMonth26 = mIdx;
                }
                if (val > 0) {
                    entry.products[pName] = (entry.products[pName] || 0) + val;
                    entry.subGroups[sgName] = (entry.subGroups[sgName] || 0) + val;
                }
            }
        }

        const alertList = [];
        let lostCount = 0, lostVal25 = 0;
        let dormantCount = 0, dormantVal = 0;
        let dropCount = 0, dropVal = 0;

        const entries = Object.values(customerMap);
        for (let i = 0; i < entries.length; i++) {
            const c = entries[i];
            let status = null;
            let impactVal = 0;
            let yoy = c.sales25_YTD > 0 ? ((c.sales26 - c.sales25_YTD) / c.sales25_YTD) * 100 : null;
            let lastOrderLabel = '-';
            let inactiveMonths = 0;

            if (c.sales25_FY > 0 && c.sales26 <= 0) {
                status = 'Lost in 2026';
                impactVal = c.sales25_FY;
                lostCount++;
                lostVal25 += c.sales25_FY;
                lastOrderLabel = c.lastMonth25 > 0 ? `${MONTHS_LIST[c.lastMonth25 - 1]} 25` : '2025';
                inactiveMonths = latestMonth26 + (12 - (c.lastMonth25 || 12));
            } else if (c.sales26 > 0 && c.lastMonth26 > 0 && latestMonth26 - c.lastMonth26 >= 3) {
                status = 'Dormant';
                impactVal = c.sales25_YTD > c.sales26 ? (c.sales25_YTD - c.sales26) : c.sales26;
                dormantCount++;
                dormantVal += impactVal;
                inactiveMonths = latestMonth26 - c.lastMonth26;
                lastOrderLabel = `${MONTHS_LIST[c.lastMonth26 - 1]} 26 (${inactiveMonths}M ago)`;
            } else if (c.sales26 > 0 && c.sales25_YTD >= 5000 && yoy !== null && yoy <= -30) {
                status = 'Sharp Drop';
                impactVal = c.sales25_YTD - c.sales26;
                dropCount++;
                dropVal += impactVal;
                lastOrderLabel = c.lastMonth26 > 0 ? `${MONTHS_LIST[c.lastMonth26 - 1]} 26` : '2026';
            }

            if (status) {
                const topProduct = Object.entries(c.products).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                const topSubGroup = Object.entries(c.subGroups).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
                alertList.push({
                    key: c.key,
                    name: c.name,
                    channel: c.channel,
                    status,
                    sales25_FY: c.sales25_FY,
                    sales25_YTD: c.sales25_YTD,
                    sales26: c.sales26,
                    impactVal,
                    yoy,
                    lastOrderLabel,
                    inactiveMonths,
                    topProduct,
                    topSubGroup
                });
            }
        }

        alertList.sort((a, b) => b.impactVal - a.impactVal);

        return {
            summary: {
                lostCount,
                lostVal25,
                dormantCount,
                dormantVal,
                dropCount,
                dropVal,
                totalAlerts: lostCount + dormantCount + dropCount,
                latestMonthLabel: latestMonth26 > 0 ? MONTHS_LIST[latestMonth26 - 1] : '-'
            },
            list: alertList
        };
    };

    // Authentic Cost & Margin Profitability Engine
    const computeProfitability = (filteredData, breadcrumbs = []) => {
        let groupBy = 'ProductGroup';
        if (breadcrumbs.length === 1) groupBy = 'SubProductGroup';
        else if (breadcrumbs.length === 2) groupBy = 'GroupSKU';
        else if (breadcrumbs.length >= 3) groupBy = 'ProductName';

        const map = {};
        let overallTotalSales = 0;
        let overallPositiveSales = 0;
        let overallValidSales = 0;
        let overallValidCost = 0;

        const arrData = filteredData || [];
        for (let i = 0; i < arrData.length; i++) {
            const d = arrData[i];
            if (!d || d.Year !== '2026') continue;
            if (breadcrumbs.length > 0 && d.ProductGroup !== breadcrumbs[0]) continue;
            if (breadcrumbs.length > 1 && d.SubProductGroup !== breadcrumbs[1]) continue;
            if (breadcrumbs.length > 2 && d.GroupSKU !== breadcrumbs[2]) continue;

            const key = d[groupBy] || 'Unknown';
            let item = map[key];
            if (!item) {
                item = {
                    name: key,
                    totalSales: 0,
                    positiveSales: 0,
                    validSales: 0,
                    validCost: 0,
                    monthlySales: new Array(12).fill(0)
                };
                map[key] = item;
            }

            const sales = Number(d.NetPrice) || 0;
            const mIdx = d.MonthIndex >= 1 && d.MonthIndex <= 12 ? d.MonthIndex - 1 : -1;
            if (mIdx >= 0) item.monthlySales[mIdx] += sales;

            item.totalSales += sales;
            overallTotalSales += sales;

            if (sales > 0) {
                item.positiveSales += sales;
                overallPositiveSales += sales;
                if (d.HasCost && d.Cost > 0) {
                    item.validSales += sales;
                    item.validCost += d.Cost;
                    overallValidSales += sales;
                    overallValidCost += d.Cost;
                }
            }
        }

        const list = Object.values(map).map((item) => {
            const hasCostData = item.validSales > 0;
            const margin = hasCostData
                ? ((item.validSales - item.validCost) / item.validSales) * 100
                : null;
            const gp = margin !== null ? item.totalSales * (margin / 100) : null;
            const costCoverage = item.positiveSales > 0 ? (item.validSales / item.positiveSales) * 100 : 0;
            return {
                name: item.name,
                monthlySales: item.monthlySales,
                sales: item.totalSales,
                gp,
                margin,
                hasCostData,
                costCoverage
            };
        });

        const hasOverallCost = overallValidSales > 0;
        const totalMargin = hasOverallCost
            ? ((overallValidSales - overallValidCost) / overallValidSales) * 100
            : null;
        const totalGP = totalMargin !== null ? overallTotalSales * (totalMargin / 100) : null;
        const overallCostCoverage = overallPositiveSales > 0
            ? (overallValidSales / overallPositiveSales) * 100
            : 0;

        return {
            list,
            summary: {
                sales: overallTotalSales,
                gp: totalGP,
                margin: totalMargin,
                hasCostData: hasOverallCost,
                costCoverage: overallCostCoverage
            }
        };
    };

    // Unified 2026 Return Diagnostics
    const computeReturnDiagnostics = (filteredData) => {
        let grossSales26 = 0;
        let totalReturns26 = 0;
        const skuMap = {};
        const arr = filteredData || [];

        for (let i = 0; i < arr.length; i++) {
            const d = arr[i];
            if (!d || d.Year !== '2026') continue;

            const val = Number(d.NetPrice) || 0;
            const sku = d.GroupSKU || 'Unknown';
            const name = d.ProductName || 'Unknown';
            const uniqueKey = `${sku}::${name}`;
            const rawChannel = d.Channel || 'Unknown';
            const channelKey = isChainBasedChannel(rawChannel)
                ? `${rawChannel} (${d.SubChannel || 'Unknown'})`
                : rawChannel;

            let entry = skuMap[uniqueKey];
            if (!entry) {
                entry = { sku, name, gross26: 0, returns26: 0, channels: {} };
                skuMap[uniqueKey] = entry;
            }

            if (val > 0) {
                grossSales26 += val;
                entry.gross26 += val;
            } else if (val < 0) {
                const absVal = Math.abs(val);
                totalReturns26 += absVal;
                entry.returns26 += absVal;
                entry.channels[channelKey] = (entry.channels[channelKey] || 0) + absVal;
            }
        }

        const overallRate = grossSales26 > 0 ? (totalReturns26 / grossSales26) * 100 : 0;
        const topReturns = Object.values(skuMap)
            .filter((data) => data.returns26 > 0)
            .map((data) => {
                const rate = data.gross26 > 0 ? (data.returns26 / data.gross26) * 100 : 100;
                const topChannel = Object.entries(data.channels).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
                return {
                    key: `${data.sku}::${data.name}`,
                    sku: data.sku,
                    name: data.name,
                    gross26: data.gross26,
                    returns: data.returns26,
                    rate,
                    topChannel,
                    channels: data.channels
                };
            })
            .sort((a, b) => b.returns - a.returns);

        return { totalReturns: totalReturns26, grossSales26, overallRate, topReturns };
    };

    const computeExecutiveDeepMetrics = (filteredData, channelMix, valid2026Months) => {
        if (!filteredData) return null;

        let totalSales26 = 0;
        let grossPositiveSales26 = 0;
        let validCostSales26 = 0;
        let validCostTotal26 = 0;
        let totalReturns26 = 0;

        const skuSales = {};
        const subGroupMap = {};

        const arr = filteredData || [];
        for (let i = 0; i < arr.length; i++) {
            const d = arr[i];
            if (!d) continue;
            const val = Number(d.NetPrice) || 0;
            const subGrp = d.SubProductGroup || 'Unknown';
            const sku = d.GroupSKU || 'Unknown';

            if (!subGroupMap[subGrp]) subGroupMap[subGrp] = { s26: 0, s25: 0 };

            if (d.Year === '2026') {
                totalSales26 += val;
                subGroupMap[subGrp].s26 += val;
                skuSales[sku] = (skuSales[sku] || 0) + val;

                if (val > 0) {
                    grossPositiveSales26 += val;
                    if (d.HasCost && d.Cost > 0) {
                        validCostSales26 += val;
                        validCostTotal26 += d.Cost;
                    }
                } else if (val < 0) {
                    totalReturns26 += Math.abs(val);
                }
            } else if (d.Year === '2025' && valid2026Months.has(d.MonthIndex)) {
                subGroupMap[subGrp].s25 += val;
            }
        }

        const hasCostData = validCostSales26 > 0;
        const weightedMargin = hasCostData
            ? ((validCostSales26 - validCostTotal26) / validCostSales26) * 100
            : null;
        const totalGP26 = weightedMargin !== null ? totalSales26 * (weightedMargin / 100) : null;
        const costCoverage = grossPositiveSales26 > 0 ? (validCostSales26 / grossPositiveSales26) * 100 : 0;
        const returnRate = grossPositiveSales26 > 0 ? (totalReturns26 / grossPositiveSales26) * 100 : 0;

        const sortedSkus = Object.entries(skuSales)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1]);
        const top5SkuSales = sortedSkus.slice(0, 5).reduce((sum, [, v]) => sum + v, 0);
        const top5SkuShare = totalSales26 > 0 ? (top5SkuSales / totalSales26) * 100 : 0;
        const topSkuName = sortedSkus[0]?.[0] || '-';
        const topSkuShare = totalSales26 > 0 && sortedSkus[0] ? (sortedSkus[0][1] / totalSales26) * 100 : 0;

        let healthyCnt = 0, watchCnt = 0, riskCnt = 0;
        let topRiskItem = null;
        let topGrowthItem = null;
        Object.entries(subGroupMap).forEach(([name, stats]) => {
            if (stats.s26 <= 0 && stats.s25 <= 0) return;
            if (stats.s25 > 0) {
                const yoy = ((stats.s26 - stats.s25) / stats.s25) * 100;
                if (yoy >= 0) {
                    healthyCnt++;
                    if (!topGrowthItem || yoy > topGrowthItem.yoy) topGrowthItem = { name, yoy, s26: stats.s26 };
                } else if (yoy >= -10) {
                    watchCnt++;
                } else {
                    riskCnt++;
                    if (!topRiskItem || yoy < topRiskItem.yoy) topRiskItem = { name, yoy, loss: stats.s25 - stats.s26 };
                }
            }
        });

        const topChannel = channelMix && channelMix.length > 0 ? channelMix[0] : null;
        const secondChannel = channelMix && channelMix.length > 1 ? channelMix[1] : null;
        const topChannelShare = topChannel && totalSales26 > 0 ? (topChannel.value / totalSales26) * 100 : 0;
        const secondChannelShare = secondChannel && totalSales26 > 0 ? (secondChannel.value / totalSales26) * 100 : 0;

        const acq = computeCustomerAcquisition(filteredData, 'All', false);
        const acqSales26 = acq.summary.acqSales26;
        const acqShare = totalSales26 > 0 ? (acqSales26 / totalSales26) * 100 : 0;

        return {
            hasCostData,
            costCoverage,
            totalGP26,
            weightedMargin,
            totalReturns26,
            returnRate,
            top5SkuShare,
            topSkuName,
            topSkuShare,
            activeSkuCount: sortedSkus.length,
            healthyCnt,
            watchCnt,
            riskCnt,
            topRiskItem,
            topGrowthItem,
            topChannel,
            topChannelShare,
            secondChannel,
            secondChannelShare,
            activeCustCount: acq.activeCustCount,
            newCustCount: acq.summary.newCount,
            reactCustCount: acq.summary.reactCount,
            acqSales26,
            acqShare
        };
    };

    const computeTopPerformers = (filteredData, valid2026Months) => {
        if (!filteredData || filteredData.length === 0) return [];
        const skuMap = {};

        for (let i = 0; i < filteredData.length; i++) {
            const d = filteredData[i];
            if (!d) continue;
            const key = d.GroupSKU || 'Unknown';
            if (!skuMap[key]) {
                skuMap[key] = {
                    totalSales26: 0,
                    totalSales25: 0,
                    products: {},
                    channels: {},
                    monthlySales: new Array(12).fill(0)
                };
            }

            const netPrice = Number(d.NetPrice) || 0;
            if (d.Year === '2026') {
                skuMap[key].totalSales26 += netPrice;
                const mIdx = d.MonthIndex >= 1 && d.MonthIndex <= 12 ? d.MonthIndex - 1 : -1;
                if (mIdx >= 0) skuMap[key].monthlySales[mIdx] += netPrice;

                const pName = d.ProductName || 'Unknown';
                if (!skuMap[key].products[pName]) {
                    skuMap[key].products[pName] = { val26: 0, val25: 0, channels: {}, monthlySales: new Array(12).fill(0) };
                }
                skuMap[key].products[pName].val26 += netPrice;
                if (mIdx >= 0) skuMap[key].products[pName].monthlySales[mIdx] += netPrice;

                const channelName = isChainBasedChannel(d.Channel) ? (d.SubChannel || 'Unknown') : (d.SoldToParty || 'Unknown');
                skuMap[key].channels[channelName] = (skuMap[key].channels[channelName] || 0) + netPrice;
                skuMap[key].products[pName].channels[channelName] = (skuMap[key].products[pName].channels[channelName] || 0) + netPrice;
            } else if (d.Year === '2025' && valid2026Months.has(d.MonthIndex)) {
                skuMap[key].totalSales25 += netPrice;
                const pName = d.ProductName || 'Unknown';
                if (!skuMap[key].products[pName]) {
                    skuMap[key].products[pName] = { val26: 0, val25: 0, channels: {}, monthlySales: new Array(12).fill(0) };
                }
                skuMap[key].products[pName].val25 += netPrice;
            }
        }

        return Object.entries(skuMap)
            .map(([sku, data]) => {
                const sortedProducts = Object.entries(data.products)
                    .map(([pName, pData]) => ({
                        name: pName,
                        value: pData.val26,
                        sales25: pData.val25,
                        monthlySales: pData.monthlySales,
                        topChannels: getParetoTopItems(pData.channels)
                    }))
                    .filter((p) => p.value > 0 || p.sales25 > 0)
                    .sort((a, b) => b.value - a.value);
                return {
                    sku,
                    name: sortedProducts.length > 0 ? sortedProducts[0].name : sku,
                    value: data.totalSales26,
                    sales25: data.totalSales25,
                    monthlySales: data.monthlySales,
                    allProducts: sortedProducts,
                    topChannels: getParetoTopItems(data.channels)
                };
            })
            .filter((item) => item.value > 0 || item.sales25 > 0);
    };

    const computeTopCustomers = (filteredData, valid2026Months) => {
        if (!filteredData || filteredData.length === 0) {
            return { rawTopCustomers: [], uniqueCustomersCount: 0 };
        }
        const customerMap = {};
        const unique = new Set();

        for (let i = 0; i < filteredData.length; i++) {
            const d = filteredData[i];
            if (!d) continue;
            const customerName = resolveAccountName(d);
            const ch = d.Channel || 'Unknown';
            const key = `${customerName}|${ch}`;

            if (d.Year === '2026' && customerName && customerName !== 'Unknown') {
                unique.add(key);
            }

            if (!customerMap[key]) {
                customerMap[key] = {
                    key,
                    name: customerName,
                    channel: ch,
                    totalSales26: 0,
                    totalSales25: 0,
                    products: {},
                    productDetails: {},
                    monthlySales: new Array(12).fill(0)
                };
            }

            const pName = d.ProductName || 'Unknown';
            if (!customerMap[key].productDetails[pName]) {
                customerMap[key].productDetails[pName] = { val26: 0, val25: 0, monthlySales: new Array(12).fill(0) };
            }

            const netPrice = Number(d.NetPrice) || 0;
            if (d.Year === '2026') {
                customerMap[key].totalSales26 += netPrice;
                const mIdx = d.MonthIndex >= 1 && d.MonthIndex <= 12 ? d.MonthIndex - 1 : -1;
                if (mIdx >= 0) {
                    customerMap[key].monthlySales[mIdx] += netPrice;
                    customerMap[key].productDetails[pName].monthlySales[mIdx] += netPrice;
                }
                const prodKey = d.GroupSKU || 'Unknown';
                customerMap[key].products[prodKey] = (customerMap[key].products[prodKey] || 0) + netPrice;
                customerMap[key].productDetails[pName].val26 += netPrice;
            } else if (d.Year === '2025' && valid2026Months.has(d.MonthIndex)) {
                customerMap[key].totalSales25 += netPrice;
                customerMap[key].productDetails[pName].val25 += netPrice;
            }
        }

        const list = Object.values(customerMap)
            .filter((item) => item.totalSales26 > 0 || item.totalSales25 > 0)
            .map((item) => {
                const allProducts = Object.entries(item.productDetails)
                    .map(([name, data]) => ({
                        name,
                        value: data.val26,
                        sales25: data.val25,
                        monthlySales: data.monthlySales
                    }))
                    .filter((p) => p.value > 0 || p.sales25 > 0)
                    .sort((a, b) => b.value - a.value);
                return { ...item, topProducts: getParetoTopItems(item.products), allProducts };
            });

        return { rawTopCustomers: list, uniqueCustomersCount: unique.size };
    };

    const computeNPDMetrics = (salesData, filteredData, kpi, selectedGroups = ['ALL']) => {
        if (!salesData || !filteredData || salesData.length === 0) {
            return { totalNPDSales26: 0, topNPDs: [], vitalityIndex: 0, latestAbsMonth: 0 };
        }

        const isAllGroups = selectedGroups.includes('ALL');
        const groupSet = isAllGroups ? null : new Set(selectedGroups);

        const productStats = {};
        let maxAbsMonth = 0;

        for (let i = 0; i < salesData.length; i++) {
            const d = salesData[i];
            if (!d || !d.ProductName) continue;
            if (!isAllGroups && !groupSet.has(d.ProductGroup)) continue;

            const mIdx = d.MonthIndex;
            if (mIdx < 1 || mIdx > 12) continue;

            const absMonth = (Number(d.Year) - 2025) * 12 + mIdx;
            if (absMonth > maxAbsMonth && (Number(d.NetPrice) || 0) > 0) {
                maxAbsMonth = absMonth;
            }

            const existing = productStats[d.ProductName];
            if (!existing) {
                productStats[d.ProductName] = { firstAbsMonth: absMonth };
            } else if (absMonth < existing.firstAbsMonth) {
                existing.firstAbsMonth = absMonth;
            }
        }

        if (maxAbsMonth === 0) {
            return { totalNPDSales26: 0, topNPDs: [], vitalityIndex: 0, latestAbsMonth: 0 };
        }

        const rollingWindowStart = maxAbsMonth - 11;
        const npdProducts = new Set();
        Object.entries(productStats).forEach(([pName, stats]) => {
            if (stats.firstAbsMonth >= rollingWindowStart) npdProducts.add(pName);
        });

        let totalNPDSales26 = 0;
        const npdList = {};

        for (let i = 0; i < filteredData.length; i++) {
            const d = filteredData[i];
            if (d && d.Year === '2026' && npdProducts.has(d.ProductName)) {
                const netPrice = Number(d.NetPrice) || 0;
                totalNPDSales26 += netPrice;
                if (!npdList[d.ProductName]) {
                    npdList[d.ProductName] = { name: d.ProductName, sku: d.GroupSKU, sales26: 0 };
                }
                npdList[d.ProductName].sales26 += netPrice;
            }
        }

        return {
            totalNPDSales26,
            topNPDs: Object.values(npdList).filter((x) => x.sales26 > 0).sort((a, b) => b.sales26 - a.sales26),
            vitalityIndex: kpi && kpi.s26 > 0 ? (totalNPDSales26 / kpi.s26) * 100 : 0,
            latestAbsMonth: maxAbsMonth
        };
    };

    const computeNPDTrajectory = (salesData, npdData, viewMode = 'monthly') => {
        if (!npdData?.topNPDs?.length) {
            return { chartData: [], lines: [], insights: null };
        }

        const topNPDNames = npdData.topNPDs.slice(0, 5).map((n) => n.name);
        const topNPDSet = new Set(topNPDNames);
        const firstMonths = {};
        const arr = salesData || [];

        for (let i = 0; i < arr.length; i++) {
            const d = arr[i];
            if (d && topNPDSet.has(d.ProductName) && d.MonthIndex >= 1 && d.MonthIndex <= 12) {
                const absMonth = parseInt(d.Year, 10) * 12 + d.MonthIndex;
                if (!firstMonths[d.ProductName] || absMonth < firstMonths[d.ProductName]) {
                    firstMonths[d.ProductName] = absMonth;
                }
            }
        }

        const rawMonthly = {};
        topNPDNames.forEach((name) => { rawMonthly[name] = new Array(12).fill(null); });

        for (let i = 0; i < arr.length; i++) {
            const d = arr[i];
            if (d && topNPDSet.has(d.ProductName) && d.MonthIndex >= 1 && d.MonthIndex <= 12) {
                const absMonth = parseInt(d.Year, 10) * 12 + d.MonthIndex;
                const relM = absMonth - firstMonths[d.ProductName];
                if (relM >= 0 && relM < 12) {
                    if (rawMonthly[d.ProductName][relM] === null) rawMonthly[d.ProductName][relM] = 0;
                    rawMonthly[d.ProductName][relM] += Number(d.NetPrice) || 0;
                }
            }
        }

        topNPDNames.forEach((name) => {
            let lastActiveIndex = -1;
            for (let i = 11; i >= 0; i--) {
                if (rawMonthly[name][i] !== null) {
                    lastActiveIndex = i;
                    break;
                }
            }
            for (let i = 0; i <= lastActiveIndex; i++) {
                if (rawMonthly[name][i] === null) rawMonthly[name][i] = 0;
            }
        });

        const cData = Array.from({ length: 12 }, (_, i) => ({ name: `M${i + 1}`, 'Avg Benchmark': 0 }));
        const activeCountPerMonth = new Array(12).fill(0);

        topNPDNames.forEach((name) => {
            let runningTotal = 0;
            for (let i = 0; i < 12; i++) {
                if (rawMonthly[name][i] !== null) {
                    runningTotal += rawMonthly[name][i];
                    const val = viewMode === 'cumulative' ? runningTotal : rawMonthly[name][i];
                    cData[i][name] = val;
                    cData[i]['Avg Benchmark'] += val;
                    activeCountPerMonth[i]++;
                } else {
                    cData[i][name] = null;
                }
            }
        });

        for (let i = 0; i < 12; i++) {
            cData[i]['Avg Benchmark'] = activeCountPerMonth[i] > 0
                ? cData[i]['Avg Benchmark'] / activeCountPerMonth[i]
                : null;
        }

        let fastestStarter = { name: '-', val: 0 };
        let topSustainer = { name: '-', val: -Infinity, m1: 0, m3: 0 };
        let bestRetention = { name: '-', val: -Infinity, m1: 0, m6: 0 };

        topNPDNames.forEach((name) => {
            const m1 = rawMonthly[name][0] || 0;
            if (m1 > fastestStarter.val) fastestStarter = { name, val: m1 };

            const m3 = rawMonthly[name][2];
            if (m1 > 0 && m3 !== null) {
                const growth = ((m3 - m1) / m1) * 100;
                if (growth > topSustainer.val) topSustainer = { name, val: growth, m1, m3 };
            }

            const m6 = rawMonthly[name][5];
            if (m1 > 0 && m6 !== null) {
                const retention = (m6 / m1) * 100;
                if (retention > bestRetention.val) bestRetention = { name, val: retention, m1, m6 };
            }
        });

        return {
            chartData: cData,
            lines: topNPDNames,
            insights: { fastestStarter, topSustainer, bestRetention }
        };
    };

    NPD.engine = {
        calculateDynamicForecast,
        extractFilterOptions,
        computeCoreEngine,
        computeKPIs,
        computeTrendChartData,
        computeCustomerAcquisition,
        computeChurnRadar,
        computeProfitability,
        computeReturnDiagnostics,
        computeExecutiveDeepMetrics,
        computeTopPerformers,
        computeTopCustomers,
        computeNPDMetrics,
        computeNPDTrajectory
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
