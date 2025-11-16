from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash 
from datetime import datetime, timedelta

app = Flask(__name__)
app.secret_key = 'sua_chave_secreta_muito_segura' 

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///gelarte.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False) 
    role = db.Column(db.String(20), default='USER')
    cargo = db.Column(db.String(50), default='A Definir')
    setor = db.Column(db.String(50), default='A Definir')

    def set_password(self, password):
        """Cria o hash da senha."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verifica a senha usando o hash."""
        return check_password_hash(self.password_hash, password)

def create_tables():
    db.create_all()
    if not User.query.filter_by(email='admin@gelarte.com').first():
        admin = User(name='Lukas Admin', email='admin@gelarte.com', role='ADMIN', cargo='Gerente', setor='Administrativo')
        admin.set_password('admin')
        db.session.add(admin)
        db.session.commit()
        print("Usuário Admin inicial criado (admin@gelarte.com / admin).")

MOCK_PRODUCTS = [
    {'id': 'PROD001', 'name': 'Sorvete de Chocolate', 'type': 'Sorvete', 'expiration_date': '2025-12-12', 'quantity': 7, 'cost': 9.00, 'price': 23.00},
    {'id': 'PROD002', 'name': 'Cobertura de Morango', 'type': 'Cobertura', 'expiration_date': '2025-12-12', 'quantity': 5, 'cost': 10.00, 'price': 22.00},
    {'id': 'PROD003', 'name': 'Picole Frutas Tropicais', 'type': 'Picole', 'expiration_date': '2025-11-30', 'quantity': 25, 'cost': 2.00, 'price': 5.00},
]
MOCK_SALES = [
    {'id': 'VENDA001', 'date': '2025-10-01', 'product_id': 'PROD001', 'product_name': 'Sorvete de Chocolate', 'quantity': 5, 'total': 115.00, 'type': 'Sorvete'},
    {'id': 'VENDA002', 'date': '2025-10-05', 'product_id': 'PROD003', 'product_name': 'Picole Frutas Tropicais', 'quantity': 10, 'total': 50.00, 'type': 'Picole'},
]

def get_user_by_email(email):
    """Busca usuário pelo e-mail no banco de dados."""
    return User.query.filter_by(email=email).first()

def get_user_by_id(user_id):
    """Busca usuário pelo ID no banco de dados."""
    return User.query.get(user_id) 

def get_product_by_id(product_id):
    """Busca produto pelo ID (ainda no MOCK_PRODUCTS)."""
    return next((p for p in MOCK_PRODUCTS if p['id'] == product_id), None)

def calculate_dashboard_data(products, sales):
    """Calcula estatísticas para o dashboard."""
    total_produtos = sum(p['quantity'] for p in products)
    alertas = sum(1 for p in products if p['quantity'] <= 10)
    total_vendas = sum(s['total'] for s in sales)
    
    vendas_por_tipo = {}
    for sale in sales:
        vendas_por_tipo[sale['type']] = vendas_por_tipo.get(sale['type'], 0) + sale['total']
        
    estoque_por_tipo = {}
    for p in products:
        estoque_por_tipo[p['type']] = estoque_por_tipo.get(p['type'], 0) + p['quantity']

    return {
        'total_produtos_estoque': total_produtos,
        'alertas_estoque_baixo': alertas,
        'total_vendas_mes': total_vendas,
        'vendas_por_tipo': vendas_por_tipo,
        'estoque_por_tipo': estoque_por_tipo
    }

