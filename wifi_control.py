import json
import subprocess
import re
import os
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
import codecs
import time
import threading

app = Flask(__name__)
CORS(app)

WPA_SUPPLICANT_CONF = '/etc/wpa_supplicant/wpa_supplicant.conf'
INTERFACE = 'wlan0'

def get_gateway():
    try:
        result = subprocess.run(['sudo', 'ip', 'route'], capture_output=True, text=True)
        for line in result.stdout.splitlines():
            if line.startswith('default'):
                parts = line.split()
                gateway_index = parts.index('via') + 1
                return parts[gateway_index]
    except Exception as e:
        print(f"Erro ao obter gateway: {e}")
    return None

def wait_for_connection(timeout=15):
    for i in range(timeout):
        print(f"Esperando conexão... {i+1}/{timeout}")

        result = subprocess.run(['sudo', 'ip', 'addr', 'show', INTERFACE], capture_output=True, text=True)
        if "inet " in result.stdout:
            gateway = get_gateway()
            if gateway:
                try:
                    ping = subprocess.run(['sudo', 'ping', '-c', '1', gateway], capture_output=True, text=True)
                    if ping.returncode == 0:
                        print("Conexão estabelecida com sucesso!")
                        return True
                except Exception as e:
                    print(f"Erro ao pingar gateway: {e}")
        time.sleep(1)
    print("Tempo limite de espera atingido. Conexão não estabelecida.")
    return False


def decode_ssid(encoded_ssid):
    try:
        raw_bytes = codecs.decode(encoded_ssid, 'unicode_escape')
        return raw_bytes.encode('latin1').decode('utf-8')
    except Exception as e:
        print(f"Erro ao decodificar SSID: {e}")
        return encoded_ssid

def scan_networks():
    result = subprocess.run(['sudo', 'iwlist', INTERFACE, 'scan'], capture_output=True, text=True)
    networks = []
    for cell in result.stdout.split('Cell '):
        ssid_match = re.search(r'ESSID:"(.+)"', cell)
        quality_match = re.search(r'Quality=(\d+)/(\d+)', cell)
        encryption_match = re.search(r'Encryption key:(on|off)', cell)
        if ssid_match:
            raw_ssid = ssid_match.group(1)
            ssid = decode_ssid(raw_ssid)
            quality = int(quality_match.group(1)) if quality_match else 0
            secured = encryption_match.group(1) == 'on' if encryption_match else False
            networks.append({
                'name': ssid,
                'signal': 'strong' if quality > 50 else 'medium' if quality > 25 else 'weak',
                'secured': secured,
                'connected': False
            })
    return networks

def add_network_to_wpa_supplicant(ssid, psk=None):
    try:
        print("Entrando em add_network_to_wpa_supplicant()")  # Debug
        print(f"SSID: {ssid}, PSK: {psk}")  # Debug

        with open(WPA_SUPPLICANT_CONF, 'a') as f:
            f.write('\nnetwork={\n')
            f.write(f'    ssid="{ssid}"\n')
            if psk:
                f.write(f'    psk="{psk}"\n')
            else:
                f.write('    key_mgmt=NONE\n')
            f.write('}\n')

        print("Rede adicionada com sucesso ao wpa_supplicant.conf")  # Debug

    except Exception as e:
        print(f"Erro ao adicionar rede ao wpa_supplicant.conf: {e}")


def reload_wpa_supplicant():
    subprocess.run(['sudo', 'wpa_cli', '-i', INTERFACE, 'reconfigure'])
    print("wpa_supplicant recarregado")  # Debug

def get_connected_ssid():
    result = subprocess.run(['sudo', 'iwgetid', '-r'], capture_output=True, text=True)
    return result.stdout.strip()

def wifi_connection_threading(ssid, pwd):
    print("Iniciando conexão com SSID:", ssid)

    subprocess.run(["sudo", "sed", "-i", "/network={/,/}/d", WPA_SUPPLICANT_CONF], check=True)
    add_network_to_wpa_supplicant(ssid, pwd)
    reload_wpa_supplicant()

    try:
        subprocess.run(['dhclient', INTERFACE], check=True)
    except subprocess.CalledProcessError as e:
        print(f"Erro ao executar dhclient: {e}")

    time.sleep(2)  # pequena espera antes do restart
    os.system("sudo systemctl restart networking")

@app.route('/scan', methods=['GET'])
def scan():
    print("Recebido /scan")  # Debug
    networks = scan_networks()
    connected_ssid = get_connected_ssid()
    print(f"Redes encontradas: {networks}")  # Debug
    print(f"SSID conectado: {connected_ssid}")  # Debug
    for net in networks:
        if net['name'].strip().lower() == connected_ssid.strip().lower():
            net['connected'] = True
    return jsonify(networks)

@app.route('/connect', methods=['POST'])
def connect():
    print("Recebido /connect")  # Debug
    data = request.json
    print(f"Dados recebidos: {data}")  # Debug
    ssid = data.get('ssid')
    password = data.get('password')

    if not ssid:
        print("SSID não informado!")  # Debug
        return jsonify({'error': 'SSID obrigatório'}), 400
    
    thread = threading.Thread(target=wifi_connection_threading, args=(ssid, password))
    thread.start()

    return jsonify({"message": "Connecting"}), 202

@app.route('/connection_status', methods=['GET'])
def get_connection_status():
    try:
        ip_result = subprocess.run(['sudo', 'ip', 'a', 'show', INTERFACE], capture_output=True, text=True)
        has_ip = "inet " in ip_result.stdout and "UP" in ip_result.stdout

        ssid = get_connected_ssid()
        if has_ip and ssid:
            return jsonify({'status': 'connected', 'ssid': ssid}), 200
        elif not has_ip:
            return jsonify({'status': 'connecting'}), 200
        else:
            return jsonify({'status': 'unknown'}), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/disconnect', methods=['POST'])
def disconnect():
    print("Recebido /disconnect")  # Debug
    subprocess.run(['sudo', 'wpa_cli', '-i', INTERFACE, 'disconnect'])
    print("Desconectado")  # Debug
    return jsonify({'status': 'disconnected'})

@app.route('/status', methods=['GET'])
def status():
    print("Recebido /status")  # Debug
    ssid = get_connected_ssid()
    print(f"SSID conectado: {ssid}")  # Debug
    return jsonify({'connected_ssid': ssid})

if __name__ == '__main__':
    app.run(host='192.168.2.1', port=5000)






