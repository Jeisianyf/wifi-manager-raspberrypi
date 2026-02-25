# WiFi Manager - Raspberry Pi (DietPi)

## 📋 Descrição

Este é um **gerenciador de WiFi web** desenvolvido para Raspberry Pi. A aplicação fornece uma interface web para gerenciar conexões WiFi do dispositivo, permitindo escanear redes disponíveis, conectar e desconectar de redes WiFi de forma simples e visual.

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
- **Raspberry Pi** (qualquer modelo com WiFi integrado ou dongle USB)
- **DietPi** (ou outra distribuição Linux baseada em Debian/Raspbian)

### Pacotes do Sistema
```bash
sudo apt-get update
sudo apt-get install -y python3 python3-pip wireless-tools wpasupplicant dhcpcd5 isc-dhcp-client
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

### 3. Configure a Interface Virtual (Recomendado)

Para permitir que o Raspberry Pi opere simultaneamente como **AP e Cliente**, ou facilite a transição entre modos, é recomendado criar uma interface virtual.

#### Por que usar interface virtual?

- Permite operação simultânea como AP (hotspot) e Cliente WiFi
- Facilita a transição suave entre modos sem perder conectividade
- Testado com sucesso no **Raspberry Pi Zero 2W**

#### Criando a Interface Virtual (uap0)

```bash
# Criar interface virtual uap0 para o Access Point
sudo iw dev wlan0 interface add uap0 type __ap

# Ativar a interface
sudo ip link set uap0 up

# Configurar IP estático para o AP
sudo ip addr add 192.168.2.1/24 dev uap0
```

Para tornar permanente, crie um script de inicialização:

```bash
sudo nano /usr/local/bin/setup-virtual-wifi.sh
```

Adicione o conteúdo:

```bash
# Verificar se uap0 já existe
if ! ip link show uap0 &> /dev/null; then
    echo "Criando interface virtual uap0..."
    iw dev wlan0 interface add uap0 type __ap
    ip link set uap0 up
    ip addr add 192.168.2.1/24 dev uap0
    echo "Interface uap0 criada e ativada com IP 192.168.2.1"
else
    echo "Interface uap0 já existe."
fi
```

Torne executável e configure para iniciar no boot:

```bash
sudo chmod +x /usr/local/bin/setup-virtual-wifi.sh

# Criar serviço systemd
sudo nano /etc/systemd/system/virtual-wifi.service
```

Conteúdo do serviço:

```ini
[Unit]
Description=Setup Virtual WiFi Interface (uap0)
After=network-pre.target
Before=network.target hostapd.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-virtual-wifi.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Ative o serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl enable virtual-wifi.service
sudo systemctl start virtual-wifi.service
```

#### Configuração do hostapd para uap0

Edite o arquivo de configuração do hostapd para usar a interface `uap0`:

```bash
sudo nano /etc/hostapd/hostapd.conf
```

Certifique-se de que contém:

```ini
interface=uap0
driver=nl80211
ssid=WiFi-Maneger-RPi
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=suasenha123
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
```

#### Configuração com Interfaces Virtuais

Após criar a interface virtual, a configuração ficará:

**Para wlan0** (Cliente WiFi):
- Gerenciada pelo `wpa_supplicant`
- Recebe IP via DHCP do roteador
- Usada para conectar em redes externas via WiFi Manager

**Para uap0** (Access Point):
- Gerenciada pelo `hostapd` e `dnsmasq`
- IP fixo: `192.168.2.1`
- Usada para fornecer o hotspot de configuração inicial

#### Verificando as Interfaces

```bash
# Listar todas as interfaces
ip link show

# Verificar interfaces WiFi
iw dev

# Status das interfaces
ip addr show wlan0
ip addr show uap0
```

### 4. Entenda a configuração de rede

Este projeto assume que o Raspberry Pi possui um **Access Point (AP/hotspot)** para o primeiro acesso.

⚠️ Importante: **o WiFi Manager não “sobe” o AP por conta própria**. O AP precisa estar configurado no sistema (ex.: via DietPi, `hostapd`/`dnsmasq` e/ou algum serviço/script de fallback) (Realizado no passo anterior).

O backend Flask deste projeto está configurado para escutar no IP do AP:

No arquivo [wifi_control.py](wifi_control.py#L207):
```python
app.run(host='192.168.2.1', port=5000)
```

No arquivo [script.js](script.js#L5):
```javascript
const BACKEND_URL = "http://192.168.2.1:5000";
```

**Fluxo esperado de uso (AP → conectar no WiFi → acessar pela rede):**

1. **Estado inicial (sem WiFi configurado ou sem alcance da rede):**
   - O Raspberry Pi fica em modo **AP** (hotspot) com IP `192.168.2.1`
   - Conecte-se ao WiFi do AP com seu celular/notebook
   - Acesse a página do WiFi Manager em: `http://192.168.2.1/wifi`

2. **Após conectar o Raspberry Pi em uma rede WiFi pelo WiFi Manager:**
   - O Raspberry Pi passa a operar como **cliente** da rede WiFi escolhida
   - Ele receberá um IP do roteador (DHCP), por exemplo `192.168.1.50`
   - Conecte seu celular/notebook à **mesma rede WiFi**
   - Acesse a página em: `http://[IP_DO_RASPBERRY]/wifi` (ex.: `http://192.168.1.50/wifi`)

3. **Se o Raspberry Pi desconectar da rede (ou ficar fora de alcance):**
   - O sistema deve **voltar para o modo AP** (fallback)
   - Acesse novamente via: `http://192.168.2.1/wifi`

Para descobrir o IP do Raspberry Pi na rede, use:
```bash
hostname -I
```

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

## Servindo os Arquivos HTML -- Apache HTTP Server

1. Instale o Apache:
```bash
sudo apt-get install -y apache2
```

2. Copie os arquivos para o diretório web do Apache:
```bash
sudo cp ~/wifi-manager/*.html ~/wifi-manager/*.css ~/wifi-manager/*.js /var/www/html/wifi
```

3. Reinicie o Apache:
```bash
sudo systemctl restart apache2
```

Acesse: `http://192.168.2.1/wifi`

### Acessando a Interface

1. **Conecte-se à rede** do Raspberry Pi;
2. **Abra um navegador;**
3. **Acesse o endereço**: `http://192.168.2.1/wifi` (ou o IP configurado)

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

- As senhas WiFi são armazenadas em texto simples em `/etc/wpa_supplicant/wpa_supplicant.conf`;
- A API não possui autenticação (qualquer pessoa na rede pode acessar);
- Recomenda-se usar apenas em redes confiáveis;
- Para produção, adicione autenticação.

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

### Sistemas Testados
- ✅ DietPi
- ✅ Raspbian/Raspberry Pi OS
- ⚠️ Outras distribuições Linux (pode requerer ajustes)

## 🔄 Atualizações Futuras

Possíveis melhorias:
- [ ] Autenticação de usuário
- [ ] Histórico de redes conectadas
- [ ] Modo AP (Access Point) integrado
- [ ] Interface multi-idioma
- [ ] Testes automatizados

## ©️ Licença

Este projeto é open source. Use e modifique conforme necessário.
