(function (root) {
    'use strict';

    const NPD = root.NPD = root.NPD || {};
    const {
        GROUP_ORDER,
        MONTHS_LIST,
        MONTH_MAP,
        PRECOMPILED_BRAND_REGEXES,
        VOLUME_PIN_SHA256,
        FETCH_TIMEOUT_MS,
        MAX_TEXT_CACHE_SIZE,
        CACHE_DB_NAME,
        CACHE_STORE_NAME,
        CACHE_KEY
    } = NPD.config;

    // Bounded text normalization cache (prevents unbounded memory growth)
    const normalizeTextCache = new Map();
    const clearNormalizeCache = () => normalizeTextCache.clear();

    const normalizeText = (text, type = 'general') => {
        if (text === null || text === undefined) return 'Unknown';
        const str = String(text).trim();
        if (!str) return 'Unknown';

        const cacheKey = `${type}:${str}`;
        if (normalizeTextCache.has(cacheKey)) {
            return normalizeTextCache.get(cacheKey);
        }

        const upper = str.toUpperCase();
        let result = str;

        if (upper === 'MT' || upper === 'GT' || upper === 'TT' || upper === 'OB' || upper === 'BJC' || upper === 'CVS') {
            result = upper;
        } else if (upper === 'ONLINE') {
            result = 'Online';
        } else if (upper === 'INTER COMPANY' || upper === 'INTERCOMPANY') {
            result = 'Inter Company';
        } else if (type === 'channel' || type === 'customer') {
            let formatted = str.toLowerCase().replace(/(?:^|\s|-|\/)\S/g, (m) => m.toUpperCase());
            for (let i = 0; i < PRECOMPILED_BRAND_REGEXES.length; i++) {
                const { regex, replacement } = PRECOMPILED_BRAND_REGEXES[i];
                formatted = formatted.replace(regex, replacement);
            }
            result = formatted;
        } else if (type === 'product' || type === 'sku' || type === 'subgroup') {
            result = upper;
        }

        if (normalizeTextCache.size >= MAX_TEXT_CACHE_SIZE) {
            const oldestKey = normalizeTextCache.keys().next().value;
            if (oldestKey !== undefined) normalizeTextCache.delete(oldestKey);
        }
        normalizeTextCache.set(cacheKey, result);
        return result;
    };

    const cleanCurrency = (val) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return (Number.isNaN(val) || !Number.isFinite(val)) ? 0 : val;
        const strVal = String(val).trim();
        if (!strVal || strVal === '-') return 0;
        if (strVal.indexOf('฿') === -1 && strVal.indexOf(',') === -1 && strVal.indexOf('"') === -1) {
            const parsed = parseFloat(strVal);
            return (Number.isNaN(parsed) || !Number.isFinite(parsed)) ? 0 : parsed;
        }
        const parsed = parseFloat(strVal.replace(/[฿",\s]/g, ''));
        return (Number.isNaN(parsed) || !Number.isFinite(parsed)) ? 0 : parsed;
    };

    const sanitizeString = (val, defaultVal = 'Unknown') => {
        if (val === null || val === undefined) return defaultVal;
        const str = String(val).trim();
        return str === '' ? defaultVal : str;
    };

    // Defensive month parser: handles "Jan-26", "January 2026", "2026-01", "01/2026", and Excel serial numbers
    const parseMonthInfo = (rawMonth) => {
        if (rawMonth === null || rawMonth === undefined) {
            return { MonthShort: 'Unk', MonthIndex: -1 };
        }
        const str = String(rawMonth).trim();
        if (!str) return { MonthShort: 'Unk', MonthIndex: -1 };

        const firstThree = str.slice(0, 3);
        const capThree = firstThree.charAt(0).toUpperCase() + firstThree.slice(1).toLowerCase();
        if (MONTH_MAP[capThree]) {
            return { MonthShort: capThree, MonthIndex: MONTH_MAP[capThree] };
        }

        const isoMatch = str.match(/^(?:20\d{2})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/);
        if (isoMatch) {
            const idx = parseInt(isoMatch[1], 10);
            if (idx >= 1 && idx <= 12) {
                return { MonthShort: MONTHS_LIST[idx - 1], MonthIndex: idx };
            }
        }

        const tokenMatch = str.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i);
        if (tokenMatch) {
            const mShort = tokenMatch[1].charAt(0).toUpperCase() + tokenMatch[1].slice(1, 3).toLowerCase();
            if (MONTH_MAP[mShort]) {
                return { MonthShort: mShort, MonthIndex: MONTH_MAP[mShort] };
            }
        }

        if (/^\d{5}(?:\.\d+)?$/.test(str)) {
            const serial = Math.floor(parseFloat(str));
            if (serial >= 40000 && serial <= 60000) {
                const utcMs = Date.UTC(1899, 11, 30) + serial * 86400000;
                const mIdx = new Date(utcMs).getUTCMonth() + 1;
                if (mIdx >= 1 && mIdx <= 12) {
                    return { MonthShort: MONTHS_LIST[mIdx - 1], MonthIndex: mIdx };
                }
            }
        }

        return { MonthShort: 'Unk', MonthIndex: -1 };
    };

    const sanitizeSalesRow = (row, type, targetGroupSet) => {
        if (!row || typeof row !== 'object') return null;

        const rawMonth = String(row['Month'] || '').trim();
        const rawProductName = String(
            row['Product Name'] || row['Product Name_1'] || row['NS Name'] || ''
        ).trim();

        if (!rawMonth || !rawProductName) return null;

        const rawGrp = row['Product Group'] || row['ProductGroup'];
        const groupName = rawGrp ? String(rawGrp).toUpperCase().trim() : 'UNKNOWN';
        const isAllowed = targetGroupSet instanceof Set
            ? targetGroupSet.has(groupName)
            : Array.isArray(targetGroupSet) && targetGroupSet.includes(groupName);
        if (!isAllowed) return null;

        const { MonthShort, MonthIndex } = parseMonthInfo(rawMonth);
        if (MonthIndex < 1 || MonthIndex > 12) return null;

        const rawCost = row['Cost'] ?? row['COGS'] ?? row['Standard Cost'] ?? row['Total Cost'] ?? row['Standard Price'];
        const costVal = cleanCurrency(rawCost);
        const hasCost = rawCost !== null && rawCost !== undefined && String(rawCost).trim() !== '' && String(rawCost).trim() !== '-' && costVal > 0;

        return {
            Month: rawMonth,
            MonthShort,
            MonthIndex,
            ProductGroup: groupName,
            Channel: normalizeText(row['Channel'], 'channel'),
            SubChannel: normalizeText(row['Sub-channel'] || row['Sub-Channel'], 'channel'),
            SoldToParty: normalizeText(row['Sold-to party'] || row['Sold-To Party'], 'customer'),
            MaterialNumber: sanitizeString(row['Material Number'] || row['Material Number_1'] || row['NS Number']),
            ProductName: normalizeText(rawProductName, 'product'),
            SubProductGroup: normalizeText(row['Sub-product group'] || row['Sub-Product Group'], 'subgroup'),
            GroupSKU: normalizeText(row['Group SKU'] || row['Sub-product group'] || row['Sub-Product Group'], 'sku'),
            NetPrice: cleanCurrency(row['Net Price']),
            Cost: costVal,
            HasCost: hasCost,
            Quantity: cleanCurrency(row['Quantity'] || row['Qty']),
            BaseUnit: sanitizeString(row['Base Unit'] || row['BaseUnit'] || row['UOM'], 'PC').toUpperCase(),
            Year: type === 's25' ? '2025' : '2026'
        };
    };

    const sanitizeBudgetRow = (row, type, targetGroupSet) => {
        if (!row || typeof row !== 'object') return null;
        const rawGrp = row['Product Group'] || row['ProductGroup'];
        const groupName = rawGrp ? String(rawGrp).toUpperCase().trim() : 'UNKNOWN';
        const isAllowed = targetGroupSet instanceof Set
            ? targetGroupSet.has(groupName)
            : Array.isArray(targetGroupSet) && targetGroupSet.includes(groupName);
        if (!isAllowed) return null;

        const base = {
            ProductGroup: groupName,
            Target2026: cleanCurrency(row['Target 2026 (Plan)'] ?? row['Target 2026 (Budget)'] ?? row['Target 2026']),
            Plan2027: cleanCurrency(row['Target 2027 (Plan)'] ?? row['Target 2027 (Budget)'] ?? row['Plan 2027']),
            Forecast2026: cleanCurrency(row['L.E. 2026 (Forecast)'] ?? row['Forecast 2026'] ?? row['L.E. 2026'])
        };

        if (type === 'bCh') {
            const rawCh = sanitizeString(row['Channel']).toUpperCase();
            if (rawCh === 'TOTAL' || rawCh === 'UNKNOWN') return null;
            return { ...base, Channel: normalizeText(row['Channel'], 'channel') };
        }

        const subGroup = sanitizeString(row['Sub-product Group'] || row['Sub-Product Group']).toUpperCase();
        if (subGroup === 'TOTAL' || subGroup === 'UNKNOWN') return null;
        return { ...base, SubProductGroup: normalizeText(row['Sub-product Group'] || row['Sub-Product Group'], 'subgroup') };
    };

    const isChainBasedChannel = (channel) => {
        const upper = String(channel || '').toUpperCase();
        return upper === 'MT' || upper === 'INTER COMPANY' || upper === 'ONLINE' || upper === 'BJC';
    };

    const resolveAccountName = (row) => {
        if (!row) return 'Unknown';
        const upperCh = String(row.Channel || '').toUpperCase();
        if (upperCh === 'MT' || upperCh === 'ONLINE') {
            return row.SubChannel || 'Unknown';
        }
        return row.SoldToParty || 'Unknown';
    };

    const getImgFilename = (groupName, ext = 'png') => {
        const slug = String(groupName || '').toLowerCase().replace(/&/g, '');
        return `image/${slug}.${ext}`;
    };

    const getParetoTopItems = (dataObj, maxItems = 5, threshold = 0.8) => {
        if (!dataObj) return [];
        const entries = Object.entries(dataObj).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((sum, [, val]) => sum + val, 0);
        if (total <= 0) return [];

        let cumulative = 0;
        const result = [];
        for (let i = 0; i < entries.length; i++) {
            const pct = ((entries[i][1] / total) * 100).toFixed(1);
            result.push({ name: entries[i][0], pct });
            cumulative += entries[i][1];
            if (cumulative / total >= threshold || result.length >= maxItems) break;
        }
        return result;
    };

    const computeNiceYAxisTicks = (maxVal, defaultMax = 5000000) => {
        if (!maxVal || maxVal <= 0 || !Number.isFinite(maxVal)) return [0, defaultMax];
        const targetMax = maxVal * 1.15;
        const roughStep = targetMax / 4;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep || 1)));
        const normalized = roughStep / magnitude;
        const niceNorm = normalized <= 1 ? 1 : (normalized <= 2 ? 2 : (normalized <= 2.5 ? 2.5 : (normalized <= 5 ? 5 : 10)));
        const step = niceNorm * magnitude;
        const maxTick = Math.ceil(targetMax / step) * step;
        const ticks = [];
        for (let current = 0; current <= maxTick + step * 0.1; current += step) {
            ticks.push(current);
        }
        return ticks;
    };

    const copyTextToClipboard = async (text) => {
        if (!text) return false;
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {
                // Fall through to legacy textarea copy
            }
        }
        if (typeof document === 'undefined') return false;
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (_) {
            ok = false;
        } finally {
            textArea.remove();
        }
        return ok;
    };

    // Defensive CSV String Builder & UTF-8 BOM Exporter (Thai Excel safe + formula-injection safe)
    const escapeCSVCell = (rawVal) => {
        if (rawVal === null || rawVal === undefined) return '';
        if (typeof rawVal === 'number') {
            return Number.isFinite(rawVal) ? String(rawVal) : '';
        }
        let str = String(rawVal);
        // Prevent spreadsheet formula injection on string cells starting with =, +, -, @
        if (/^[=+\-@]/.test(str) && !/^-[0-9]/.test(str)) {
            str = `'${str}`;
        }
        if (/[",\r\n]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const buildCSVContent = (columns, rows) => {
        const cols = columns || [];
        const headerLine = cols.map((c) => escapeCSVCell(c.label)).join(',');
        const bodyLines = (rows || []).map((row, idx) =>
            cols.map((c) => {
                const val = typeof c.accessor === 'function' ? c.accessor(row, idx) : row[c.key];
                return escapeCSVCell(val);
            }).join(',')
        );
        return '\uFEFF' + [headerLine, ...bodyLines].join('\r\n');
    };

    const exportRowsToCSV = (filename, columns, rows) => {
        if (!rows || rows.length === 0) return false;
        const csvContent = buildCSVContent(columns, rows);
        if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
            return csvContent;
        }
        const safeName = String(filename || 'export.csv').replace(/[^a-zA-Z0-9._-]/g, '_');
        const finalName = safeName.endsWith('.csv') ? safeName : `${safeName}.csv`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', finalName);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    };

    // Shareable URL Query State Parser & Synchronizer
    const VALID_URL_TABS = new Set(['Overview', 'Core', 'Distribution', 'Innovation']);

    const parseUrlViewState = (searchStr) => {
        const rawSearch = typeof searchStr === 'string'
            ? searchStr
            : (typeof window !== 'undefined' && window.location ? window.location.search : '');
        const defaults = {
            activeTab: 'Overview',
            selectedGroups: ['ALL'],
            filterSubProduct: 'All',
            filterChannel: 'All',
            filterSubChannel: 'All',
            filterMonth: [...MONTHS_LIST],
            excludeReturns: false
        };
        if (!rawSearch) return defaults;

        try {
            const params = new URLSearchParams(rawSearch);
            const tab = params.get('tab');
            if (tab && VALID_URL_TABS.has(tab)) defaults.activeTab = tab;

            const grpParam = params.get('groups');
            if (grpParam && grpParam !== 'ALL') {
                const validGrps = grpParam
                    .split(',')
                    .map((g) => g.trim().toUpperCase())
                    .filter((g) => GROUP_ORDER.includes(g));
                if (validGrps.length > 0 && validGrps.length < GROUP_ORDER.length) {
                    validGrps.sort((a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));
                    defaults.selectedGroups = validGrps;
                }
            }

            const sub = params.get('sub');
            if (sub && sub.trim()) defaults.filterSubProduct = sub.trim();

            const ch = params.get('ch');
            if (ch && ch.trim()) defaults.filterChannel = ch.trim();

            const subCh = params.get('subCh');
            if (subCh && subCh.trim()) defaults.filterSubChannel = subCh.trim();

            const mParam = params.get('months');
            if (mParam) {
                if (mParam === 'NONE') {
                    defaults.filterMonth = [];
                } else {
                    const validMonths = mParam
                        .split(',')
                        .map((m) => m.trim())
                        .filter((m) => MONTHS_LIST.includes(m));
                    if (validMonths.length > 0 && validMonths.length < MONTHS_LIST.length) {
                        defaults.filterMonth = MONTHS_LIST.filter((m) => validMonths.includes(m));
                    }
                }
            }

            if (params.get('exclRet') === '1') {
                defaults.excludeReturns = true;
            }
        } catch (_) {
            // Ignore malformed URL query strings
        }
        return defaults;
    };

    const buildViewQueryString = (state) => {
        if (!state) return '';
        const params = new URLSearchParams();
        if (state.activeTab && state.activeTab !== 'Overview' && VALID_URL_TABS.has(state.activeTab)) {
            params.set('tab', state.activeTab);
        }
        if (Array.isArray(state.selectedGroups) && !state.selectedGroups.includes('ALL') && state.selectedGroups.length > 0) {
            params.set('groups', state.selectedGroups.join(','));
        }
        if (state.filterSubProduct && state.filterSubProduct !== 'All') {
            params.set('sub', state.filterSubProduct);
        }
        if (state.filterChannel && state.filterChannel !== 'All') {
            params.set('ch', state.filterChannel);
        }
        if (state.filterSubChannel && state.filterSubChannel !== 'All') {
            params.set('subCh', state.filterSubChannel);
        }
        if (Array.isArray(state.filterMonth) && state.filterMonth.length < MONTHS_LIST.length) {
            params.set('months', state.filterMonth.length === 0 ? 'NONE' : state.filterMonth.join(','));
        }
        if (state.excludeReturns) {
            params.set('exclRet', '1');
        }
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    };

    const syncUrlViewState = (state) => {
        if (typeof window === 'undefined' || !window.history || typeof window.history.replaceState !== 'function') {
            return;
        }
        try {
            const qs = buildViewQueryString(state);
            const nextUrl = `${window.location.pathname}${qs}${window.location.hash || ''}`;
            if (`${window.location.pathname}${window.location.search}${window.location.hash || ''}` !== nextUrl) {
                window.history.replaceState(null, '', nextUrl);
            }
        } catch (_) {
            // Safely ignore sandboxed iframe history restrictions
        }
    };

    // Defensive IndexedDB Snapshot Cache for Stale-While-Revalidate instant startup
    const openCacheDB = () => new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        try {
            const req = indexedDB.open(CACHE_DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
                    db.createObjectStore(CACHE_STORE_NAME);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error || new Error('IndexedDB open error'));
        } catch (err) {
            reject(err);
        }
    });

    const loadCachedDataset = async () => {
        let db = null;
        try {
            db = await openCacheDB();
            return await new Promise((resolve) => {
                const tx = db.transaction(CACHE_STORE_NAME, 'readonly');
                const store = tx.objectStore(CACHE_STORE_NAME);
                const req = store.get(CACHE_KEY);
                req.onsuccess = () => {
                    const val = req.result;
                    if (val && Array.isArray(val.salesData) && val.salesData.length > 0) {
                        // Restore Set/Typed fields if needed (plain objects serialize cleanly)
                        resolve(val);
                    } else {
                        resolve(null);
                    }
                };
                req.onerror = () => resolve(null);
            });
        } catch (_) {
            return null;
        } finally {
            if (db) {
                try { db.close(); } catch (_) {}
            }
        }
    };

    const saveCachedDataset = async (payload) => {
        let db = null;
        try {
            db = await openCacheDB();
            await new Promise((resolve) => {
                const tx = db.transaction(CACHE_STORE_NAME, 'readwrite');
                const store = tx.objectStore(CACHE_STORE_NAME);
                store.put(payload, CACHE_KEY);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
            return true;
        } catch (_) {
            return false;
        } finally {
            if (db) {
                try { db.close(); } catch (_) {}
            }
        }
    };

    const formatSyncTimestamp = (ts) => {
        if (!ts) return null;
        try {
            const d = new Date(ts);
            if (Number.isNaN(d.getTime())) return null;
            const day = d.getDate();
            const mon = MONTHS_LIST[d.getMonth()] || '';
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            return `${day} ${mon}, ${hh}:${mm}`;
        } catch (_) {
            return null;
        }
    };

    // Pure-JS SHA-256 fallback when Web Crypto SubtleCrypto is unavailable
    const sha256FallbackHex = (ascii) => {
        const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        let result = '';
        const words = [];
        const asciiBitLength = ascii.length * 8;

        let hash = [];
        const k = [];
        let primeCounter = 0;
        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
                hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }

        ascii += '\x80';
        while ((ascii.length % 64) - 56) ascii += '\x00';
        for (let i = 0; i < ascii.length; i++) {
            const j = ascii.charCodeAt(i);
            words[i >> 2] |= j << (((3 - i) % 4) * 8);
        }
        words[words.length] = (asciiBitLength / maxWord) | 0;
        words[words.length] = asciiBitLength;

        for (let j = 0; j < words.length;) {
            const w = words.slice(j, (j += 16));
            const oldHash = hash.slice(0);

            for (let i = 0; i < 64; i++) {
                const w15 = w[i - 15], w2 = w[i - 2];
                const a = hash[0], e = hash[4];
                const temp1 =
                    hash[7] +
                    (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
                    ((e & hash[5]) ^ (~e & hash[6])) +
                    k[i] +
                    (w[i] = i < 16 ? w[i] : (
                        w[i - 16] +
                        (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                        w[i - 7] +
                        (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0);
                const temp2 =
                    (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
                    ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
                hash.pop();
            }

            for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
        }

        for (let i = 0; i < 8; i++) {
            for (let j = 3; j + 1; j--) {
                const b = (hash[i] >> (j * 8)) & 255;
                result += (b < 16 ? '0' : '') + b.toString(16);
            }
        }
        return result;
    };

    const sha256Hex = async (input) => {
        const str = String(input ?? '');
        if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
            try {
                const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
                return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
            } catch (_) {
                return sha256FallbackHex(str);
            }
        }
        return sha256FallbackHex(str);
    };

    const verifyVolumePin = async (pinInput) => {
        const digest = await sha256Hex(String(pinInput || '').trim());
        return digest === VOLUME_PIN_SHA256;
    };

    const requestCache = new Map();
    const clearRequestCache = () => requestCache.clear();

    const fetchWithTimeout = async (url, timeoutMs = FETCH_TIMEOUT_MS) => {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timerId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        try {
            const response = await fetch(url, controller ? { signal: controller.signal, cache: 'no-store' } : { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
            }
            return await response.text();
        } finally {
            if (timerId !== null) clearTimeout(timerId);
        }
    };

    const parseCSVText = (csvText) => {
        const trimmed = String(csvText || '').trimStart();
        if (!trimmed) throw new Error('Empty CSV response');
        if (/^(<!doctype\s+html|<html\b)/i.test(trimmed)) {
            throw new Error('Received HTML error page instead of CSV');
        }
        if (!root.Papa || typeof root.Papa.parse !== 'function') {
            throw new Error('PapaParse library is not loaded');
        }
        return new Promise((resolve, reject) => {
            root.Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (!results || !Array.isArray(results.data)) {
                        reject(new Error('Malformed CSV parse output'));
                        return;
                    }
                    if (results.data.length === 0 && Array.isArray(results.errors) && results.errors.length > 0) {
                        reject(new Error(`CSV parse error: ${results.errors[0].message || 'Unknown'}`));
                        return;
                    }
                    resolve(results.data);
                },
                error: (err) => reject(err)
            });
        });
    };

    const fetchCSV = async (url) => {
        if (!url) return null;
        if (requestCache.has(url)) return requestCache.get(url);

        const fetchPromise = (async () => {
            let retries = 3;
            let lastError;
            while (retries > 0) {
                try {
                    const csvText = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
                    await new Promise((r) => setTimeout(r, 0));
                    return await parseCSVText(csvText);
                } catch (error) {
                    lastError = error;
                    retries--;
                    if (retries > 0) {
                        await new Promise((r) => setTimeout(r, 600 * (4 - retries)));
                    }
                }
            }
            throw lastError;
        })();

        requestCache.set(url, fetchPromise);
        return fetchPromise;
    };

    const processRowsInChunks = async (rawData, processorFn, chunkSize = 2500) => {
        const len = rawData.length;
        for (let i = 0; i < len; i += chunkSize) {
            const end = Math.min(i + chunkSize, len);
            for (let j = i; j < end; j++) {
                processorFn(rawData[j]);
            }
            if (end < len) {
                await new Promise((r) => setTimeout(r, 0));
            }
        }
    };

    const runWithConcurrency = async (taskFns, concurrency = 6) => {
        const results = new Array(taskFns.length);
        let nextIndex = 0;

        const worker = async () => {
            while (nextIndex < taskFns.length) {
                const current = nextIndex++;
                results[current] = await taskFns[current]();
            }
        };

        const workers = Array.from({ length: Math.min(concurrency, taskFns.length) }, () => worker());
        await Promise.all(workers);
        return results;
    };

    NPD.utils = {
        normalizeText,
        clearNormalizeCache,
        cleanCurrency,
        sanitizeString,
        parseMonthInfo,
        sanitizeSalesRow,
        sanitizeBudgetRow,
        isChainBasedChannel,
        resolveAccountName,
        getImgFilename,
        getParetoTopItems,
        computeNiceYAxisTicks,
        copyTextToClipboard,
        escapeCSVCell,
        buildCSVContent,
        exportRowsToCSV,
        parseUrlViewState,
        buildViewQueryString,
        syncUrlViewState,
        loadCachedDataset,
        saveCachedDataset,
        formatSyncTimestamp,
        sha256Hex,
        verifyVolumePin,
        parseCSVText,
        fetchCSV,
        clearRequestCache,
        processRowsInChunks,
        runWithConcurrency
    };
})(typeof globalThis !== 'undefined' ? globalThis : window);
