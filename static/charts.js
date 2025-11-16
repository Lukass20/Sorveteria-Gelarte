function renderStockChart() {
    const apiUrl = '/api/stock_flow_data';

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Erro de rede: ${response.status}`);
            }
            return response.json();
        })
        .then(stockData => {
            if (stockData && stockData.labels && stockData.labels.length > 0) {
                const ctx = document.getElementById('stockDoughnutChart').getContext('2d');

                const stockDoughnutChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: stockData.labels,
                        datasets: [{
                            label: 'Quantidade em Estoque',
                            data: stockData.values,
                            backgroundColor: stockData.colors,
                            borderColor: '#ffffff',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right', 
                            },
                            title: {
                                display: false,
                                text: 'Distribuição do Estoque por Tipo'
                            }
                        }
                    }
                });
            } else {
                showNoDataMessage();
            }
        })
        .catch(error => {
            console.error('Erro ao buscar dados do gráfico:', error);
            showNoDataMessage('Erro ao carregar os dados do gráfico.');
        });
}

function showNoDataMessage(message = 'Nenhum produto com quantidade positiva para mostrar no gráfico.') {
    const chartContainer = document.getElementById('stockDoughnutChart').closest('.chart-container');
    chartContainer.innerHTML = `<h2>Distribuição por Tipo</h2><p style="text-align: center; color: #888;">${message}</p>`;
}

renderStockChart();