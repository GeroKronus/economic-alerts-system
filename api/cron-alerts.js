// API Route para ser chamada por webhook externo (UptimeRobot, cron-job.org)
import { checkAlerts } from '../src/scheduler-vercel.js';

export default async function handler(req, res) {
  // Verificar se é GET ou POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Headers CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  try {
    console.log('🔍 Webhook cron recebido - verificando alertas...');
    await checkAlerts();
    
    res.status(200).json({ 
      success: true, 
      message: 'Alerts checked successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no cron webhook:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}