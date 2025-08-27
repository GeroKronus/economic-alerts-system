# 🚀 INSTRUÇÕES DE DEPLOY - Economic Alerts System

## ✅ **PRÉ-REQUISITOS**

1. **Tabela.sqlite** - Arquivo com dados econômicos reais
2. **Telegram Bot Token** - Obtido via @BotFather
3. **Chat ID** - ID do chat/usuário que receberá alertas

## 📋 **PASSOS PARA DEPLOY**

### **1. Preparar Arquivos**
```bash
# Copiar arquivos essenciais:
- src/ (todos os arquivos)
- public/ (dashboard web)  
- Tabela.sqlite (dados econômicos)
- package.json.deploy → package.json
- .env.production → .env
- Dockerfile (se usando Docker)
```

### **2. Configurar Variáveis de Ambiente**
```bash
# Editar .env com seus dados:
TELEGRAM_BOT_TOKEN=1234567890:SEU_TOKEN_AQUI
TELEGRAM_CHAT_ID=123456789
PORT=3000
NODE_ENV=production
```

### **3. Opção A: Deploy VPS/Cloud**
```bash
# 1. Conectar via SSH
ssh root@seu-servidor-ip

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Enviar arquivos (via git ou scp)
git clone seu-repositorio
cd economic-alerts

# 4. Instalar dependências
npm install

# 5. Importar dados
node import_real_data.js

# 6. Iniciar aplicação
npm start

# 7. Manter rodando (PM2)
npm install -g pm2
pm2 start src/server.js --name "economic-alerts"
pm2 startup
pm2 save
```

### **4. Opção B: Deploy Heroku**
```bash
# 1. Instalar Heroku CLI
# 2. Criar app
heroku create economic-alerts-bot

# 3. Configurar variáveis
heroku config:set TELEGRAM_BOT_TOKEN=seu_token
heroku config:set TELEGRAM_CHAT_ID=seu_chat_id
heroku config:set NODE_ENV=production

# 4. Deploy
git add .
git commit -m "Deploy production"
git push heroku main

# 5. Upload Tabela.sqlite manualmente via dashboard
```

### **5. Opção C: Deploy Docker**
```bash
# 1. Build imagem
docker build -t economic-alerts .

# 2. Rodar container
docker run -d \
  -p 3000:3000 \
  -e TELEGRAM_BOT_TOKEN=seu_token \
  -e TELEGRAM_CHAT_ID=seu_chat_id \
  -v $(pwd)/Tabela.sqlite:/app/Tabela.sqlite \
  --name economic-alerts \
  economic-alerts
```

## 🔧 **CONFIGURAÇÕES IMPORTANTES**

### **Firewall/Portas**
```bash
# Liberar porta 3000
sudo ufw allow 3000
```

### **SSL/HTTPS (Nginx)**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Monitoramento**
```bash
# Verificar logs
pm2 logs economic-alerts

# Status da aplicação
pm2 status

# Reiniciar se necessário
pm2 restart economic-alerts
```

## 📊 **VERIFICAÇÃO PÓS-DEPLOY**

1. ✅ Aplicação rodando: `http://seu-servidor:3000`
2. ✅ Bot Telegram respondendo: `/start`
3. ✅ Dados importados: Verificar dashboard
4. ✅ Alertas funcionando: Aguardar próximo evento
5. ✅ Logs limpos: Sem erros críticos

## 🔄 **ATUALIZAÇÕES FUTURAS**

```bash
# 1. Atualizar Tabela.sqlite
scp Tabela.sqlite root@servidor:/app/
node import_real_data.js

# 2. Restart sistema
pm2 restart economic-alerts

# 3. Verificar funcionamento
pm2 logs economic-alerts
```

## 📞 **SUPORTE**

- Dashboard: `http://seu-servidor:3000`
- Logs: `pm2 logs economic-alerts`
- Status: `pm2 status`
- Bot Test: Telegram `/start`

---
**Sistema 100% funcional e testado!** 🎉