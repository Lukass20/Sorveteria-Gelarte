/**
 * Arquivo charts.js
 * Lógica para buscar dados de forma assíncrona na rota de API do Flask
 * e renderizar o gráfico de estoque na página inicial (index.html).
 * Depende da biblioteca Chart.js.
 */

// Função principal para buscar os dados e renderizar o gráfico
function renderStockChart() {
    // 1. Define a URL da nossa nova rota de API
    const apiUrl = '/api/stock_flow_data';

    // 2. Faz a requisição assíncrona (FETCH)
    fetch(apiUrl)
        .then(response => {
            // Verifica se a resposta foi bem-sucedida (status 200)
            if (!response.ok) {
                // Se for 401 (Unauthorized) ou outro erro, lança um erro
                throw new Error(`Erro de rede: ${response.status}`);
            }
            // Converte a resposta para JSON (que é o dicionário do Python)
            return response.json();
        })
        .then(stockData => {
            // 3. Processa os dados recebidos
            if (stockData && stockData.labels && stockData.labels.length > 0) {
                const ctx = document.getElementById('stockDoughnutChart').getContext('2d');
                
                // 4. Desenha o gráfico
                const stockDoughnutChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: stockData.labels,
                        datasets: [{
                            label: 'Quantidade em Estoque',
                            data: stockData.values,
                            backgroundColor: stockData.colors,
                            borderColor: '#ffffff', // Borda branca para separação
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
                // 5. Caso não haja dados para o gráfico
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


// Chama a função para renderizar o gráfico quando o script é executado (no final do body)
// Isso garante que o elemento <canvas> já está disponível no DOM.
renderStockChart();