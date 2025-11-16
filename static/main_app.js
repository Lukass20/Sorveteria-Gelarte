// --- Constantes e Estado Global ---
const ROOT_DIV = document.getElementById('content-area'); 
const USER_ROLE = 'ADMIN'; 
const ALERT_THRESHOLD = 10;
const CRITICAL_THRESHOLD = 3;

// --- UTILS: Funções de Comunicação e Helpers ---

const apiFetch = async (url, options = {}) => {
    const defaultHeaders = {'Content-Type': 'application/json'};
    const response = await fetch(url, {
        ...options,
        headers: {...defaultHeaders, ...options.headers}
    });

    if (response.status === 401) {
        console.warn("Sessão expirada ou não autorizada. Redirecionando para o Login.");
        window.location.href = '/login';
        return; 
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro de rede ou servidor.' }));
        throw new Error(error.error || `Erro HTTP ${response.status}`);
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {};
    }

    return response.json();
};

const formatCurrency = (value) => `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;

const navigateTo = (view, extra = {}) => {
    let hash = `#${view}`;
    if (extra.id) {
        hash += `/${extra.id}`;
    }
    // Dispara o evento hashchange, que chama o router
    window.location.hash = hash; 
    if (document.readyState === 'complete') {
        router();
    }
};

const setBgImage = (isDashboard) => {
    if (isDashboard) {
        ROOT_DIV.classList.add('content-area');
    } else {
        ROOT_DIV.classList.remove('content-area');
    }
}

// --- FUNÇÕES DE UI / ROTEAMENTO DA BARRA HORIZONTAL ---

// Define as cores dos botões para saber qual classe remover/adicionar
const routeColors = {
    'home': 'bg-pink-500', 
    'dashboard': 'bg-blue-500', 
    'relatorios': 'bg-blue-500',
    'registrar_venda': 'bg-green-500',
    'registrar_entrada': 'bg-yellow-600',
    'cadastrar_produto': 'bg-yellow-400',
    'usuarios': 'bg-gray-500'
};

const setActiveNavButton = (activeRoute) => {
    // 1. Remove a cor ativa de todos e restaura a cor original
    document.querySelectorAll('.nav-button[data-route]').forEach(btn => {
        const route = btn.getAttribute('data-route');
        
        // Remove classes de ativação e hover genéricas
        btn.classList.remove('bg-opacity-80', 'hover:bg-opacity-80'); 
        
        // Remove a cor ativa atual e restaura a cor de hover original
        if (routeColors[route]) {
            // Garante que o hover original seja restaurado (ex: hover:bg-green-600)
            btn.className = btn.className.replace(/hover:bg-opacity-\d+/g, `hover:${routeColors[route].replace('500', '600')}`);
        }
    });

    // 2. Aplica o estado ativo no botão correto
    const activeButton = document.querySelector(`.nav-button[data-route="${activeRoute}"]`);
    if (activeButton) {
        // Aplica o estado visual de 'ativo' (ex: levemente mais escuro)
        activeButton.classList.add('bg-opacity-80', 'hover:bg-opacity-80');
        
        // Remove a classe de hover escura para que o hover não mude (já está no estado ativo)
        const originalColor = routeColors[activeRoute];
        if (originalColor) {
             // Remove a classe de hover escura ex: hover:bg-blue-600
             activeButton.className = activeButton.className.replace(/hover:bg-\w+-\d+/g, 'hover:bg-opacity-80');
        }
    }
};

const handleLogout = async () => {
    if (!confirm('Tem certeza que deseja sair do sistema?')) return;
    try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (e) {
        console.error("Erro ao tentar sair:", e.message);
        alert("Erro ao tentar sair: " + e.message);
    }
};

// --- VIEWS (Funções que Renderizam as Telas) ---

/**
 * SIMULAÇÃO DE DADOS PARA VENDAS (PDV)
 */
const getProductsForSale = async () => {
    // Simulação de produtos disponíveis para venda
    await new Promise(resolve => setTimeout(resolve, 300)); // Simula delay da API
    return [
        { id: 101, name: 'Sorvete Baunilha (Litro)', price: 22.50, category: 'Sorvetes' },
        { id: 102, name: 'Sorvete Morango (Litro)', price: 23.90, category: 'Sorvetes' },
        { id: 103, name: 'Sorvete Chocolate (Litro)', price: 24.90, category: 'Sorvetes' },
        { id: 104, name: 'Açaí 500ml', price: 18.00, category: 'Açaís' },
        { id: 105, name: 'Casquinha', price: 3.50, category: 'Adicionais' },
        { id: 106, name: 'Cobertura Chocolate', price: 2.00, category: 'Adicionais' },
        { id: 107, name: 'Picolé Limão', price: 4.50, category: 'Picolés' },
        { id: 108, name: 'Milkshake Morango', price: 15.00, category: 'Bebidas' },
        { id: 109, name: 'Copo Descartável', price: 0.50, category: 'Insumos' },
    ];
};

