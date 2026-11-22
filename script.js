const statusElement = document.getElementById('status');


let validGamesData = [];
let isRelativeMode = false; // false = Absoluto (Milhões) | true = Relativo (%)

const globalModeBtn = document.getElementById('globalModeBtn');
if (globalModeBtn) {
    globalModeBtn.addEventListener('click', () => {
        isRelativeMode = !isRelativeMode;
        globalModeBtn.textContent = isRelativeMode
            ? 'Modo: Proporção Relativa (%)'
            : 'Modo: Valores Absolutos (Milhões)';

        renderRegionalCharts(validGamesData);
        renderTemporalCharts(validGamesData);
    });
}


const charts = {
    regionalBar: echarts.init(document.getElementById('regionalBar')),
    regionalStacked: echarts.init(document.getElementById('regionalStacked')),
    regionalHeatmap: echarts.init(document.getElementById('regionalHeatmap')),
    salesTimeline: echarts.init(document.getElementById('salesTimeline')),
    releasesTimeline: echarts.init(document.getElementById('releasesTimeline')),
    salesArea: echarts.init(document.getElementById('salesArea')),
    geoMap: echarts.init(document.getElementById('geoMap'))
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
        // Remove o loading
        Object.values(charts).forEach(chart => chart.hideLoading());
        processData(result.data);
        statusElement.textContent = `${result.data.length.toLocaleString('pt-BR')} registros carregados.`;
    },
    error: (error) => {
        Object.values(charts).forEach(chart => chart.hideLoading());
        statusElement.textContent = 'Erro ao carregar o CSV.';
        console.error(error);
    }
});

function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getYear(date) {
    if (!date) return null;
    const match = date.trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!match) return null;
    const year = Number(match[3]);
    if (year < 1980 || year > 2024) return null;
    return year;
}

function processData(games) {
    const validGames = games.map(game => ({
        ...game,
        console: game.console?.trim() || 'Unknown', 
        genre: game.genre?.trim() || 'Unknown',
        title: game.title?.trim() || '',
        year: getYear(game.release_date),
        jp_sales: number(game.jp_sales),
        na_sales: number(game.na_sales),
        pal_sales: number(game.pal_sales),
        total_sales: number(game.total_sales)
    }));
    validGamesData = validGames;

    renderRegionalCharts(validGames);
    renderTemporalCharts(validGames);
    renderGeoMap(validGames); // ficou feio mas ok
}

