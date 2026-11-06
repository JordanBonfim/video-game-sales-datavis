const statusElement = document.getElementById('status');

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

    renderRegionalCharts(validGames);
    renderTemporalCharts(validGames);
    renderGeoMap(validGames); // ficou feio mas ok
}

function renderGeoMap(games) { // nã tá sendo usado
    charts.geoMap.showLoading();

    // Configuração das regiões com suas coordenadas [Longitude, Latitude]
    const regionsConfig = {
        na: { name: 'América do Norte', center: [-100, 40], data: {} },
        pal: { name: 'Europa', center: [10, 50], data: {} },
        jp: { name: 'Japão', center: [138, 36], data: {} }
    };

    // Agrupa as vendas (talvez trocar game.genre por game.console ??? De acordo com o que vamos querendo)
    games.forEach(game => {
        const item = game.console; // game.console funciona
        if (!item || item === 'Unknown') return;
        
        regionsConfig.na.data[item] = (regionsConfig.na.data[item] || 0) + game.na_sales;
        regionsConfig.pal.data[item] = (regionsConfig.pal.data[item] || 0) + game.pal_sales;
        regionsConfig.jp.data[item] = (regionsConfig.jp.data[item] || 0) + game.jp_sales;
    });

    // Função auxiliar para pegar os Top 5 de cada região e formatar para a pizza
    function getTop5PieData(regionData) {
        return Object.entries(regionData)
            .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Limita a 5 fatias
    }

    // Carrega o GeoJSON do mapa mundial via CDN
    fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json')
        .then(response => response.json())
        .then(worldJson => {

            echarts.registerMap('world', worldJson);
            
            // pie para cada região
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
                    data: getTop5PieData(region.data)
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

    // Gráfico de Barras 
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

    // Gráfico Empilhado
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
                // posição do tooltip: [posição X, posição Y]
                position: function (point) {
                    // Mantém o X no mouse e joga o Y 20 pixels para baixo
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

    //Heatmap
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

    // Configuração padrão de DataZoom
    const zoomConfig = [
        { type: 'inside', start: 50, end: 100 }, 
        { type: 'slider', start: 50, end: 100, height: 20, bottom: 5 }
    ];

    charts.salesTimeline.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: regions.map(region => region.name) },
        grid: { left: 65, right: 30, bottom: 65 }, // Aumentado bottom para o slider
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