/**
 * ESTADO DO CARRINHO (Variável global apenas para esta View)
 */
let carrinho = [];
let todosProdutos = []; // Armazenará a lista completa de produtos

/**
 * FUNÇÕES AUXILIARES DO PDV
 */

const addToCart = (productId) => {
    const product = todosProdutos.find(p => p.id === productId);
    if (!product) return;

    const existingItemIndex = carrinho.findIndex(item => item.id === productId);

    if (existingItemIndex > -1) {
        carrinho[existingItemIndex].quantity += 1;
    } else {
        carrinho.push({ ...product, quantity: 1 });
    }
    updateCartDisplay();
};

const updateItemQuantity = (productId, newQuantity) => {
    const existingItemIndex = carrinho.findIndex(item => item.id === productId);

    if (existingItemIndex > -1) {
        if (newQuantity <= 0) {
            carrinho.splice(existingItemIndex, 1); // Remove se a quantidade for zero ou menor
        } else {
            carrinho[existingItemIndex].quantity = newQuantity;
        }
    }
    updateCartDisplay();
};

const removeItem = (productId) => {
    carrinho = carrinho.filter(item => item.id !== productId);
    updateCartDisplay();
};

const calculateTotal = () => {
    return carrinho.reduce((total, item) => total + (item.price * item.quantity), 0);
};

