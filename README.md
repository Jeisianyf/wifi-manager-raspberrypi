# WiFi Manager - Raspberry Pi (DietPi)

## 📋 Descrição

Este é um **gerenciador de WiFi web** desenvolvido para Raspberry Pi rodando DietPi. A aplicação fornece uma interface web moderna e intuitiva para gerenciar conexões WiFi do dispositivo, permitindo escanear redes disponíveis, conectar e desconectar de redes WiFi de forma simples e visual.

A solução é ideal para projetos IoT onde o Raspberry Pi precisa se conectar a diferentes redes WiFi sem acesso direto ao terminal ou interface física.

## 🎯 Funcionalidades

- ✅ **Escanear redes WiFi** disponíveis no alcance
- ✅ **Conectar a redes protegidas** (WPA/WPA2) ou abertas
- ✅ **Desconectar** da rede atual
- ✅ **Visualizar status de conexão** em tempo real
- ✅ **Indicadores de força de sinal** para cada rede
- ✅ **Interface responsiva** que funciona em qualquer dispositivo
- ✅ **Verificação automática** de status de conexão
- ✅ **Notificações visuais** (toasts) para feedback ao usuário

## 🏗️ Arquitetura

A aplicação é composta por duas partes principais:

### Backend (Python Flask)
- **Arquivo**: `wifi_control.py`
- **Função**: API REST que interage com o sistema Linux para gerenciar WiFi
- **Porta**: 5000
- **IP**: 192.168.2.1 (configurável)
- **Tecnologias**: Flask, Flask-CORS, subprocess (iwlist, wpa_supplicant, dhclient)

### Frontend (HTML/CSS/JavaScript)
- **Arquivos**: `index.html`, `styles.css`, `script.js`
- **Função**: Interface web para usuário final
- **Tecnologias**: HTML5, CSS3, JavaScript

### Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/scan` | GET | Escaneia e retorna lista de redes WiFi disponíveis |
| `/connect` | POST | Conecta a uma rede WiFi (requer SSID e senha) |
| `/disconnect` | POST | Desconecta da rede WiFi atual |
| `/status` | GET | Retorna o SSID da rede conectada |
| `/connection_status` | GET | Verifica o status detalhado da conexão |

## 📦 Pré-requisitos

### Sistema Operacional
- **Raspberry Pi** (qualquer modelo com WiFi integrado ou dongle USB)
- **DietPi** (ou outra distribuição Linux baseada em Debian/Raspbian)

### Pacotes do Sistema
```bash
sudo apt-get update
sudo apt-get install -y \
    python3 \
    python3-pip \
    wireless-tools \
    wpasupplicant \
    dhcpcd5 \
    isc-dhcp-client
```

### Bibliotecas Python
```bash
pip3 install flask flask-cors
```

## 🚀 Instalação e Configuração

### 1. Clone ou copie os arquivos

Coloque todos os arquivos do projeto em um diretório no seu Raspberry Pi:

```bash
mkdir -p ~/wifi-manager
cd ~/wifi-manager
# Copie os arquivos: wifi_control.py, index.html, styles.css, script.js
```

### 2. Configure permissões sudo

O script precisa de permissões sudo para gerenciar WiFi. Edite o arquivo sudoers:

```bash
sudo visudo
```

Adicione a seguinte linha (substitua `seu_usuario` pelo usuário que executará o script):

```
seu_usuario ALL=(ALL) NOPASSWD: /sbin/ip, /usr/sbin/iwlist, /usr/sbin/iwgetid, /sbin/wpa_cli, /usr/bin/systemctl, /bin/ping, /sbin/dhclient, /usr/bin/killall, /usr/bin/sed
```

### 3. Configure o IP do Raspberry Pi (Opcional)

Se você deseja acessar o WiFi Manager de outro dispositivo na mesma rede, configure um IP estático ou ajuste o IP no código.

