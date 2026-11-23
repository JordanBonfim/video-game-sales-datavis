const statusElement = document.getElementById('status');

const charts = {
    regionalBar: echarts.init(document.getElementById('regionalBar')),
    regionalStacked: echarts.init(document.getElementById('regionalStacked')),
    regionalHeatmap: echarts.init(document.getElementById('regionalHeatmap')),
    salesTimeline: echarts.init(document.getElementById('salesTimeline')),
    releasesTimeline: echarts.init(document.getElementById('releasesTimeline')),
    salesArea: echarts.init(document.getElementById('salesArea')),
    geoMap: echarts.init(document.getElementById('geoMap')),

    studioRace: echarts.init(document.getElementById('studioRace')),
    consoleRace: echarts.init(document.getElementById('consoleRace')),
    ownerRace: echarts.init(document.getElementById('ownerRace'))
};

// Sincroniza os gráficos temporais
charts.salesTimeline.group = 'group1';
charts.releasesTimeline.group = 'group1';
charts.salesArea.group = 'group1';
echarts.connect('group1');

const regions = [
    { key: 'jp_sales', name: 'Japão' },
    { key: 'na_sales', name: 'América do Norte' },
    { key: 'pal_sales', name: 'Europa' }
];

// Ativa o loading antes de ler o CSV
Object.values(charts).forEach(chart => chart.showLoading());

Papa.parse('Video_Games_Sales_Preprocessed.csv', {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
        Object.values(charts).forEach(chart => chart.hideLoading());
        if (statusElement) {
            statusElement.textContent = `${result.data.length.toLocaleString('pt-BR')} registros carregados.`;
        }
        processData(result.data);
    },
    error: (error) => {
        Object.values(charts).forEach(chart => chart.hideLoading());
        if (statusElement) {
            statusElement.textContent = 'Erro ao carregar o CSV.';
        }
        console.error(error);
    }
});

function getConsoleOwner(rawConsole) {
    const c = rawConsole?.trim();
    if (!c || c === 'Unknown') return 'Unknown';

    const owners = {
        // Sony (PlayStation)
        PS: 'Sony (PlayStation)',
        PS2: 'Sony (PlayStation)',
        PS3: 'Sony (PlayStation)',
        PS4: 'Sony (PlayStation)',
        PSP: 'Sony (PlayStation)',
        PSV: 'Sony (PlayStation)',
        PSN: 'Sony (PlayStation)',

        // Nintendo
        NES: 'Nintendo',
        SNES: 'Nintendo',
        N64: 'Nintendo',
        GC: 'Nintendo',
        Wii: 'Nintendo',
        WiiU: 'Nintendo',
        NS: 'Nintendo',
        GB: 'Nintendo',
        GBC: 'Nintendo',
        GBA: 'Nintendo',
        DS: 'Nintendo',
        '3DS': 'Nintendo',
        VC: 'Nintendo',
        WW: 'Nintendo',

        // Microsoft (Xbox)
        XB: 'Microsoft (Xbox)',
        X360: 'Microsoft (Xbox)',
        XOne: 'Microsoft (Xbox)',
        XBL: 'Microsoft (Xbox)',

        // Sega
        GEN: 'Sega',
        GG: 'Sega',
        SCD: 'Sega',
        SAT: 'Sega',
        DC: 'Sega',

        // PC / Computadores
        PC: 'PC',
        OSX: 'PC',

        // Clássicos / Outros
        '2600': 'Atari',
        NG: 'SNK (Neo Geo)',
        PCE: 'NEC (PC Engine)',
        PCFX: 'NEC (PC Engine)',
        WS: 'Bandai (WonderSwan)',
        '3DO': '3DO',
        Mob: 'Mobile'
    };

    return owners[c] || 'Outros';
}

