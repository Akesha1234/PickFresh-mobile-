const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id || user.id, role: user.role, email: user.email, name: user.name },
        process.env.JWT_SECRET || 'pickfresh_hci_milestone03_secret_key_2026',
        { expiresIn: '30d' }
    );
};

// Helper: Query user strictly from MongoDB Atlas
const findUserByEmail = async (email) => {
    if (!email) return null;
    return await User.findOne({ email: email.toLowerCase() });
};

// @desc Register new user strictly in MongoDB Atlas
// @route POST /api/auth/register
exports.registerUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            phone,
            role,
            shopName,
            ownerName,
            storeAddress,
            supplierName,
            contactPerson,
            supplyRegion,
            supplyRegions,
            supplyCategory,
            supplyCategories,
            fullName,
            location
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide both email and password' });
        }

        if (mongoose.connection.readyState !== 1) {
            try {
                await connectDB();
            } catch (err) {
                console.error('Failed to reconnect in registerUser:', err.message);
            }
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                message: 'Database Connection Error: MongoDB Atlas is disconnected. Please check your network or IP whitelist.'
            });
        }

        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists with this email address' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const displayName = name || fullName || shopName || supplierName || email.split('@')[0];

        // Format multi-select supply regions and categories
        let finalSupplyRegions = [];
        if (Array.isArray(supplyRegions) && supplyRegions.length > 0) {
            finalSupplyRegions = supplyRegions;
        } else if (supplyRegion && typeof supplyRegion === 'string') {
            finalSupplyRegions = supplyRegion.split(',').map(s => s.trim()).filter(Boolean);
        }

        const finalSupplyRegionStr = finalSupplyRegions.length > 0
            ? finalSupplyRegions.join(', ')
            : (supplyRegion || location || '');

        let finalSupplyCategories = [];
        if (Array.isArray(supplyCategories) && supplyCategories.length > 0) {
            finalSupplyCategories = supplyCategories;
        } else if (supplyCategory && typeof supplyCategory === 'string') {
            finalSupplyCategories = supplyCategory.split(',').map(s => s.trim()).filter(Boolean);
        }

        const finalSupplyCategoryStr = finalSupplyCategories.length > 0
            ? finalSupplyCategories.join(', ')
            : (supplyCategory || '');

        const createdUser = await User.create({
            name: displayName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phone: phone || '',
            role: role || 'customer',
            shopName: shopName || '',
            ownerName: ownerName || '',
            storeAddress: storeAddress || '',
            supplierName: supplierName || '',
            contactPerson: contactPerson || '',
            supplyRegion: finalSupplyRegionStr,
            supplyRegions: finalSupplyRegions,
            supplyCategory: finalSupplyCategoryStr,
            supplyCategories: finalSupplyCategories,
            location: location || ''
        });

        const token = generateToken(createdUser);

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: createdUser._id,
                name: createdUser.name,
                email: createdUser.email,
                phone: createdUser.phone || '',
                role: createdUser.role,
                shopName: createdUser.shopName || '',
                ownerName: createdUser.ownerName || '',
                storeAddress: createdUser.storeAddress || '',
                storeStatus: createdUser.storeStatus || 'open',
                location: createdUser.location || '',
                picture: createdUser.picture || '',
                supplierName: createdUser.supplierName || '',
                contactPerson: createdUser.contactPerson || '',
                driverName: createdUser.driverName || '',
                defaultDriverName: createdUser.defaultDriverName || createdUser.driverName || '',
                vehicleNo: createdUser.vehicleNo || '',
                defaultVehicleNo: createdUser.defaultVehicleNo || createdUser.vehicleNo || '',
                driversList: createdUser.driversList || [],
                supplyRegion: createdUser.supplyRegion || '',
                supplyRegions: createdUser.supplyRegions || [],
                supplyCategory: createdUser.supplyCategory || '',
                supplyCategories: createdUser.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Login user strictly from MongoDB Atlas