No arquivo [wifi_control.py](wifi_control.py#L207):
```python
app.run(host='192.168.2.1', port=5000)
```

E no arquivo [script.js](script.js#L5):
```javascript
const BACKEND_URL = "http://192.168.2.1:5000";
```

**Dica**: Para acessar localmente apenas no Raspberry Pi, use:
```python
app.run(host='0.0.0.0', port=5000)
```
E ajuste o `BACKEND_URL` para o IP do seu Raspberry Pi na rede.

### 4. Torne o script executável

```bash
chmod +x wifi_control.py
```

## 🎮 Como Utilizar

### Iniciando o Servidor

#### Modo Manual
```bash
cd ~/wifi-manager
sudo python3 wifi_control.py
```

O servidor iniciará na porta 5000.

#### Modo Serviço (Systemd) - Recomendado

Para que o WiFi Manager inicie automaticamente com o sistema, crie um serviço systemd:

1. Crie o arquivo de serviço:
```bash
sudo nano /etc/systemd/system/wifi-manager.service
```

2. Adicione o conteúdo:
```ini
[Unit]
Description=WiFi Manager Web Interface
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/seu_usuario/wifi-manager
ExecStart=/usr/bin/python3 /home/seu_usuario/wifi-manager/wifi_control.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. Ative e inicie o serviço:
```bash
sudo systemctl daemon-reload
sudo systemctl enable wifi-manager.service
sudo systemctl start wifi-manager.service
```

4. Verifique o status:
```bash
sudo systemctl status wifi-manager.service
```

### Servindo os Arquivos HTML

Você pode servir os arquivos HTML de várias formas:

#### Opção 1: Servidor HTTP Python (Simples)
```bash
cd ~/wifi-manager
python3 -m http.server 8080
```

Acesse: `http://192.168.2.1:8080`

#### Opção 2: Nginx (Recomendado para produção)

1. Instale o Nginx:
```bash
sudo apt-get install -y nginx
```

2. Configure o Nginx:
```bash
sudo nano /etc/nginx/sites-available/wifi-manager
```

Adicione:
```nginx
server {
    listen 80;
    server_name _;
    
    root /home/seu_usuario/wifi-manager;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    location /api/ {
        proxy_pass http://192.168.2.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. Ative a configuração:
```bash
sudo ln -s /etc/nginx/sites-available/wifi-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Acesse: `http://192.168.2.1`

### Acessando a Interface

1. **Conecte-se à rede** do Raspberry Pi ou garanta que esteja na mesma rede
2. **Abra um navegador** (Chrome, Firefox, Safari, etc.)
3. **Acesse o endereço**: `http://192.168.2.1:8080` (ou o IP configurado)

### Usando a Interface

1. **Escanear Redes**: Clique no botão "Atualizar" para listar redes disponíveis
2. **Conectar a uma Rede**:
   - Clique no botão "Conectar" da rede desejada
   - Se a rede for protegida, digite a senha
   - Clique em "Conectar" no modal
   - Aguarde a confirmação de conexão
3. **Desconectar**: Clique em "Desconectar" na rede conectada
4. **Verificar Status**: O card verde no topo mostra a rede atual conectada

## 🔧 Como Funciona

### Fluxo de Conexão

1. **Usuário clica em "Conectar"** → Frontend envia POST para `/connect`
2. **Backend atualiza** `wpa_supplicant.conf` com as credenciais
3. **Reinicia** o serviço `wpa_supplicant@wlan0`
4. **Aguarda associação** com a rede (até 20 segundos)
5. **Solicita IP** via DHCP usando `dhclient`
6. **Frontend faz polling** no endpoint `/connection_status` a cada 5 segundos
7. **Confirma conexão** quando recebe IP e está associado ao SSID

### Segurança

⚠️ **Atenção**: Esta aplicação é projetada para uso em redes locais/privadas. Considerações importantes:

- As senhas WiFi são armazenadas em texto simples em `/etc/wpa_supplicant/wpa_supplicant.conf`
- A API não possui autenticação (qualquer pessoa na rede pode acessar)
- Recomenda-se usar apenas em redes confiáveis
- Para produção, adicione autenticação (JWT, Basic Auth, etc.)

### Arquivos do Sistema Modificados

- `/etc/wpa_supplicant/wpa_supplicant.conf` - Configurações de WiFi
- Interface de rede `wlan0` - Gerenciada via comandos do sistema

## 🐛 Troubleshooting

### Problema: Não consegue escanear redes

**Solução**:
```bash
# Verifique se a interface está ativa
sudo ip link set wlan0 up

# Teste o comando manualmente
sudo iwlist wlan0 scan
```

### Problema: Não conecta a nenhuma rede

**Solução**:
```bash
# Verifique os logs do wpa_supplicant
sudo journalctl -u wpa_supplicant@wlan0 -f

# Verifique o arquivo de configuração
sudo cat /etc/wpa_supplicant/wpa_supplicant.conf

# Reinicie o serviço manualmente
sudo systemctl restart wpa_supplicant@wlan0
```

### Problema: Conecta mas não recebe IP

**Solução**:
```bash
# Libere o IP atual
sudo dhclient -r wlan0

# Solicite novo IP
sudo dhclient wlan0

# Verifique se recebeu IP
ip addr show wlan0
```

### Problema: Erro CORS no navegador

**Solução**: Verifique se o Flask-CORS está instalado e configurado corretamente no [wifi_control.py](wifi_control.py#L9):
```python
CORS(app)
```

### Problema: Permissão negada

**Solução**: Certifique-se de que as permissões sudo estão configuradas corretamente (veja seção de instalação).

## 📱 Compatibilidade

### Navegadores Testados
- ✅ Chrome/Chromium 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Navegadores mobile (iOS Safari, Chrome Mobile)

### Sistemas Testados
- ✅ DietPi
- ✅ Raspbian/Raspberry Pi OS
- ⚠️ Outras distribuições Linux (pode requerer ajustes)

## 🔄 Atualizações Futuras

Possíveis melhorias:
- [ ] Autenticação de usuário
- [ ] Suporte a redes WPA3
- [ ] Histórico de redes conectadas
- [ ] Modo AP (Access Point) integrado
- [ ] Backup/restore de configurações
- [ ] Interface multi-idioma
- [ ] Testes automatizados

## 📄 Licença

Este projeto é open source. Use e modifique conforme necessário.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir melhorias
- Enviar pull requests

## 📞 Suporte

Para questões e suporte, consulte:
- Documentação do DietPi: https://dietpi.com/docs/
- Documentação do wpa_supplicant: https://w1.fi/wpa_supplicant/
- Fórum Raspberry Pi: https://forums.raspberrypi.com/

---

**Desenvolvido para projetos de Telemetria com Raspberry Pi** 🚀