function normalizeStudio(rawStudio) {
    const name = rawStudio?.trim();
    if (!name || name === 'Unknown' || name === 'N/A' || name === '08-Apr') return 'Unknown';

    const studioMap = {
        'EA Sports': 'Electronic Arts',
        'EA Sports BIG': 'Electronic Arts',
        'EA Games': 'Electronic Arts',
        'Electronic Arts Victor': 'Electronic Arts',
        'Sony Computer Entertainment': 'Sony Interactive Ent.',
        'Sony Computer Entertainment America': 'Sony Interactive Ent.',
        'Sony Computer Entertainment Europe': 'Sony Interactive Ent.',
        'Sony Interactive Entertainment': 'Sony Interactive Ent.',
        'Sony Online Entertainment': 'Sony Interactive Ent.',
        'Namco': 'Bandai Namco',
        'Bandai': 'Bandai Namco',
        'Namco Bandai': 'Bandai Namco',
        'Namco Bandai Games': 'Bandai Namco',
        'Bandai Namco Games': 'Bandai Namco',
        'Bandai Namco Entertainment': 'Bandai Namco',
        'Warner Bros. Interactive Entertainment': 'Warner Bros. Interactive',
        'Microsoft Game Studios': 'Microsoft Studios',
        'Microsoft': 'Microsoft Studios',
        '2K Sports': '2K Games',
        '2K Play': '2K Games',
        'SquareSoft': 'Square Enix',
        'Square': 'Square Enix',
        'Enix': 'Square Enix',
        'Square EA': 'Square Enix',
        'KOEI': 'Koei Tecmo',
        'Tecmo': 'Koei Tecmo',
        'Tecmo Koei': 'Koei Tecmo',
        'Konami Digital Entertainment': 'Konami',
        'Capcom Entertainment': 'Capcom',
        'THQ Nordic': 'THQ',
        'Nordic Games': 'THQ'
    };

    return studioMap[name] || name;
}

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getYear(date) {
    if (!date) return null;
    const clean = String(date).trim();
    const match = clean.match(/(?:^|[-/])(\d{4})(?:$|[-/])/);
    if (!match) return null;
    const year = Number(match[1]);
    if (year < 1980 || year > 2026) return null;
    return year;
}

function processData(games) {
    const validGames = games.map(game => ({
        ...game,
        console: game.console?.trim() || 'Unknown',
        consoleOwner: getConsoleOwner(game.console),
        studio: normalizeStudio(game.publisher || game.developer || game.studio),
        genre: game.genre?.trim() || 'Unknown',
        title: game.title?.trim() || '',
        year: getYear(game.release_date),
        jp_sales: number(game.jp_sales),
        na_sales: number(game.na_sales),
        pal_sales: number(game.pal_sales),
        total_sales: number(game.total_sales)
    }));

    renderRegionalCharts(validGames);
    renderTemporalCharts(validGames);
    renderGeoMap(validGames);

    // Lista para controlar as 3 races
    const raceControllers = [];

    // Dentro de processData(games), substitua as 3 chamadas por estas:
    raceControllers.length = 0;
    raceControllers.push(renderBarRace(validGames, charts.studioRace, 'studio', 'replayStudio'));
    raceControllers.push(renderBarRace(validGames, charts.consoleRace, 'console', 'replayConsole'));
    raceControllers.push(renderBarRace(validGames, charts.ownerRace, 'consoleOwner', 'replayOwner'));

    // Vincular os botões globais (Play / Pause / Restart nos 3 juntos)
    const playAllBtn = document.getElementById('playAllRaces');
    const pauseAllBtn = document.getElementById('pauseAllRaces');
    const restartAllBtn = document.getElementById('restartAllRaces');

    if (playAllBtn) playAllBtn.onclick = () => raceControllers.forEach(ctrl => ctrl.play());
    if (pauseAllBtn) pauseAllBtn.onclick = () => raceControllers.forEach(ctrl => ctrl.pause());
    if (restartAllBtn) restartAllBtn.onclick = () => raceControllers.forEach(ctrl => ctrl.restart());
}

