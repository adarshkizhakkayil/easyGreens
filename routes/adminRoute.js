
const express=require("express");
const adminRoute=express();
const path=require("path");
const bodyParser=require("body-parser");
const session=require("express-session");


const categoryController=require("../controllers/categoryController");
const productController=require("../controllers/productController");
const couponController = require('../controllers/couponController');
const offerController = require('../controllers/offerController');
const orderController=require("../controllers/orderController");
const adminController=require("../controllers/adminController");



const adminAuth = require('../middleware/adminAuth');
const upload = require('../middleware/multer');
const config=require("../config/config");

// Use body-parser middleware
adminRoute.use(bodyParser.json());
adminRoute.use(bodyParser.urlencoded({extended:true}))
// Use the session middleware
adminRoute.use(session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
}));
// Set view engine and views
adminRoute.set('view engine','ejs');
adminRoute.set('views',path.join(__dirname,"..","views","admin"));










adminRoute.get('/login',adminAuth.isLoggedOut,adminController.loadAdminLogin);
adminRoute.post('/login', adminController.verifyAdminLogin);
adminRoute.get('/logout',adminController.adminLogout);
adminRoute.get('/adminHome',adminAuth.isLoggedIn,adminController.loadDashboard);
adminRoute.get('/dashboard',adminAuth.isLoggedIn,adminController.loadDashboard);
adminRoute.get('/users',adminAuth.isLoggedIn,adminController.loadUsers);
adminRoute.post('/changeUserStatus', adminController.postChangeUserStatus);
adminRoute.post('/unblockUser', adminController.postUnblockUser);
//Category
adminRoute.get('/category',adminAuth.isLoggedIn,categoryController.loadCategory);
adminRoute.post('/add-category',adminAuth.isLoggedIn,categoryController.addCategories);
adminRoute.post('/list-category',adminAuth.isLoggedIn,categoryController.listCategory);
adminRoute.post('/unlist-category',adminAuth.isLoggedIn,categoryController.UnlistCategory);
adminRoute.get('/editCategory',adminAuth.isLoggedIn,categoryController.loadEditCategory);
adminRoute.post('/editCategory',adminAuth.isLoggedIn,categoryController.editCategory);
//Products
adminRoute.get('/products',adminAuth.isLoggedIn,productController.loadProducts);
adminRoute.get('/add-products',adminAuth.isLoggedIn,productController.LoadAddProducts);
adminRoute.post('/add-product',adminAuth.isLoggedIn,upload.array('images',3),productController.addProducts);
adminRoute.get('/edit-product/:id',adminAuth.isLoggedIn,productController.LoadEditProduct);
adminRoute.post('/edit-product',adminAuth.isLoggedIn,upload.array('images',3),productController.editProduct);
adminRoute.post('/edit-delete-product',adminAuth.isLoggedIn,productController.deleteImage);
adminRoute.post('/unlist-product',adminAuth.isLoggedIn,productController.unlistProduct);
adminRoute.post('/list-product',adminAuth.isLoggedIn,productController.listProduct);
adminRoute.get('/orders',adminAuth.isLoggedIn,orderController.loadOrders);
adminRoute.get('/manage-prodcuts',adminAuth.isLoggedIn,orderController.loadManageOrder);
adminRoute.post('/cancel-order',adminAuth.isLoggedIn,orderController.adminCancelOrder);
adminRoute.post('/change-status',adminAuth.isLoggedIn,orderController.changeStatus);
adminRoute.get('/coupon',adminAuth.isLoggedIn,couponController.LoadCouponPage);
adminRoute.post('/coupon',adminAuth.isLoggedIn,couponController.Update);
adminRoute.get('/add-coupon',adminAuth.isLoggedIn,couponController.LoadAddCouponPage);
adminRoute.post('/add-coupon',adminAuth.isLoggedIn,couponController.addcoupon);
adminRoute.get('/edit-coupon/:id',adminAuth.isLoggedIn,couponController.LoadEditCoupon);
adminRoute.post('/edit-coupon',adminAuth.isLoggedIn,couponController.editCoupon);
adminRoute.post('/dashboard',adminAuth.isLoggedIn,adminController.salesData);
adminRoute.get('/salesReport',adminAuth.isLoggedIn,adminController.LoadSalesReport);
adminRoute.post('/getSalesData',adminAuth.isLoggedIn,adminController.getSalesData);

adminRoute.get('/addOffer', adminAuth.isLoggedIn, offerController.loadAddOffer)
adminRoute.post('/addOffer', offerController.postAddOffer)
adminRoute.get('/offer', adminAuth.isLoggedIn, offerController.loadOffer)
adminRoute.post('/deleteOffer', offerController.postDeleteOffer)
adminRoute.patch('/applyProductOffer', offerController.patchApplyProductOffer)
adminRoute.patch('/removeProductOffer', offerController.patchRemoveProductOffer)
adminRoute.patch('/applyCategoryOffer', offerController.patchApplyCategoryOffer)
adminRoute.patch('/removeCategoryOffer', offerController.patchRemoveCategoryOffer)

module.exports=adminRoute