const updateCartDisplay = () => {
    const cartList = document.getElementById('cart-list');
    const cartTotal = document.getElementById('cart-total');

    if (!cartList || !cartTotal) return; // Garante que a DOM está carregada

    let cartHTML = '';
    if (carrinho.length === 0) {
        cartHTML = '<p class="text-gray-500 italic p-4 text-center">Nenhum item adicionado ao carrinho.</p>';
    } else {
        cartHTML = carrinho.map(item => `
            <div class="flex items-center justify-between p-3 border-b hover:bg-green-50">
                <div class="flex-grow">
                    <p class="font-semibold text-gray-800">${item.name}</p>
                    <p class="text-sm text-gray-600">${formatCurrency(item.price)}</p>
                </div>
                
                <div class="flex items-center space-x-2 mx-4">
                    <button onclick="updateItemQuantity(${item.id}, ${item.quantity - 1})" class="bg-red-400 text-white w-6 h-6 rounded-full text-sm hover:bg-red-500">-</button>
                    <span class="font-bold w-6 text-center">${item.quantity}</span>
                    <button onclick="updateItemQuantity(${item.id}, ${item.quantity + 1})" class="bg-green-400 text-white w-6 h-6 rounded-full text-sm hover:bg-green-500">+</button>
                </div>

                <div class="text-right flex items-center">
                    <span class="font-bold text-lg text-green-700 w-20">${formatCurrency(item.price * item.quantity)}</span>
                    <button onclick="removeItem(${item.id})" class="text-red-500 ml-4 hover:text-red-700">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    cartList.innerHTML = cartHTML;
    cartTotal.textContent = formatCurrency(calculateTotal());

    // Habilita/desabilita o botão de finalizar venda
    const btnFinalizar = document.getElementById('btn-finalizar-venda');
    if (btnFinalizar) {
        btnFinalizar.disabled = carrinho.length === 0;
        btnFinalizar.classList.toggle('bg-green-700', carrinho.length > 0);
        btnFinalizar.classList.toggle('bg-gray-400', carrinho.length === 0);
    }
};

const handleFinalizarVenda = async () => {
    if (carrinho.length === 0) {
        alert("O carrinho está vazio. Adicione produtos para finalizar a venda.");
        return;
    }

    if (!confirm(`Confirmar venda no valor total de ${formatCurrency(calculateTotal())}?`)) return;

    try {
        // Objeto de dados para envio (simulação)
        const saleData = {
            items: carrinho.map(item => ({ 
                product_id: item.id, 
                quantity: item.quantity, 
                price_sold: item.price // Preço unitário da venda
            })),
            total_amount: calculateTotal()
        };

        console.log("Dados da Venda Enviados:", saleData);

        // --- CHAMADA API REAL (Simulada) ---
        // const result = await apiFetch('/api/vendas', { method: 'POST', body: JSON.stringify(saleData) });

        alert(`Venda de ${formatCurrency(saleData.total_amount)} registrada com sucesso!`);
        carrinho = []; // Limpa o carrinho
        updateCartDisplay();
        navigateTo('home'); // Volta para a tela inicial
        
    } catch (e) {
        console.error("Erro ao registrar venda:", e.message);
        alert("Erro ao registrar venda: " + e.message);
    }
};

/**
 * RENDERIZAÇÃO REGISTRAR NOVA VENDA (PDV)
 */
const renderRegistrarVenda = async () => {
    setActiveNavButton('registrar_venda');
    setBgImage(false);
    ROOT_DIV.innerHTML = '<div class="p-6 bg-white rounded-lg shadow-md col-span-2"><i class="fas fa-spinner fa-spin text-2xl text-green-500"></i> Carregando PDV e produtos...</div>';

    try {
        // Zera o carrinho ao iniciar a tela (ou carrega de um estado salvo, se houvesse)
        carrinho = []; 
        todosProdutos = await getProductsForSale();

        // Agrupar produtos por categoria
        const groupedProducts = todosProdutos.reduce((acc, product) => {
            (acc[product.category] = acc[product.category] || []).push(product);
            return acc;
        }, {});

        let productCatalogHTML = '';

        for (const category in groupedProducts) {
            const cards = groupedProducts[category].map(p => `
                <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition duration-200">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">${p.name}</h3>
                    </div>
                    <div class="mt-3 flex justify-between items-center">
                        <span class="text-xl font-extrabold text-green-600">${formatCurrency(p.price)}</span>
                        <button onclick="addToCart(${p.id})" class="bg-green-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-green-600 transition duration-200 flex items-center">
                            <i class="fas fa-cart-plus mr-2"></i> Adicionar
                        </button>
                    </div>
                </div>
            `).join('');

            productCatalogHTML += `
                <h3 class="text-xl font-extrabold text-green-600 mt-6 mb-3">${category}</h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${cards}
                </div>
            `;
        }


        ROOT_DIV.innerHTML = `
            <div class="grid grid-cols-3 gap-6 h-full p-4">
                
                <div class="col-span-2 bg-white rounded-lg shadow-xl p-6 overflow-y-auto" style="height: calc(100vh - 100px);">
                    <h2 class="text-2xl font-extrabold text-green-700 border-b-2 border-green-500 pb-2 mb-4 flex items-center">
                        <i class="fas fa-cubes mr-2"></i> Catálogo de Produtos
                    </h2>
                    ${productCatalogHTML}
                </div>

                <div class="col-span-1 flex flex-col bg-white rounded-lg shadow-xl">
                    <div class="p-6 border-b">
                        <h2 class="text-2xl font-extrabold text-gray-800 flex items-center">
                            <i class="fas fa-shopping-basket mr-2"></i> Carrinho
                        </h2>
                    </div>
                    
                    <div id="cart-list" class="flex-grow overflow-y-auto" style="min-height: 200px;">
                        </div>

                    <div class="p-6 border-t border-gray-200 bg-gray-50">
                        <div class="flex justify-between items-center mb-4">
                            <span class="text-xl font-bold text-gray-700">Total:</span>
                            <span id="cart-total" class="text-3xl font-extrabold text-green-800">R$ 0,00</span>
                        </div>
                        <button id="btn-finalizar-venda" onclick="handleFinalizarVenda()" disabled 
                                class="w-full py-3 text-lg font-extrabold text-white rounded-lg shadow-lg transition duration-200">
                            <i class="fas fa-check-circle mr-2"></i> Finalizar Venda
                        </button>
                    </div>
                </div>

            </div>
        `;
        // Garante que o display inicial do carrinho seja renderizado (vazio)
        updateCartDisplay(); 

    } catch (e) {
        ROOT_DIV.innerHTML = `<div class="p-6 bg-white rounded-lg shadow-md text-red-600 col-span-2">Erro ao carregar o PDV: ${e.message}</div>`;
    }
};

const renderUsuarios = async () => {
    // 1. Define o botão ativo na barra de navegação
    setActiveNavButton('usuarios'); 
    setBgImage(false); // Remove imagem de fundo para telas com tabelas/formulários

    ROOT_DIV.innerHTML = '<div class="p-6 bg-white rounded-lg shadow-md"><i class="fas fa-spinner fa-spin text-2xl text-gray-500"></i> Carregando Gerenciamento de Usuários...</div>';

    try {
        // --- SIMULAÇÃO DE DADOS (Substitua por apiFetch('/api/usuarios') real) ---
        const usersData = [
            { id: 1, name: 'Admin Padrão', email: 'admin@gelarte.com', access_type: 'Administrador', created_at: '2023-01-01' },
            { id: 2, name: 'Maria Oliveira', email: 'maria.o@gelarte.com', access_type: 'Vendedor', created_at: '2024-03-10' },
            { id: 3, name: 'João Silva', email: 'joao.s@gelarte.com', access_type: 'Vendedor', created_at: '2024-05-20' },
        ];
        // ----------------------------------------------------------------------

        const userRows = usersData.map(user => `
            <tr class="hover:bg-gray-50">
                <td class="py-3 px-4 border-b text-sm font-medium">${user.id}</td>
                <td class="py-3 px-4 border-b text-sm">${user.name}</td>
                <td class="py-3 px-4 border-b text-sm">${user.email}</td>
                <td class="py-3 px-4 border-b text-sm font-semibold">${user.access_type}</td>
                <td class="py-3 px-4 border-b">
                    <button onclick="editUser(${user.id})" class="btn btn-sm btn-info bg-blue-500 text-white hover:bg-blue-600 mr-2 py-1 px-3 rounded text-xs">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button onclick="deleteUser(${user.id})" class="btn btn-sm btn-danger bg-red-500 text-white hover:bg-red-600 py-1 px-3 rounded text-xs">
                        <i class="fas fa-trash-alt"></i> Excluir
                    </button>
                </td>
            </tr>
        `).join('');

        ROOT_DIV.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-xl container-content">
                <header class="border-b-2 border-gray-500 pb-3 mb-6">
                    <h1 class="text-3xl font-extrabold text-gray-800 flex items-center">
                        <i class="fas fa-user-friends text-3xl mr-3 text-gray-500"></i> Gerenciamento de Usuários
                    </h1>
                    <p class="text-gray-600 mt-1">Tela exclusiva para administradores gerenciarem as contas de funcionários.</p>
                </header>
                
                <div class="action-bar mb-6 flex justify-between items-center">
                    <button onclick="navigateTo('cadastrar_usuario')" class="btn btn-green bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-300">
                        <i class="fas fa-user-plus mr-1"></i> Adicionar Novo Usuário
                    </button>
                    </div>

                <div class="overflow-x-auto user-table-container">
                    <table class="min-w-full bg-white border border-gray-200 rounded-lg table table-striped">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">ID</th>
                                <th class="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Nome</th>
                                <th class="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">E-mail</th>
                                <th class="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Tipo de Acesso</th>
                                <th class="py-3 px-4 border-b text-left text-sm font-semibold text-gray-600">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${userRows}
                        </tbody>
                    </table>
                </div>

            </div>
        `;

    } catch (e) {
        ROOT_DIV.innerHTML = `<div class="p-6 bg-white rounded-lg shadow-md text-red-600">Erro ao carregar usuários: ${e.message}</div>`;
    }
};

// ... (Você também precisará criar as funções de ação: editUser e deleteUser) ...
const editUser = (userId) => {
    // Implemente a navegação para a tela de edição do usuário
    navigateTo('cadastrar_usuario', { id: userId });
};

const deleteUser = async (userId) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR o usuário #${userId}?`)) return;
    try {
        // await apiFetch(`/api/usuarios/${userId}`, { method: 'DELETE' }); // CHAMADA API REAL
        console.log(`Usuário ${userId} excluído (simulação).`);
        renderUsuarios(); // Recarrega a lista
        alert('Usuário excluído com sucesso!');
    } catch (e) {
        alert("Erro ao excluir usuário: " + e.message);
    }
};