function renderBarRace(games, chartInstance, groupField, replayBtnId) {
    const validYears = games.map(g => g.year).filter(Boolean);
    const minYear = validYears.length ? Math.min(...validYears) : 1980;
    const maxYear = validYears.length ? Math.max(...validYears) : 2024;
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    const annualSales = {};
    const overallTotals = {};
    years.forEach(year => {
        annualSales[year] = {};
    });

    games.forEach(game => {
        const entity = game[groupField];
        if (!game.year || !entity || entity === 'Unknown') return;

        const sales = game.total_sales > 0
            ? game.total_sales
            : (game.na_sales + game.pal_sales + game.jp_sales);

        annualSales[game.year][entity] = (annualSales[game.year][entity] || 0) + sales;
        overallTotals[entity] = (overallTotals[entity] || 0) + sales;
    });

    const entities = Object.keys(overallTotals).sort((a, b) => overallTotals[b] - overallTotals[a]);

    const colorPalette = [
        '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
        '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#2f4554',
        '#61a0a8', '#d48265', '#c23531', '#bda29a', '#6e7074'
    ];
    const colorMap = {};
    entities.forEach((entity, idx) => {
        colorMap[entity] = colorPalette[idx % colorPalette.length];
    });

    const cumulativeByYear = {};
    const runningTotals = {};

    years.forEach(year => {
        entities.forEach(entity => {
            runningTotals[entity] = (runningTotals[entity] || 0) + (annualSales[year][entity] || 0);
        });

        cumulativeByYear[year] = Object.entries(runningTotals)
            .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    });

    const updateFrequency = 600;
    let timer = null;
    let currentIndex = 0;

    function getOptionForYear(year) {
        const topData = cumulativeByYear[year] || [];
        return {
            grid: { top: 20, bottom: 30, left: 200, right: 85 },
            xAxis: {
                max: 'dataMax',
                axisLabel: { formatter: '{value} M' }
            },
            yAxis: {
                type: 'category',
                inverse: true,
                max: 9,
                data: topData.map(d => d.name),
                axisLabel: {
                    width: 185,
                    overflow: 'truncate'
                },
                animationDuration: 300,
                animationDurationUpdate: 300
            },
            series: [{
                realtimeSort: true,
                type: 'bar',
                data: topData.map(d => ({
                    value: d.value,
                    itemStyle: { color: colorMap[d.name] }
                })),
                label: {
                    show: true,
                    position: 'right',
                    valueAnimation: true,
                    formatter: '{c} M'
                }
            }],
            graphic: {
                elements: [{
                    type: 'text',
                    right: 40,
                    bottom: 40,
                    style: {
                        text: String(year),
                        font: 'bolder 64px monospace',
                        fill: 'rgba(100, 100, 100, 0.25)'
                    },
                    z: 100
                }]
            },
            animationDuration: 0,
            animationDurationUpdate: updateFrequency,
            animationEasing: 'linear',
            animationEasingUpdate: 'linear'
        };
    }

    function pause() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
    }

    function play() {
        if (timer) return; // Já está rodando

        // Se já terminou a corrida, volta para o início
        if (currentIndex >= years.length - 1) {
            currentIndex = 0;
            chartInstance.setOption(getOptionForYear(years[currentIndex]), true);
        }

        timer = setInterval(() => {
            currentIndex++;
            if (currentIndex >= years.length) {
                pause();
                return;
            }
            chartInstance.setOption(getOptionForYear(years[currentIndex]));
        }, updateFrequency);
    }

    function restart() {
        pause();
        currentIndex = 0;
        chartInstance.setOption(getOptionForYear(years[currentIndex]), true);
        play();
    }

    // Renderiza apenas o frame inicial (pausado) 
    chartInstance.setOption(getOptionForYear(years[0]), true);
    setTimeout(() => chartInstance.resize(), 100);

    // Botão individual do card reinicia e inicia aquela corrida
    const replayBtn = document.getElementById(replayBtnId);
    if (replayBtn) {
        replayBtn.onclick = restart;
    }

    return { play, pause, restart };
}

