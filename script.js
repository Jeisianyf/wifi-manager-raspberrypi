let networks = [];
let selectedNetwork = null;
let isConnecting = false;

const BACKEND_URL = "http://192.168.2.1:5000";

const statusCard = document.getElementById('statusCard');
const connectedNetworkName = document.getElementById('connectedNetworkName');
const networksList = document.getElementById('networksList');
const scanBtn = document.getElementById('scanBtn');
const scanText = document.getElementById('scanText');
const modalOverlay = document.getElementById('modalOverlay');
const passwordForm = document.getElementById('passwordForm');
const passwordInput = document.getElementById('passwordInput');
const togglePassword = document.getElementById('togglePassword');
const eyeIcon = document.getElementById('eyeIcon');
const eyeOffIcon = document.getElementById('eyeOffIcon');
const modalNetworkName = document.getElementById('modalNetworkName');
const modalNetworkType = document.getElementById('modalNetworkType');
const cancelBtn = document.getElementById('cancelBtn');
const connectBtn = document.getElementById('connectBtn');
const connectBtnText = document.getElementById('connectBtnText');

function showToast(title, message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
    `;
    document.body.appendChild(toast);
                                 
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');                                             
        setTimeout(() => document.body.removeChild(toast), 300);                                                                    
    }, 3000);
}

function createSignalBars(strength, connected) {
    const bars = ['', '', ''];
    const activeClass = connected ? 'signal-strong' : `signal-${strength}`;
    return `
        <div class="signal-bars ${activeClass}">
            ${bars.map(() => '<div class="signal-bar"></div>').join('')}
        </div>
    `;
}

function renderNetworks() {
    const connectedNetwork = networks.find(n => n.connected);
    
    if (connectedNetwork) {
        statusCard.classList.add('connected');
        connectedNetworkName.textContent = connectedNetwork.name;
    } else {
        statusCard.classList.remove('connected');
    }

    networksList.innerHTML = networks.map((network, idx) => `
        <div class="network-card ${network.connected ? 'connected' : ''}" onclick="handleNetworkClick(${idx})">
            <div class="network-content">
                <div class="network-info">
                    <div class="signal-container">
                        ${createSignalBars(network.signal, network.connected)}
                    </div>
                    <div class="network-details">
                        <div class="network-name">
                            ${network.name}
                            ${network.secured ? `
                                <svg class="lock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                </svg>
                            ` : ''}
                        </div>
                        ${network.connected ? '<div class="connected-text">Conectado</div>' : ''}
                    </div>
                </div>
                <div class="network-actions">
                    ${network.connected ? `
                        <button class="btn btn-danger" onclick="event.stopPropagation(); handleDisconnect(${idx})">
                            Desconectar
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="event.stopPropagation(); handleConnect(${idx})">
                            Conectar
                        </button>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

function fetchNetworks() {
    scanBtn.disabled = true;
    scanText.textContent = 'Escaneando...';
    const scanIcon = scanBtn.querySelector('svg');
    scanIcon.style.animation = 'spin 1s linear infinite';

    fetch(`${BACKEND_URL}/scan`)
        .then(res => res.json())
        .then(data => {
            networks = data.map((n, idx) => ({ ...n, id: idx.toString() }));
            renderNetworks();
            showToast('Redes atualizadas', 'Lista de redes WiFi atualizada');
            console.log('Redes encontradas:', networks);
        })
        .catch(() => showToast('Erro', 'Falha ao buscar redes'))
        .finally(() => {
            scanBtn.disabled = false;
            scanText.textContent = 'Atualizar';
            scanIcon.style.animation = '';
        });
}

function handleNetworkClick(idx) {
    const network = networks[idx];
    if (!network.connected) {
        handleConnect(idx);
    }
}

function handleConnect(idx) {
    selectedNetwork = networks[idx];
    if (!selectedNetwork) return;

    modalNetworkName.textContent = selectedNetwork.name;
    modalNetworkType.innerHTML = selectedNetwork.secured ? `
        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
        </svg>
        Rede protegida
    ` : 'Rede aberta';

    passwordForm.style.display = selectedNetwork.secured ? 'block' : 'none';
    modalOverlay.classList.add('active');
    
    if (selectedNetwork.secured) {
        passwordInput.focus();
    }
}

function handleDisconnect(idx) {
    const network = networks[idx];
    if (!network) return;

    fetch(`${BACKEND_URL}/disconnect`, { method: 'POST' })
        .then(res => res.json())
        .then(() => {
            networks = networks.map((n, i) => i === idx ? { ...n, connected: false } : n);
            renderNetworks();
            showToast('Desconectado', `Desconectado da rede ${network.name}`);
        })
        .catch(() => showToast('Erro', 'Falha ao desconectar'));
}

function handleScan() {
    fetchNetworks();
}

function closeModal() {
    modalOverlay.classList.remove('active');
    selectedNetwork = null;
    passwordInput.value = '';
    passwordInput.type = 'password';
    eyeIcon.style.display = 'block';
    eyeOffIcon.style.display = 'none';
}

async function handlePasswordSubmit() {
    if (!selectedNetwork) {
        showToast('Erro', 'Nenhuma rede selecionada');
        return;
    }

    isConnecting = true;
    connectBtn.disabled = true;
    connectBtnText.innerHTML = 'Conectando...';

    try {
        const response = await fetch(`${BACKEND_URL}/connect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ssid: selectedNetwork.name,
                password: selectedNetwork.secured ? passwordInput.value : undefined
            })
        });

        if (!response.ok) {
            throw new Error('Erro na conexão');
        }

        showToast('Conectando...', `Aguardando conexão à rede ${selectedNetwork.name}`);

        let pollingAttempts = 0;
        const maxPollingAttempts = 20;
        const pollingInterval = 5000;

        const poll = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/connection_status`);
                const data = await res.json();

                if (data.status === 'connected') {
                    showToast('Conectado com sucesso!', `Conectado à rede ${data.ssid || selectedNetwork.name}`);
                    closeModal();
                    fetchNetworks();
                    return;
                } else if (data.status === 'failed' || pollingAttempts >= maxPollingAttempts) {
                    showToast('Erro', `Falha ao conectar à rede ${selectedNetwork.name}.`);
                    fetchNetworks();
                    return;
                } else {
                    console.log('Ainda conectando...', data.status);
                    pollingAttempts++;
                    setTimeout(poll, pollingInterval);
                }
            } catch (err) {
                console.warn(`Erro ao tentar verificar status: ${err}`);
                pollingAttempts++;
                if (pollingAttempts >= maxPollingAttempts) {
                    showToast('Erro', `Falha ao conectar à rede ${selectedNetwork.name}.`);
                    fetchNetworks();
                    return;
                }
            setTimeout(poll, pollingInterval);
        }

    };
    poll();
} catch (error) {
    closeModal();
    showToast('Erro', `Falha ao conectar à rede ${selectedNetwork.name}: ${error.message}`);
    fetchNetworks();
    }
}

scanBtn.addEventListener('click', handleScan);
cancelBtn.addEventListener('click', closeModal);
connectBtn.addEventListener('click', handlePasswordSubmit);

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.style.display = isPassword ? 'none' : 'block';
    eyeOffIcon.style.display = isPassword ? 'block' : 'none';
});

passwordForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handlePasswordSubmit();
});

fetchNetworks();