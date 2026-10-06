require('dotenv').config();
const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pyClient = require('./utils/pyClient');
const errorHandler = require('./middleware/errorHandler');

const yieldRoutes = require('./routes/yieldRoutes');
const diseaseRoutes = require('./routes/diseaseRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 5001;
const ML_SERVICE_DIR = path.resolve(__dirname, '..', 'ml-service');
const ML_SERVICE_URL = new URL(pyClient.defaults.baseURL);
const PYTHON_COMMAND = process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'python' : 'python3');
const ML_STARTUP_TIMEOUT_MS = Number(process.env.ML_SERVICE_STARTUP_TIMEOUT_MS) || 10 * 60 * 1000;
const MODEL_ARTIFACTS = ['yield_model.joblib', 'disease_model.joblib', 'disease_encoder.joblib'];

let mlProcess = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isLocalMLService = () =>
  ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(ML_SERVICE_URL.hostname);

const isMLServiceHealthy = async () => {
  try {
    const response = await pyClient.get('/api/health', { timeout: 1500 });
    return response.data?.status === 'healthy';
  } catch {
    return false;
  }
};

const runPython = (args, description, env = process.env) => new Promise((resolve, reject) => {
  const child = spawn(PYTHON_COMMAND, args, {
    cwd: ML_SERVICE_DIR,
    env,
    stdio: 'inherit'
  });
  let spawnError;

  child.once('error', (error) => {
    spawnError = error;
  });
  child.once('close', (code, signal) => {
    if (spawnError) {
      reject(new Error(`${description} could not start with "${PYTHON_COMMAND}": ${spawnError.message}`));
    } else if (code !== 0) {
      reject(new Error(`${description} exited with code ${code}${signal ? ` (signal ${signal})` : ''}.`));
    } else {
      resolve();
    }
  });
});

const ensureModelArtifacts = async () => {
  const modelDirectory = path.join(ML_SERVICE_DIR, 'trained_models');
  const missingArtifacts = MODEL_ARTIFACTS.filter(
    (artifact) => !fs.existsSync(path.join(modelDirectory, artifact))
  );

  if (missingArtifacts.length === 0) return;

  console.log(`[Startup] Missing ML artifacts: ${missingArtifacts.join(', ')}. Training models once...`);
  await runPython(
    [
      'train_models.py',
      '--dataset-dir',
      path.join(ML_SERVICE_DIR, 'dataset')
    ],
    'ML model training'
  );

  const stillMissing = MODEL_ARTIFACTS.filter(
    (artifact) => !fs.existsSync(path.join(modelDirectory, artifact))
  );
  if (stillMissing.length > 0) {
    throw new Error(`Training completed without creating: ${stillMissing.join(', ')}.`);
  }
};

const waitForMLService = async (child, getSpawnError) => {
  const deadline = Date.now() + ML_STARTUP_TIMEOUT_MS;
  let lastError = 'No health response received.';

  while (Date.now() < deadline) {
    try {
      const response = await pyClient.get('/api/health', { timeout: 2000 });
      if (response.data?.status === 'healthy') return;
      throw new Error(response.data?.error || `Health status: ${response.data?.status || 'unknown'}`);
    } catch (error) {
      if (error.response?.data?.status === 'unhealthy') {
        throw new Error(`Python ML service failed to load its models: ${error.response.data.error || 'unknown model error'}`);
      }
      lastError = error.message;
    }

    const spawnError = getSpawnError();
    if (spawnError) {
      throw new Error(`Python ML service could not start with "${PYTHON_COMMAND}": ${spawnError.message}`);
    }
    if (child.exitCode !== null) {
      throw new Error(`Python ML service exited before becoming healthy (code ${child.exitCode}).`);
    }
    await delay(1000);
  }

  throw new Error(`Timed out waiting for Python ML service at ${ML_SERVICE_URL.origin}/api/health. ${lastError}`);
};

const ensureMLService = async () => {
  if (await isMLServiceHealthy()) {
    console.log(`[Startup] Reusing healthy Python ML service at ${ML_SERVICE_URL.origin}.`);
    return;
  }

  if (!isLocalMLService()) {
    throw new Error(`Python ML service is unavailable at ${ML_SERVICE_URL.origin}; automatic startup is supported for local URLs only.`);
  }

  await ensureModelArtifacts();

  if (await isMLServiceHealthy()) {
    console.log(`[Startup] Reusing healthy Python ML service at ${ML_SERVICE_URL.origin}.`);
    return;
  }

  const servicePort = ML_SERVICE_URL.port || (ML_SERVICE_URL.protocol === 'https:' ? '443' : '80');
  const childEnv = { ...process.env, PORT: servicePort };
  let spawnError;

  console.log(`[Startup] Starting Python ML service with ${PYTHON_COMMAND}...`);
  mlProcess = spawn(PYTHON_COMMAND, ['app.py'], {
    cwd: ML_SERVICE_DIR,
    env: childEnv,
    stdio: 'inherit'
  });
  mlProcess.once('error', (error) => {
    spawnError = error;
  });

  try {
    await waitForMLService(mlProcess, () => spawnError);
    console.log(`[Startup] Python ML service is healthy at ${ML_SERVICE_URL.origin}.`);
  } catch (error) {
    if (mlProcess.exitCode === null) mlProcess.kill();
    mlProcess = null;
    throw error;
  }
};

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  console.log(`[Express Gateway] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint for the gateway and Python ML service
app.get('/api/health', async (req, res) => {
  let pyHealth = { status: 'unreachable', error: 'Python ML service offline' };
  try {
    const pyRes = await pyClient.get('/api/health', { timeout: 4000 });
    pyHealth = pyRes.data;
  } catch (err) {
    pyHealth.error = err.message;
  }

  const overallHealthy = pyHealth.status === 'healthy';

  return res.status(200).json({
    status: overallHealthy ? 'healthy' : 'degraded',
    gateway: {
      uptime_seconds: process.uptime(),
      node_version: process.version,
      port: PORT
    },
    ml_microservice: pyHealth
  });
});

// Mount Routes
app.use('/api/yield', yieldRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/chat', chatRoutes);

// Optional: Serve client build if available
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));
app.get("/{*splat}", (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(clientBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next();
    }
  });
});

// Error handling middleware
app.use(errorHandler);

const startServer = async () => {
  try {
    await ensureMLService();
    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(`🌾 Kishaan Deepak Express Gateway active on port ${PORT}`);
      console.log(`🔗 Python ML Service URL: ${ML_SERVICE_URL.origin}`);
      console.log(`=================================================`);
    });
  } catch (error) {
    console.error(`[Startup] Failed to start application: ${error.message}`);
    process.exitCode = 1;
  }
};

startServer();