/**
 * RENDERIZAÇÃO DO DASHBOARD (VISÃO GRÁFICA)
 */
const setupCharts = (estoqueData, vendasData, topVendasData, movimentacaoData) => {
    // Gráfico de Estoque (Rosca)
    const ctxEstoque = document.getElementById('estoqueChart');
    if (ctxEstoque) {
        new Chart(ctxEstoque, { 
            type: 'doughnut', 
            data: estoqueData, 
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    }

    // Gráfico de Vendas (Linha/Barra)
    const ctxVendas = document.getElementById('vendasChart');
    if (ctxVendas) {
        new Chart(ctxVendas, {
            type: 'bar',
            data: vendasData,
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Vendas (R$)' } },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Ticket Médio (R$)' } }
                }
            }
        });
    }

    // Gráfico Top Vendas (Barra Horizontal)
    const ctxTopVendas = document.getElementById('topVendasChart');
    if (ctxTopVendas) {
        new Chart(ctxTopVendas, { 
            type: 'bar', 
            data: topVendasData, 
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } } 
        });
    }

    // Gráfico Movimentação (Linha)
    const ctxMovimentacao = document.getElementById('movimentacaoChart');
    if (ctxMovimentacao) {
        new Chart(ctxMovimentacao, { 
            type: 'line', 
            data: movimentacaoData, 
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    }
};

const renderDashboard = async () => {
    setActiveNavButton('dashboard');
    setBgImage(true); // Manter imagem de fundo para o Dashboard (Gráficos)
    ROOT_DIV.innerHTML = '<div class="p-6 bg-white rounded-lg shadow-md"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i> Gerando gráficos de desempenho...</div>';

    try {
        // --- SIMULAÇÃO DE DADOS PARA GRÁFICOS ---
        const estoqueData = {
            labels: ['Sorvetes', 'Coberturas', 'Descartáveis'],
            datasets: [{
                label: 'Quantidade em Estoque',
                data: [15, 8, 14],
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
                borderWidth: 0
            }]
        };
        const vendasData = {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'],
            datasets: [{
                label: 'Vendas Mensais (R$)',
                data: [1200, 1900, 3000, 1500, 2200],
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                type: 'line', fill: false, yAxisID: 'y'
            },
            {
                label: 'Ticket Médio (R$)',
                data: [15, 18, 20, 16, 19],
                backgroundColor: 'rgba(153, 102, 255, 0.7)',
                borderColor: 'rgba(153, 102, 255, 1)',
                type: 'bar', yAxisID: 'y1'
            }]
        };
        const topVendasData = {
            labels: ['Açaí', 'Sorvete Morango', 'Picolé Limão', 'Casquinha', 'Milkshake Chocolate'],
            datasets: [{
                label: 'Unidades Vendidas',
                data: [150, 120, 90, 80, 75],
                backgroundColor: 'rgba(255, 99, 132, 0.8)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        };
        const movimentacaoData = {
            labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
            datasets: [
                { label: 'Entradas', data: [250, 300, 200, 350], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.2)', fill: true },
                { label: 'Saídas', data: [150, 250, 180, 280], borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.2)', fill: true }
            ]
        };
        // --------------------------------------------------------

        ROOT_DIV.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-xl">
                <header class="border-b-2 border-blue-500 pb-3 mb-6">
                    <h1 class="text-3xl font-extrabold text-gray-800 flex items-center">
                        <i class="fas fa-chart-pie text-3xl mr-3 text-blue-500"></i> Dashboard: Visão Gráfica de Desempenho
                    </h1>
                </header>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="bg-gray-50 p-4 rounded-lg shadow-inner">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Estoque por Tipo de Produto</h3>
                        <canvas id="estoqueChart" width="400" height="400"></canvas>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg shadow-inner">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Vendas Mensais (R$ e Ticket Médio)</h3>
                        <canvas id="vendasChart" width="400" height="400"></canvas>
                    </div>
                </div>

                <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="bg-gray-50 p-4 rounded-lg shadow-inner">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Top 5 Itens Mais Vendidos</h3>
                        <canvas id="topVendasChart" width="400" height="400"></canvas>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg shadow-inner">
                        <h3 class="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Entradas vs Saídas (Últimos 30 dias)</h3>
                        <canvas id="movimentacaoChart" width="400" height="400"></canvas>
                    </div>
                </div>
                
            </div>
        `;
        
        setupCharts(estoqueData, vendasData, topVendasData, movimentacaoData);

    } catch (e) {
        ROOT_DIV.innerHTML = `<div class="p-6 bg-white rounded-lg shadow-md text-red-600">Erro ao carregar o dashboard: ${e.message}</div>`;
    }
};

/**
 * RENDERIZAÇÃO DA TELA INÍCIO (VISÃO TÁTICA / METRICAS)
 */
const renderHome = async () => {
    setActiveNavButton('home');
    setBgImage(true); // Mantém a imagem de fundo para o Início/Home
    ROOT_DIV.innerHTML = '<div class="p-6 bg-white rounded-lg shadow-md"><i class="fas fa-spinner fa-spin text-2xl text-pink-500"></i> Carregando visão tática...</div>';
    
    try {
        // --- SIMULAÇÃO DE DADOS (Substitua por apiFetch real) ---
        const stats = {
            total_produtos_estoque: 37,
            total_vendas_mes: 165.00,
            alertas_estoque: 3,
            necessidade_compra: 12
        };
        const products = [
            { id: 1, name: 'Picolé Limão', quantity: 8, type: 'Picolé', avg_sale: 15 },
            { id: 2, name: 'Casquinha', quantity: 4, type: 'Acessório', avg_sale: 50 },
            { id: 3, name: 'Copo Descartável', quantity: 2, type: 'Insumo', avg_sale: 10 },
            { id: 4, name: 'Sorvete Baunilha', quantity: 12, type: 'Sorvete', avg_sale: 5 }
        ]; 
        // --------------------------------------------------------
        
        // Filtra e prepara dados para a lista de alerta (apenas itens abaixo do ALERT_THRESHOLD)
        const lowStockAlerts = products.filter(p => p.quantity <= ALERT_THRESHOLD);

        const alertRows = lowStockAlerts.map(p => {
            // Nota: ALERT_THRESHOLD e CRITICAL_THRESHOLD devem ser definidos como constantes globais.
            const statusClass = p.quantity <= CRITICAL_THRESHOLD ? 'bg-red-200 border-red-400' : 'bg-yellow-100 border-yellow-300';
            const textColor = p.quantity <= CRITICAL_THRESHOLD ? 'text-red-800' : 'text-yellow-800';

            return `
                <div class="flex justify-between items-center ${statusClass} p-3 rounded border">
                    <span class="font-medium ${textColor}">${p.name}</span>
                    <span class="text-sm ${textColor}">Qtd Atual: <span class="font-bold">${p.quantity}</span></span>
                    <button onclick="navigateTo('registrar_entrada', {id: ${p.id}})" class="text-white bg-blue-500 px-3 py-1 rounded hover:bg-blue-600 text-sm">Repor</button>
                </div>
            `;
        }).join('');
        
        const alertsContainer = lowStockAlerts.length > 0 ? alertRows : 
            `<p class="text-center p-4 text-gray-500 italic">Nenhum alerta de estoque baixo no momento. Tudo ok!</p>`;

        ROOT_DIV.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-xl">
                <header class="border-b-2 border-pink-500 pb-3 mb-6">
                    <h1 class="text-3xl font-extrabold text-gray-800 flex items-center">
                        <i class="fas fa-home text-3xl mr-3 text-pink-500"></i> Início: Visão Rápida e Tática
                    </h1>
                </header>
                
                <h2 class="text-xl font-bold text-gray-700 mb-4 border-b pb-2">Resumo de Indicadores Chave</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div class="bg-blue-100 p-4 rounded-lg shadow-sm">
                        <p class="text-sm text-blue-800 font-semibold">Total de Produtos em Estoque</p>
                        <p class="text-3xl font-bold text-blue-900 mt-1">${stats.total_produtos_estoque}</p>
                    </div>
                    <div class="bg-green-100 p-4 rounded-lg shadow-sm">
                        <p class="text-sm text-green-800 font-semibold">Vendas (Mês Simulado)</p>
                        <p class="text-3xl font-bold text-green-700 mt-1">${formatCurrency(stats.total_vendas_mes)}</p>
                    </div>
                    <div class="bg-red-100 p-4 rounded-lg shadow-sm">
                        <p class="text-sm text-red-800 font-semibold">Alertas de Estoque Baixo</p>
                        <p class="text-3xl font-bold text-red-700 mt-1">${lowStockAlerts.length}</p>
                    </div>
                </div>

                <div class="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-md mb-8">
                    <h2 class="text-xl font-bold text-red-700 mb-4 flex items-center">
                        <i class="fas fa-exclamation-triangle mr-2"></i> Itens que Requerem Atenção
                    </h2>
                    <div class="space-y-2">
                        ${alertsContainer}
                    </div>
                </div>
                
                </div>
        `;
        
    } catch (e) {
        ROOT_DIV.innerHTML = `<div class="p-6 bg-white rounded-lg shadow-md text-red-600">Erro ao carregar a tela inicial: ${e.message}</div>`;
    }
};

/**
 * RENDERIZAÇÃO DE RELATÓRIOS (TABELAS DE ESTOQUE/MOVIMENTAÇÃO)
 */
const renderRelatorios = async () => {
    setActiveNavButton('relatorios');
    setBgImage(false); 
    ROOT_DIV.innerHTML = '<div class="p-6 bg-white rounded-lg shadow-md"><i class="fas fa-spinner fa-spin text-2xl text-blue-500"></i> Carregando relatórios gerenciais...</div>';
    
    try {
        // ... (Lógica de simulação de dados de relatórios e tabelas) ...
        const productsData = [
             { name: 'Sorvete de Morango', category: 'Sorvetes', quantity: 12, last_in: '+100 (10/05)', last_out: '-5 (Hoje)', is_critical: false },
             { name: 'Copo Descartável 300ml', category: 'Descartáveis', quantity: 2, last_in: '+500 (01/05)', last_out: '-15 (Hoje)', is_critical: true },
        ]; 
        
        const tableRows = productsData.map(p => `
            <tr class="hover:bg-gray-50 ${p.is_critical ? 'bg-red-50' : ''}">
                <td class="py-2 px-4 border-b">${p.name}</td>
                <td class="py-2 px-4 border-b">${p.category}</td>
                <td class="py-2 px-4 border-b font-bold ${p.is_critical ? 'text-red-700' : ''}">${p.quantity}</td>
                <td class="py-2 px-4 border-b text-green-600">${p.last_in}</td>
                <td class="py-2 px-4 border-b text-red-600">${p.last_out}</td>
            </tr>
        `).join('');

        ROOT_DIV.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-xl">
                <header class="border-b-2 border-blue-500 pb-3 mb-6">
                    <h1 class="text-3xl font-extrabold text-gray-800 flex items-center">
                        <i class="fas fa-file-alt text-3xl mr-3 text-blue-500"></i> Relatórios Operacionais e Gerenciais
                    </h1>
                </header>
                
                <h2 class="text-2xl font-extrabold text-gray-800 border-b-2 border-gray-400 pb-2 mb-4 flex items-center">
                    <i class="fas fa-boxes mr-2 text-gray-500"></i> Estoque e Movimentação (Entradas/Saídas)
                </h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Produto</th>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Categoria</th>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Qtd Atual</th>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Última Entrada</th>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Última Saída</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>

                <h2 class="text-2xl font-extrabold text-gray-800 border-b-2 border-gray-400 pb-2 mt-8 mb-4 flex items-center">
                    <i class="fas fa-chart-line mr-2 text-gray-500"></i> Relatório de Vendas (Últimos 30 Dias)
                </h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Data da Venda</th>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Total (R$)</th>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Itens</th>
                                <th class="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Operador</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="hover:bg-gray-50">
                                <td class="py-2 px-4 border-b">15/11/2025 15:30</td>
                                <td class="py-2 px-4 border-b font-bold text-green-700">${formatCurrency(45.50)}</td>
                                <td class="py-2 px-4 border-b">3</td>
                                <td class="py-2 px-4 border-b">João P.</td>
                            </tr>
                            <tr class="hover:bg-gray-50">
                                <td class="py-2 px-4 border-b">15/11/2025 10:15</td>
                                <td class="py-2 px-4 border-b font-bold text-green-700">${formatCurrency(18.00)}</td>
                                <td class="py-2 px-4 border-b">1</td>
                                <td class="py-2 px-4 border-b">Maria C.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        `;
        
    } catch (e) {
        ROOT_DIV.innerHTML = `<div class="p-6 bg-white rounded-lg shadow-md text-red-600">Erro ao carregar relatórios: ${e.message}</div>`;
    }
};


const renderCadastrarProduto = (id) => {
    setActiveNavButton('cadastrar_produto');
    setBgImage(false);
    // Conteúdo HTML para cadastro/edição
    ROOT_DIV.innerHTML = `
        <div class="p-6 bg-white rounded-lg shadow-md" style="max-width: 800px; margin: 0 auto;">
            <header class="border-b-2 border-yellow-400 pb-3 mb-6">
                <h1 class="text-3xl font-extrabold text-gray-800 flex items-center">
                    <i class="fas fa-plus-circle text-3xl mr-3 text-yellow-500"></i> ${id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h1>
            </header>
            <form id="formCadastroProduto">
                <p class="mb-4 text-gray-600">Este é o formulário para inclusão ou modificação de itens do seu estoque.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="mb-4">
                        <label for="nome" class="block text-sm font-medium text-gray-700">Nome do Produto</label>
                        <input type="text" id="nome" name="nome" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                    </div>
                    <div class="mb-4">
                        <label for="categoria" class="block text-sm font-medium text-gray-700">Categoria</label>
                        <select id="categoria" name="categoria" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                            <option value="">-- Selecione --</option>
                            <option value="Sorvetes">Sorvetes</option>
                            <option value="Açais">Açaís</option>
                            <option value="Adicionais">Adicionais</option>
                            <option value="Coberturas">Coberturas</option>
                            <option value="Insumos">Insumos/Embalagens</option>
                        </select>
                    </div>
                    <div class="mb-4">
                        <label for="preco" class="block text-sm font-medium text-gray-700">Preço de Venda (R$)</label>
                        <input type="number" id="preco" name="preco" step="0.01" min="0.01" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                    </div>
                    <div class="mb-4">
                        <label for="estoque_minimo" class="block text-sm font-medium text-gray-700">Estoque Mínimo (Alerta)</label>
                        <input type="number" id="estoque_minimo" name="estoque_minimo" min="1" value="10" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                    </div>
                </div>
                
                <div class="mt-6 flex justify-start gap-3">
                    <button type="submit" class="py-2 px-4 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-semibold transition duration-300">
                        <i class="fas fa-save mr-2"></i> Salvar Produto
                    </button>
                    <button type="button" onclick="navigateTo('home')" class="py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-semibold transition duration-300">
                        <i class="fas fa-times mr-2"></i> Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
};

const renderRegistrarEntrada = async (id = null) => {
    setActiveNavButton('registrar_entrada');
    setBgImage(false);
    ROOT_DIV.innerHTML = '<div class="p-6 bg-white rounded-lg shadow-md"><i class="fas fa-spinner fa-spin text-2xl text-yellow-600"></i> Carregando produtos...</div>';
    
    // Simulação de produtos
    const products = [
        { id: 1, name: 'Sorvete Baunilha', quantity: 15 },
        { id: 2, name: 'Picolé Limão', quantity: 8 }, // Baixo estoque
        { id: 3, name: 'Copo Descartável', quantity: 2 }, // Crítico
    ];
    
    try {
        let options = products.map(p => `
            <option value="${p.id}" ${id && p.id == id ? 'selected' : ''}>
                ${p.name} (Estoque Atual: ${p.quantity})
            </option>
        `).join('');

        // Adiciona a opção padrão se nenhum ID foi pré-selecionado
        if (!id) {
             options = `<option value="">-- Selecione um produto --</option>` + options;
        }

        ROOT_DIV.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-md" style="max-width: 600px; margin: 0 auto;">
                <header class="border-b-2 border-yellow-600 pb-3 mb-6">
                    <h1 class="text-3xl font-extrabold text-gray-800 flex items-center">
                        <i class="fas fa-truck-loading text-3xl mr-3 text-yellow-600"></i> Registro de Entrada (Reposição)
                    </h1>
                </header>

                <form onsubmit="event.preventDefault(); handleReposicaoSubmit(this);">
                    <div class="mb-4">
                        <label for="produto_codigo" class="block text-sm font-medium text-gray-700">Produto:</label>
                        <select id="produto_codigo" name="produto_codigo" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                            ${options}
                        </select>
                    </div>

                    <div class="mb-6">
                        <label for="quantidade" class="block text-sm font-medium text-gray-700">Quantidade a Adicionar (Entrada):</label>
                        <input type="number" id="quantidade" name="quantidade" min="1" required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
                    </div>

                    <div class="flex justify-start gap-3">
                        <button type="submit" class="py-2 px-4 bg-yellow-600 text-white font-semibold rounded-md hover:bg-yellow-700 transition duration-300">
                            <i class="fas fa-plus mr-2"></i> Registrar Entrada
                        </button>
                        <button type="button" onclick="navigateTo('home')" class="py-2 px-4 bg-gray-500 text-white font-semibold rounded-md hover:bg-gray-600 transition duration-300">
                            <i class="fas fa-times mr-2"></i> Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;
    } catch (e) {
        ROOT_DIV.innerHTML = `<div class="p-6 bg-white rounded-lg shadow-md text-red-600">Erro ao carregar reposição: ${e.message}</div>`;
    }
};

const handleReposicaoSubmit = async (form) => {
    const product_id = form.produto_codigo.value;
    const quantity = parseInt(form.quantidade.value);

    if (!product_id || quantity <= 0) {
        alert('Por favor, preencha todos os campos corretamente.'); 
        return;
    }

    try {
        // Simulação de sucesso
        // const result = await apiFetch('/api/reposicao', { method: 'POST', body: JSON.stringify({ id: product_id, quantity: quantity }) });
        alert('Reposição registrada com sucesso! (Simulação)');
        navigateTo('home'); // Redireciona para o Início/Alertas após sucesso
    } catch (e) {
        console.error("Erro ao registrar reposição:", e.message);
        alert("Erro ao registrar reposição: " + e.message);
    }
};

const renderGerenciarUsuarios = () => {
    setActiveNavButton('usuarios');
    setBgImage(false);
    ROOT_DIV.innerHTML = `
        <div class="p-6 bg-white rounded-lg shadow-md" style="max-width: 900px; margin: 0 auto;">
            <header class="border-b-2 border-gray-500 pb-3 mb-6">
                <h1 class="text-3xl font-extrabold text-gray-800 flex items-center">
                    <i class="fas fa-users text-3xl mr-3 text-gray-500"></i> Gerenciamento de Usuários
                </h1>
            </header>
            <p class="text-lg text-gray-600">Tela exclusiva para administradores gerenciarem as contas de funcionários.</p>
        </div>
    `;
};

// --- ROTAS (ROUTER) ---

const router = () => {
    // Rota padrão agora é 'home'
    const hash = window.location.hash.substring(1) || 'home'; 
    const urlParts = hash.split('/');
    const viewName = urlParts[0];
    const id = urlParts[1];
    
    // Mapeamento de rotas para funções de renderização
    const routesMap = {
        'home': renderHome, 
        'dashboard': renderDashboard, 
        'relatorios': renderRelatorios, 
        'registrar_venda': renderRegistrarVenda,
        'registrar_entrada': renderRegistrarEntrada,
        'cadastrar_produto': renderCadastrarProduto,
        'usuarios': renderGerenciarUsuarios,
    };

    if (viewName === 'usuarios' && USER_ROLE !== 'ADMIN') {
        console.warn('Acesso negado. Tentativa de acesso à rota de administrador.');
        alert('Acesso negado. Apenas administradores.');
        return navigateTo('home');
    }

    const renderFunction = routesMap[viewName];
    if (renderFunction) {
        renderFunction(id);
    } else {
        navigateTo('home');
    }
};

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Configura os ouvintes de clique para os botões de navegação na barra fixa
    document.querySelectorAll('.nav-button[data-route]').forEach(button => {
        button.addEventListener('click', (e) => {
            const route = e.currentTarget.getAttribute('data-route');
            navigateTo(route);
        });
    });

    // 2. Configura o botão de Logout
    document.getElementById('logout-button').addEventListener('click', handleLogout);
    
    // 3. Roteador: Escuta mudanças na URL e chama a função de renderização
    window.addEventListener('hashchange', router);

    // 4. Renderiza a view inicial
    router();
});