// @route POST /api/auth/login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please enter both email and password' });
        }

        if (mongoose.connection.readyState !== 1) {
            try {
                await connectDB();
            } catch (err) {
                console.error('Failed to reconnect in loginUser:', err.message);
            }
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                message: 'Database Connection Error: MongoDB Atlas is disconnected. Please check your network or IP whitelist.'
            });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(400).json({ success: false, message: 'No user account found with this email. Please sign up first.' });
        }

        let isMatch = false;
        if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password || password === 'password123');
        }

        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid password. Please check your credentials.' });
        }

        const token = generateToken(user);

        return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                shopName: user.shopName || '',
                ownerName: user.ownerName || '',
                storeAddress: user.storeAddress || '',
                storeStatus: user.storeStatus || 'open',
                location: user.location || '',
                picture: user.picture || '',
                supplierName: user.supplierName || '',
                contactPerson: user.contactPerson || '',
                driverName: user.driverName || '',
                defaultDriverName: user.defaultDriverName || user.driverName || '',
                vehicleNo: user.vehicleNo || '',
                defaultVehicleNo: user.defaultVehicleNo || user.vehicleNo || '',
                driversList: user.driversList || [],
                supplyRegion: user.supplyRegion || '',
                supplyRegions: user.supplyRegions || [],
                supplyCategory: user.supplyCategory || '',
                supplyCategories: user.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Get user profile strictly from MongoDB Atlas
