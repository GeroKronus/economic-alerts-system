# 🚀 DEPLOY NO VERCEL - Economic Alerts

## 📋 **PASSO A PASSO COMPLETO**

### **1. Instalar Vercel CLI**
```bash
# Instalar globalmente
npm install -g vercel

# Ou via npx (sem instalar)
npx vercel --version
```

### **2. Fazer Login na Vercel**
```bash
vercel login
# Seguir instruções para autenticar
```

### **3. Preparar Deploy**
```bash
# Navegar para pasta do projeto
cd "D:\Claude Code\Calendar"

# Verificar arquivos criados:
# ✅ vercel.json
# ✅ .vercelignore  
# ✅ package.json (atualizado)
# ✅ Tabela.sqlite (dados econômicos)
```

### **4. Deploy Inicial**
```bash
# Primeiro deploy
vercel

# Responder perguntas:
# ? Set up and deploy? [Y/n] Y
# ? Which scope? [Seu usuário]
# ? Link to existing project? [N/y] N  
# ? What's your project's name? economic-alerts
# ? In which directory is your code located? ./
```

### **5. Configurar Variáveis de Ambiente**
```bash
# Via CLI
vercel env add TELEGRAM_BOT_TOKEN
# Colar seu token do bot

vercel env add TELEGRAM_CHAT_ID  
# Colar seu chat ID

# Ou via Dashboard: https://vercel.com/dashboard
# Projeto → Settings → Environment Variables
```

### **6. Deploy Subsequentes**
```bash
# Para atualizações futuras
vercel --prod

# Ou push automático via Git
git add .
git commit -m "Update"
git push origin main
```

## ⚠️ **IMPORTANTE - LIMITAÇÕES VERCEL**

### **Scheduler/Cron Jobs**
```bash
# ❌ Vercel não suporta cron nativo
# ✅ Soluções alternativas:

# Opção 1: Vercel Cron (Beta)
# Adicionar ao vercel.json:
{
  "crons": [
    {
      "path": "/api/cron-alerts",
      "schedule": "* * * * *"
    }
  ]
}

# Opção 2: Webhook externo (UptimeRobot, cron-job.org)
# Criar endpoint /api/check-alerts
# Chamar via webhook a cada minuto
```

### **Banco SQLite**
```bash
# ❌ Vercel não persiste arquivos entre deploys
# ✅ Soluções:

# Opção 1: Upload Tabela.sqlite no build
# Opção 2: Usar Vercel KV/PostgreSQL
# Opção 3: Usar serviço externo (PlanetScale)
```

## 🔧 **AJUSTES NECESSÁRIOS PARA VERCEL**

### **1. Criar API Route para Cron**
```javascript
// api/cron-alerts.js
import { checkAlerts } from '../src/scheduler.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    await checkAlerts();
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### **2. Webhook Externo**
```bash
# UptimeRobot ou cron-job.org
# URL: https://seu-projeto.vercel.app/api/cron-alerts
# Intervalo: A cada 1 minuto
```

## 🚀 **COMANDOS RESUMIDOS**

```bash
# 1. Instalar CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
cd "D:\Claude Code\Calendar"
vercel

# 4. Configurar env
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHAT_ID

# 5. Deploy produção
vercel --prod
```

## 📊 **VERIFICAÇÃO PÓS-DEPLOY**

1. ✅ URL funcionando: `https://seu-projeto.vercel.app`
2. ✅ Dashboard carregando: `/`
3. ✅ API funcionando: `/api/events`
4. ✅ Bot respondendo: Telegram `/start`
5. ✅ Webhook configurado: Cron externo

## 🔄 **ALTERNATIVA: VPS RECOMENDADO**

**Para sistema de alertas críticos**, recomendo VPS:
- DigitalOcean Droplet: $6/mês
- Controle total sobre cron jobs
- Persistência de dados garantida
- Uptime 99.9%

**Vercel é ótimo para**: Sites estáticos, APIs simples
**VPS é melhor para**: Sistemas críticos, cron jobs, persistência

---

**Quer continuar com Vercel ou preferir VPS?** 🤔