function renderGeoMap(games) {
    charts.geoMap.showLoading();

    const regionsConfig = {
        na: { name: 'América do Norte', center: [-100, 40], data: {} },
        pal: { name: 'Europa', center: [10, 50], data: {} },
        jp: { name: 'Japão', center: [138, 36], data: {} }
    };

    games.forEach(game => {
        const item = game.console;
        if (!item || item === 'Unknown') return;

        regionsConfig.na.data[item] = (regionsConfig.na.data[item] || 0) + game.na_sales;
        regionsConfig.pal.data[item] = (regionsConfig.pal.data[item] || 0) + game.pal_sales;
        regionsConfig.jp.data[item] = (regionsConfig.jp.data[item] || 0) + game.jp_sales;
    });

    function getTop10PieData(regionData) {
        return Object.entries(regionData)
            .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }

    fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json')
        .then(response => response.json())
        .then(worldJson => {
            echarts.registerMap('world', worldJson);

            const pieSeries = Object.keys(regionsConfig).map(key => {
                const region = regionsConfig[key];
                return {
                    type: 'pie',
                    coordinateSystem: 'geo',
                    tooltip: {
                        formatter: '{b}: {c}M ({d}%)'
                    },
                    label: { show: false },
                    labelLine: { show: false },
                    radius: 35,
                    center: region.center,
                    data: getTop10PieData(region.data)
                };
            });

            const option = {
                geo: {
                    map: 'world',
                    roam: true,
                    itemStyle: {
                        areaColor: '#e7e8ea',
                        borderColor: '#cccccc'
                    },
                    emphasis: {
                        label: { show: false },
                        itemStyle: { areaColor: '#d0d2d6' }
                    }
                },
                tooltip: { trigger: 'item' },
                legend: {
                    type: 'scroll',
                    bottom: 0
                },
                series: pieSeries
            };

            charts.geoMap.hideLoading();
            charts.geoMap.setOption(option);
        })
        .catch(error => {
            console.error("Erro ao carregar o mapa:", error);
            charts.geoMap.hideLoading();
        });
}

function renderRegionalCharts(games) {
    const genres = [...new Set(games.map(game => game.genre))].filter(Boolean);
    const salesByGenre = {};

    genres.forEach(genre => {
        salesByGenre[genre] = { jp_sales: 0, na_sales: 0, pal_sales: 0 };
    });

    games.forEach(game => {
        salesByGenre[game.genre].jp_sales += game.jp_sales;
        salesByGenre[game.genre].na_sales += game.na_sales;
        salesByGenre[game.genre].pal_sales += game.pal_sales;
    });

    const sortedGenres = [...genres].sort((a, b) => {
        const totalA = regions.reduce((sum, region) => sum + salesByGenre[a][region.key], 0);
        const totalB = regions.reduce((sum, region) => sum + salesByGenre[b][region.key], 0);
        return totalB - totalA;
    });

    charts.regionalBar.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: regions.map(region => region.name) },
        grid: { left: 60, right: 25, bottom: 80 },
        xAxis: { type: 'category', data: sortedGenres, axisLabel: { rotate: 35 } },
        yAxis: { type: 'value', name: 'Vendas (Milhões)' },
        series: regions.map(region => ({
            name: region.name,
            type: 'bar',
            data: sortedGenres.map(genre => salesByGenre[genre][region.key])
        }))
    });

    const totalsByRegion = {};
    regions.forEach(region => {
        totalsByRegion[region.key] = sortedGenres.reduce((sum, genre) => sum + salesByGenre[genre][region.key], 0);
    });

    charts.regionalStacked.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: value => `${value.toFixed(2)}%` },
        legend: {
            type: 'scroll',
            bottom: 0,
            tooltip: {
                show: true,
                position: function (point) {
                    return [point[0], point[1] + 20];
                },
                formatter: function(params) {
                    const genre = params.name;
                    let tooltipHtml = `<strong>${genre}</strong><br/>`;

                    regions.forEach(region => {
                        const total = totalsByRegion[region.key];
                        const percent = total > 0
                            ? (salesByGenre[genre][region.key] / total * 100)
                            : 0;
                        tooltipHtml += `${region.name}: ${percent.toFixed(2)}%<br/>`;
                    });

                    return tooltipHtml;
                }
            }
        },
        grid: { left: 60, right: 25, top: 30, bottom: 90 },
        xAxis: { type: 'category', data: regions.map(region => region.name) },
        yAxis: { type: 'value', max: 100, name: 'Participação (%)', axisLabel: { formatter: '{value}%' } },
        series: sortedGenres.map(genre => ({
            name: genre,
            type: 'bar',
            stack: 'total',
            emphasis: { focus: 'series' },
            data: regions.map(region => {
                const total = totalsByRegion[region.key];
                return total > 0 ? (salesByGenre[genre][region.key] / total * 100) : 0;
            })
        }))
    });

    const heatmapData = [];
    sortedGenres.forEach((genre, genreIndex) => {
        regions.forEach((region, regionIndex) => {
            heatmapData.push([regionIndex, genreIndex, Number(salesByGenre[genre][region.key].toFixed(2))]);
        });
    });

    const maxSales = Math.max(...heatmapData.map(item => item[2]), 1);

    charts.regionalHeatmap.setOption({
        tooltip: {
            position: 'top',
            formatter: params => {
                const region = regions[params.data[0]].name;
                const genre = sortedGenres[params.data[1]];
                const sales = params.data[2];
                return `${genre}<br>${region}: ${sales.toFixed(2)} milhões`;
            }
        },
        grid: { left: 110, right: 40, bottom: 70 },
        xAxis: { type: 'category', data: regions.map(region => region.name) },
        yAxis: { type: 'category', data: sortedGenres, inverse: true },
        visualMap: {
            min: 0,
            max: maxSales,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 5,
            inRange: { color: ['#f7f7f7', '#6baed6', '#08519c', '#08306b'] }
        },
        series: [{
            type: 'heatmap',
            data: heatmapData,
            label: { show: true, formatter: params => params.data[2] },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.4)' } }
        }]
    });
}