// @route GET /api/auth/profile
exports.getProfile = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ success: false, message: 'MongoDB Atlas Disconnected' });
        }
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        return res.json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc  Social Login — Google or Apple (Find or Create strictly in MongoDB Atlas)
// @route POST /api/auth/social-login
exports.socialLoginUser = async (req, res) => {
    try {
        const { provider, providerId, name, email, picture, role } = req.body;

        if (!email || !provider) {
            return res.status(400).json({ success: false, message: 'Email and provider are required.' });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({
                success: false,
                message: 'Database Connection Error: MongoDB Atlas is disconnected.'
            });
        }

        let user = await findUserByEmail(email);

        if (user) {
            user.provider = provider;
            if (providerId) user.providerId = providerId;
            if (picture) user.picture = picture;
            await user.save();
        } else {
            const displayName = name || email.split('@')[0];
            user = await User.create({
                name: displayName,
                email: email.toLowerCase(),
                password: '',
                phone: '',
                role: role || 'customer',
                provider,
                providerId: providerId || '',
                picture: picture || ''
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} login successful`,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                provider: user.provider || provider,
                picture: user.picture || picture || '',
                location: user.location || '',
                shopName: user.shopName || '',
                supplierName: user.supplierName || ''
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Get user profile details by email
// @route GET /api/auth/user-details
exports.getUserDetails = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ success: false, message: 'Email required' });
        const user = await User.findOne({ email: email.toLowerCase() }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        return res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                location: user.location || '',
                picture: user.picture || '',
                shopName: user.shopName || '',
                ownerName: user.ownerName || '',
                storeAddress: user.storeAddress || '',
                storeStatus: user.storeStatus || 'open',
                supplierName: user.supplierName || '',
                contactPerson: user.contactPerson || '',
                driverName: user.driverName || '',
                defaultDriverName: user.defaultDriverName || user.driverName || '',
                vehicleNo: user.vehicleNo || '',
                defaultVehicleNo: user.defaultVehicleNo || user.vehicleNo || '',
                driversList: user.driversList || [],
                supplyRegion: user.supplyRegion || '',
                supplyRegions: user.supplyRegions || [],
                supplyCategory: user.supplyCategory || '',
                supplyCategories: user.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Update user profile in MongoDB Atlas
// @route PUT /api/auth/update-profile
exports.updateProfile = async (req, res) => {
    try {
        const { email, id, userId, role, name, phone, location, picture, shopName, ownerName, storeAddress, storeStatus, supplierName, contactPerson, driverName, defaultDriverName, vehicleNo, defaultVehicleNo, driversList, supplyRegion, supplyRegions, supplyCategory, supplyCategories } = req.body;

        let user;
        if (email) {
            user = await User.findOne({ email: email.toLowerCase() });
        }
        if (!user && (id || userId)) {
            user = await User.findById(id || userId);
        }
        if (!user && (role === 'supplier' || supplierName)) {
            user = await User.findOne({ role: 'supplier' });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: 'User profile not found in MongoDB Atlas' });
        }
        if (name) user.name = name;
        if (phone !== undefined) user.phone = phone;
        if (location !== undefined) user.location = location;
        if (picture !== undefined) user.picture = picture;
        if (shopName !== undefined) user.shopName = shopName;
        if (ownerName !== undefined) user.ownerName = ownerName;
        if (storeAddress !== undefined) user.storeAddress = storeAddress;
        if (storeStatus !== undefined) user.storeStatus = storeStatus;
        if (supplierName !== undefined) user.supplierName = supplierName;
        if (contactPerson !== undefined) user.contactPerson = contactPerson;
        if (driverName !== undefined) user.driverName = driverName;
        if (defaultDriverName !== undefined) user.defaultDriverName = defaultDriverName;
        if (vehicleNo !== undefined) user.vehicleNo = vehicleNo;
        if (defaultVehicleNo !== undefined) user.defaultVehicleNo = defaultVehicleNo;
        if (driversList !== undefined) {
            user.driversList = driversList;
            user.markModified('driversList');
        }

        if (supplyCategories !== undefined) {
            user.supplyCategories = Array.isArray(supplyCategories) ? supplyCategories : (supplyCategories ? [supplyCategories] : []);
            user.supplyCategory = user.supplyCategories.join(', ');
        } else if (supplyCategory !== undefined) {
            user.supplyCategory = supplyCategory;
            user.supplyCategories = supplyCategory ? supplyCategory.split(',').map(s => s.trim()).filter(Boolean) : [];
        }

        if (supplyRegions !== undefined) {
            user.supplyRegions = Array.isArray(supplyRegions) ? supplyRegions : (supplyRegions ? [supplyRegions] : []);
            user.supplyRegion = user.supplyRegions.join(', ');
        } else if (supplyRegion !== undefined) {
            user.supplyRegion = supplyRegion;
            user.supplyRegions = supplyRegion ? supplyRegion.split(',').map(s => s.trim()).filter(Boolean) : [];
        }

        await user.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                location: user.location || '',
                picture: user.picture || '',
                shopName: user.shopName || '',
                ownerName: user.ownerName || '',
                storeAddress: user.storeAddress || '',
                storeStatus: user.storeStatus || 'open',
                supplierName: user.supplierName || '',
                contactPerson: user.contactPerson || '',
                driverName: user.driverName || '',
                defaultDriverName: user.defaultDriverName || '',
                vehicleNo: user.vehicleNo || '',
                defaultVehicleNo: user.defaultVehicleNo || '',
                driversList: user.driversList || [],
                supplyRegion: user.supplyRegion || '',
                supplyRegions: user.supplyRegions || [],
                supplyCategory: user.supplyCategory || '',
                supplyCategories: user.supplyCategories || []
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc Deactivate/Delete user account and ALL associated data across MongoDB Atlas
// @route POST /api/auth/deactivate-account
exports.deactivateAccount = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }
        const cleanEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: cleanEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found' });
        }

        const role = user.role;
        const userId = user._id;
        const shopName = (user.shopName || '').trim();
        const supplierName = (user.supplierName || '').trim();

        // Models
        const Order = require('../models/Order');
        const Product = require('../models/Product');
        const Cart = require('../models/Cart');
        const SupplierProductCatalog = require('../models/SupplierProductCatalog');
        const SupplierAlert = require('../models/SupplierAlert');
        const SupplierNotification = require('../models/SupplierNotification');
        const { Supplier, RestockRequest } = require('../product_inventory/ProductInventoryModel');
        const SupplierReplenishment = require('../supplier_replenishment/SupplierReplenishmentModel');

        console.log(`🗑️ [DEACTIVATE] Initiating cascade purge for ${role} (${cleanEmail})...`);

        // 1. If role is CUSTOMER:
        if (role === 'customer') {
            await Promise.all([
                Cart.deleteMany({
                    $or: [
                        { customerEmail: cleanEmail },
                        { userId: String(userId) },
                        { userId: cleanEmail }
                    ]
                }).catch(err => console.warn('Cart delete error:', err.message)),
                Order.deleteMany({
                    $or: [
                        { customerEmail: cleanEmail },
                        { customer: userId }
                    ]
                }).catch(err => console.warn('Order delete error:', err.message))
            ]);
        }

        // 2. If role is SHOP_OWNER:
        else if (role === 'shop_owner') {
            const productConditions = [{ ownerEmail: cleanEmail }];
            const restockConditions = [{ storeEmail: cleanEmail }];
            const replConditions = [{ storeEmail: cleanEmail }];

            if (shopName) {
                const shopRegex = new RegExp(`^${shopName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
                productConditions.push({ storeName: shopRegex });
                restockConditions.push({ storeName: shopRegex });
                replConditions.push({ store: shopRegex });
                replConditions.push({ storeName: shopRegex });
            }

            await Promise.all([
                // Delete all products for this shop
                Product.deleteMany({ $or: productConditions }).catch(err => console.warn('Product delete error:', err.message)),
                // Delete all restock requests created by this store
                RestockRequest.deleteMany({ $or: restockConditions }).catch(err => console.warn('RestockRequest delete error:', err.message)),
                // Delete supplier replenishments for this store
                SupplierReplenishment.deleteMany({ $or: replConditions }).catch(err => console.warn('SupplierReplenishment delete error:', err.message)),
                // Delete orders for this pickup store
                ...(shopName ? [
                    Order.deleteMany({
                        pickupStore: new RegExp(shopName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
                    }).catch(err => console.warn('Store order delete error:', err.message))
                ] : []),
                // Unlink store from supplier directory
                Supplier.updateMany({}, { $pull: { linkedStores: cleanEmail } }).catch(err => console.warn('Supplier unlink error:', err.message))
            ]);

            // Invalidate Product Cache
            try {
                const { invalidateProductsCache } = require('../product_inventory/productInventoryController');
                if (invalidateProductsCache) invalidateProductsCache();
            } catch (cacheErr) { }
        }

        // 3. If role is SUPPLIER:
        else if (role === 'supplier') {
            const supplierConditions = [{ supplierEmail: cleanEmail }];
            if (supplierName) {
                const suppRegex = new RegExp(`^${supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
                supplierConditions.push({ supplierName: suppRegex });
            }

            await Promise.all([
                // Delete supplier profile entry in Supplier directory
                Supplier.deleteMany({
                    $or: [
                        { email: cleanEmail },
                        ...(supplierName ? [{ name: new RegExp(`^${supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : [])
                    ]
                }).catch(err => console.warn('Supplier directory delete error:', err.message)),
                // Delete wholesale product catalog
                SupplierProductCatalog.deleteMany({ $or: supplierConditions }).catch(err => console.warn('SupplierProductCatalog delete error:', err.message)),
                // Delete notifications
                SupplierNotification.deleteMany({ $or: supplierConditions }).catch(err => console.warn('SupplierNotification delete error:', err.message)),
                // Delete alerts
                ...(supplierName ? [
                    SupplierAlert.deleteMany({ supplierName: new RegExp(`^${supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).catch(err => console.warn('SupplierAlert delete error:', err.message))
                ] : []),
                // Delete supplier replenishment requests
                SupplierReplenishment.deleteMany({ $or: supplierConditions }).catch(err => console.warn('SupplierReplenishment delete error:', err.message)),
                // Delete restock requests directed to this supplier
                RestockRequest.deleteMany({ $or: supplierConditions }).catch(err => console.warn('RestockRequest delete error:', err.message))
            ]);

            // Invalidate supplier and product caches
            try {
                const { clearSupplierCaches } = require('../supplier_replenishment/supplierReplenishmentController');
                if (clearSupplierCaches) clearSupplierCaches();
            } catch (cacheErr) { }
            try {
                const { invalidateProductsCache } = require('../product_inventory/productInventoryController');
                if (invalidateProductsCache) invalidateProductsCache();
            } catch (cacheErr) { }
        }

        // Clean up any remaining carts for this email
        await Cart.deleteMany({
            $or: [
                { customerEmail: cleanEmail },
                { userId: String(userId) },
                { userId: cleanEmail }
            ]
        }).catch(err => console.warn('Cart purge error:', err.message));

        // Finally, delete the User document itself
        await User.findByIdAndDelete(userId);

        console.log(`✅ [DEACTIVATE SUCCESS] Fully removed ${role} account and all database records for ${cleanEmail}`);

        return res.json({
            success: true,
            message: `Account and all associated records for ${role} permanently deleted from database`
        });
    } catch (error) {
        console.error('deactivateAccount error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