def login_required_api(f):
    """Decorator para exigir login em rotas API."""
    def wrap(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Não Autorizado', 'redirect': '/login'}), 401
        return f(*args, **kwargs)
    wrap.__name__ = f.__name__
    return wrap

def admin_required_api(f):
    """Decorator para exigir permissão de Admin em rotas API."""
    @login_required_api
    def wrap(*args, **kwargs):
        user = get_user_by_id(session.get('user_id'))
        if not user or user.role != 'ADMIN':
            return jsonify({'error': 'Acesso Negado. Admin necessário.'}), 403
        return f(*args, **kwargs)
    wrap.__name__ = f.__name__
    return wrap

@app.route('/login', methods=['GET'])
def login():
    """Rota que renderiza o HTML de login."""
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/register', methods=['GET'])
def register():
    """Rota que renderiza o HTML de registro."""
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('register.html')

@app.route('/')
def index():
    """Rota que renderiza o único HTML de container SPA."""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    user = get_user_by_id(session.get('user_id'))
    user_role = user.role if user else 'USER' 
    return render_template('index.html', user_role=user_role)

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """Rota API para processar o login via AJAX/Fetch, usando hash de senha."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    user = get_user_by_email(email)
    if user and user.check_password(password): 
        session['user_id'] = user.id
        session['role'] = user.role
        return jsonify({'message': 'Login successful', 'role': user.role, 'name': user.name}), 200
    else:
        return jsonify({'error': 'E-mail ou senha inválidos.'}), 401

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    """Rota API para processar o cadastro, salvando no banco de dados com hash de senha."""
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'USER')
    
    if get_user_by_email(email):
        return jsonify({'error': 'Este e-mail já está em uso.'}), 400
        
    new_user = User(name=name, email=email, role=role)
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'Cadastro realizado com sucesso! Por favor, faça login.', 'user_id': new_user.id}), 201

@app.route('/api/auth/logout', methods=['POST'])
@login_required_api
def api_logout():
    """Rota API para realizar o logout."""
    session.pop('user_id', None)
    session.pop('role', None)
    return jsonify({'message': 'Logout realizado com sucesso.'}), 200

@app.route('/api/dashboard', methods=['GET'])
@login_required_api
def api_dashboard():
    """Retorna dados estatísticos para o Painel de Controle."""
    stats = calculate_dashboard_data(MOCK_PRODUCTS, MOCK_SALES)
    return jsonify({
        'stats': stats,
        'products': [p for p in MOCK_PRODUCTS if p['quantity'] <= 10]
    }), 200

@app.route('/api/products', methods=['GET'])
@login_required_api
def api_products():
    """Retorna a lista completa de Produtos Acabados/Insumos."""
    return jsonify({'products': MOCK_PRODUCTS}), 200

@app.route('/api/products', methods=['POST'])
@login_required_api
def api_add_product():
    """Adiciona um novo produto."""
    data = request.get_json()
    new_id_num = len(MOCK_PRODUCTS) + 1
    data['id'] = f'PROD{new_id_num:03d}'
    
    MOCK_PRODUCTS.append(data) 
    return jsonify({'message': 'Produto cadastrado com sucesso!', 'product': data}), 201

@app.route('/api/reposicao', methods=['POST'])
@login_required_api
def api_reposicao():
    """Simula o lançamento de reposição de estoque."""
    data = request.get_json()
    product_id = data.get('id')
    
    try:
        quantity = int(data.get('quantity', 0))
    except ValueError:
        return jsonify({'error': 'Quantidade inválida.'}), 400

    product = get_product_by_id(product_id)
    if product:
        product['quantity'] += quantity
        return jsonify({'message': f'Reposição de {quantity} unidades de {product["name"]} registrada com sucesso!', 'new_quantity': product['quantity']}), 200
    
    return jsonify({'error': 'Produto não encontrado.'}), 404

@app.route('/api/users', methods=['GET'])
@admin_required_api
def api_users():
    """Retorna todos os usuários (Admin Only) para a tela de gerenciamento."""
    users = User.query.all()
    user_list = [{
        'id': u.id,
        'name': u.name,
        'email': u.email,
        'role': u.role,
        'cargo': u.cargo,
        'setor': u.setor
    } for u in users]
    return jsonify({'users': user_list}), 200

@app.route('/api/user_info', methods=['GET'])
@login_required_api
def api_user_info():
    """Retorna informações do usuário logado (usado para o menu/perfil)."""
    user_id = session.get('user_id')
    user = get_user_by_id(user_id) 
    
    if user:
        return jsonify({
            'name': user.name,
            'role': user.role
        }), 200
    return jsonify({'error': 'Usuário não encontrado na sessão.'}), 404

if __name__ == '__main__':
    with app.app_context():
        create_tables()

    app.run(debug=True)