function renderTemporalCharts(games) {
    const years = Array.from({ length: 45 }, (_, index) => 1980 + index);
    const salesByYear = {};
    const releasesByYear = {};

    years.forEach(year => {
        salesByYear[year] = { jp_sales: 0, na_sales: 0, pal_sales: 0 };
        releasesByYear[year] = new Set();
    });

    games.forEach(game => {
        if (!game.year) return;
        salesByYear[game.year].jp_sales += game.jp_sales;
        salesByYear[game.year].na_sales += game.na_sales;
        salesByYear[game.year].pal_sales += game.pal_sales;
        if (game.title) releasesByYear[game.year].add(game.title);
    });

    const zoomConfig = [
        { type: 'inside', start: 50, end: 100 },
        { type: 'slider', start: 50, end: 100, height: 20, bottom: 5 }
    ];

    charts.salesTimeline.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: regions.map(region => region.name) },
        grid: { left: 65, right: 30, bottom: 65 },
        dataZoom: zoomConfig,
        xAxis: { type: 'category', boundaryGap: false, data: years },
        yAxis: { type: 'value', name: 'Vendas (M)' },
        series: regions.map(region => ({
            name: region.name,
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: years.map(year => salesByYear[year][region.key])
        }))
    });

    const releasesData = years.map(year => releasesByYear[year].size);

    charts.releasesTimeline.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 65, right: 25, bottom: 65 },
        dataZoom: zoomConfig,
        xAxis: { type: 'category', data: years },
        yAxis: { type: 'value', name: 'Lançamentos' },
        series: [{ name: 'Lançamentos', type: 'bar', data: releasesData }]
    });

    charts.salesArea.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: regions.map(region => region.name), top: 0 },
        grid: { left: 65, right: 25, bottom: 65 },
        dataZoom: zoomConfig,
        xAxis: { type: 'category', boundaryGap: false, data: years },
        yAxis: { type: 'value', name: 'Vendas (M)' },
        series: regions.map(region => ({
            name: region.name,
            type: 'line',
            stack: 'total',
            areaStyle: {},
            smooth: true,
            showSymbol: false,
            data: years.map(year => salesByYear[year][region.key])
        }))
    });
}

window.addEventListener('resize', () => {
    Object.values(charts).forEach(chart => chart.resize());
});