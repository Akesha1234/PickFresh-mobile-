const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

const app = express();

// Body Parser & CORS Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Ensure DB is connected on every incoming request (Serverless friendly)
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error('Database connection middleware failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Database Connection Error: Unable to connect to MongoDB Atlas. Ensure MongoDB IP whitelist allows 0.0.0.0/0.'
        });
    }
});

// Basic Healthcheck API Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        app: 'PickFresh Mobile Backend API',
        group: 'KND_HCI_G10',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/suppliers', require('./routes/supplierRoutes'));
app.use('/api/customer-shopping', require('./customer_shopping/customerShoppingRoutes'));
app.use('/api/product-inventory', require('./product_inventory/productInventoryRoutes'));
app.use('/api/order-pickup', require('./order_pickup/orderPickupRoutes'));
app.use('/api/supplier-replenishment', require('./supplier_replenishment/supplierReplenishmentRoutes'));

// Serve Frontend Production Build (Single unified server for mobile app & web)
const path = require('path');
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// Fallback all non-API web routes to frontend index.html
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// 404 Handler for APIs
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'API Endpoint not found' });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(`🚀 PickFresh Backend Server running on port ${PORT}`);
        console.log(`🌐 Base API URL: http://localhost:${PORT}/api`);
        console.log(`=======================================================`);
    });
}

module.exports = app;