function renderGeoMap(games) {
    const regionsConfig = [
        { key: 'na_sales', name: 'América do Norte', color: '#5470c6', childColor: '#8ea2dc' },
        { key: 'pal_sales', name: 'Europa', color: '#fac858', childColor: '#fce09b' },
        { key: 'jp_sales', name: 'Japão', color: '#91cc75', childColor: '#bce0aa' }
    ];

    const sunburstData = regionsConfig.map(region => {
        const salesByConsole = {};

        games.forEach(game => {
            const consoleName = game.console;
            if (!consoleName || consoleName === 'Unknown') return;
            salesByConsole[consoleName] = (salesByConsole[consoleName] || 0) + game[region.key];
        });

        const sortedConsoles = Object.entries(salesByConsole)
            .map(([name, value]) => ({
                name,
                value: Number(value.toFixed(2)),
                itemStyle: { color: region.childColor }
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);

        const topConsoles = sortedConsoles.slice(0, 8);
        const othersSum = sortedConsoles
            .slice(8)
            .reduce((sum, item) => sum + item.value, 0);

        if (othersSum > 0) {
            topConsoles.push({
                name: 'Outros',
                value: Number(othersSum.toFixed(2)),
                itemStyle: { color: region.childColor, opacity: 0.75 }
            });
        }

        return {
            name: region.name,
            itemStyle: { color: region.color },
            children: topConsoles
        };
    });

    charts.geoMap.setOption({
        tooltip: {
            trigger: 'item',
            formatter: params => {
                const value = Number(params.value || 0).toFixed(2);
                const treePathInfo = params.treePathInfo || [];
                const parent = treePathInfo[treePathInfo.length - 2];
                const parentVal = parent ? parent.value : 0;
                const pct = parentVal > 0 ? ((params.value / parentVal) * 100).toFixed(1) : '100.0';

                return `<strong>${params.name}</strong><br/>Vendas: ${value}M (${pct}%)`;
            }
        },
        series: [{
            type: 'sunburst',
            data: sunburstData,
            radius: ['18%', '92%'],
            center: ['50%', '50%'],
            sort: undefined,
            emphasis: { focus: 'ancestor' },
            levels: [
                {},
                {
                    r0: '18%',
                    r: '48%',
                    itemStyle: { borderWidth: 2, borderColor: '#fff' },
                    label: {
                        rotate: 'tangential',
                        fontWeight: 'bold',
                        fontSize: 12
                    }
                },
                {
                    r0: '48%',
                    r: '92%',
                    itemStyle: { borderWidth: 1.5, borderColor: '#fff' },
                    label: {
                        align: 'right',
                        fontSize: 11
                    }
                }
            ]
        }]
    }, true);
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

    // Calcula o total de vendas de cada região para poder gerar as porcentagens
    const totalsByRegion = {};
    regions.forEach(region => {
        totalsByRegion[region.key] = genres.reduce(
            (sum, genre) => sum + salesByGenre[genre][region.key], 0
        );
    });

    // Função auxiliar que devolve o valor em Milhões ou em % dependendo do botão
    const getMetricValue = (genre, regionKey) => {
        const rawValue = salesByGenre[genre][regionKey];
        if (!isRelativeMode) return Number(rawValue.toFixed(2));
        
        const total = totalsByRegion[regionKey];
        return total > 0 ? Number(((rawValue / total) * 100).toFixed(2)) : 0;
    };

    // Ordena os gêneros (no modo relativo, ordena pela média das porcentagens para ficar justo)
    const sortedGenres = [...genres].sort((a, b) => {
        const sumA = regions.reduce((sum, r) => sum + getMetricValue(a, r.key), 0);
        const sumB = regions.reduce((sum, r) => sum + getMetricValue(b, r.key), 0);
        return sumB - sumA;
    });

    const unitSuffix = isRelativeMode ? '%' : 'M';

    // 1. Gráfico de Barras
    // 1. Gráfico de Barras
    charts.regionalBar.setOption({
        tooltip: { 
            trigger: 'axis', 
            axisPointer: { type: 'shadow' },
            valueFormatter: value => `${value.toFixed(2)}${unitSuffix}`
        },
        legend: { data: regions.map(region => region.name) },
        grid: { left: 60, right: 25, bottom: 95 }, // aumente um pouco o bottom se algum nome longo cortar embaixo
        xAxis: { 
            type: 'category', 
            data: sortedGenres, 
            axisLabel: { 
                interval: 0, // <-- Força a exibição de todos os rótulos
                rotate: 35 
            } 
        },
        yAxis: { 
            type: 'value', 
            name: isRelativeMode ? 'Participação na Região (%)' : 'Vendas (Milhões)',
            axisLabel: { formatter: isRelativeMode ? '{value}%' : '{value}' }
        },
        series: regions.map(region => ({
            name: region.name,
            type: 'bar',
            data: sortedGenres.map(genre => getMetricValue(genre, region.key))
        }))
    });

    // 2. Gráfico Empilhado (mantém o seu código original intacto)
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
                        const percent = total > 0 ? (salesByGenre[genre][region.key] / total * 100) : 0;
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

    // 3. Heatmap (agora responde ao botão também!)
    const heatmapData = [];
    sortedGenres.forEach((genre, genreIndex) => {
        regions.forEach((region, regionIndex) => {
            heatmapData.push([regionIndex, genreIndex, getMetricValue(genre, region.key)]);
        });
    });

    const maxHeatmapValue = Math.max(...heatmapData.map(item => item[2]), 1);

    charts.regionalHeatmap.setOption({
        tooltip: {
            position: 'top',
            formatter: params => {
                const region = regions[params.data[0]].name;
                const genre = sortedGenres[params.data[1]];
                const val = params.data[2];
                return `${genre}<br>${region}: ${val.toFixed(2)}${isRelativeMode ? '% das vendas locais' : ' milhões'}`;
            }
        },
        grid: { left: 125, right: 30, bottom: 75 },
        xAxis: { 
            type: 'category', 
            data: regions.map(region => region.name),
            axisLabel: { 
                interval: 0, // Força exibir todas as regiões (colunas)
                fontSize: 11
            }
        },
        yAxis: { 
            type: 'category', 
            data: sortedGenres, 
            inverse: true,
            axisLabel: { 
                interval: 0, // Garante que nenhum gênero (linha) suma também
                fontSize: 11
            }
        },
        visualMap: {
            min: 0,
            max: maxHeatmapValue,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 5,
            inRange: { color: ['#f7f7f7', '#6baed6', '#08519c', '#08306b'] }
        },
        series: [{
            type: 'heatmap',
            data: heatmapData,
            label: { 
                show: true, 
                formatter: params => isRelativeMode ? `${params.data[2]}%` : params.data[2] 
            },
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

    // Configuração padrão de DataZoom
    const zoomConfig = [
        { type: 'inside', start: 50, end: 100 }, 
        { type: 'slider', start: 50, end: 100, height: 20, bottom: 5 }
    ];

    // Calcula o total global de cada ano para poder gerar a porcentagem
    const totalGlobalByYear = {};
    years.forEach(year => {
        totalGlobalByYear[year] = regions.reduce(
            (sum, region) => sum + salesByYear[year][region.key], 0
        );
    });

    const getTemporalValue = (year, regionKey) => {
        const raw = salesByYear[year][regionKey];
        if (!isRelativeMode) return Number(raw.toFixed(2));

        const totalYear = totalGlobalByYear[year];
        return totalYear > 0 ? Number(((raw / totalYear) * 100).toFixed(2)) : 0;
    };

    charts.salesTimeline.setOption({
        tooltip: { 
            trigger: 'axis',
            valueFormatter: value => `${value.toFixed(2)}${isRelativeMode ? '%' : 'M'}`
        },
        legend: { data: regions.map(region => region.name) },
        grid: { left: 65, right: 30, bottom: 65 },
        dataZoom: zoomConfig,
        xAxis: { type: 'category', boundaryGap: false, data: years },
        yAxis: { 
            type: 'value', 
            name: isRelativeMode ? 'Fatia Global (%)' : 'Vendas (M)',
            max: isRelativeMode ? 100 : null,
            axisLabel: { formatter: isRelativeMode ? '{value}%' : '{value}' }
        },
        series: regions.map(region => ({
            name: region.name,
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: years.map(year => getTemporalValue(year, region.key))
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